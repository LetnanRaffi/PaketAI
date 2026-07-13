import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getKeyPool } from '@/lib/gemini';

const MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash'] as const;

const HONORIFICS = /^(mba|mrs?|bp|bapak|ibu|pak|sdr|sdra|saudara|saudari|dr|prof|ir|mh)\.?\s+/i;

function stripHonorific(name: string): string {
  return name.replace(HONORIFICS, '').trim();
}

function firstName(name: string): string {
  return stripHonorific(name).split(/\s+/)[0]?.toLowerCase() || '';
}

function similarity(a: string, b: string): number {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la === lb) return 1;
  if (la.includes(lb) || lb.includes(la)) return 0.85;
  // Simple Levenshtein ratio for short strings
  const maxLen = Math.max(la.length, lb.length);
  if (maxLen === 0) return 1;
  let matches = 0;
  for (const ch of la) {
    if (lb.includes(ch)) matches++;
  }
  return matches / maxLen * 0.6;
}

function matchEmployee(
  ocrName: string,
  aiMatchedName: string | null,
  employees: { id: string; full_name: string }[]
): { id: string; name: string; confidence: number } | null {
  if (!ocrName) return null;
  const ocrFirst = firstName(ocrName);

  // 1. If AI suggested a name, try exact match first
  if (aiMatchedName) {
    const exact = employees.find(
      e => e.full_name.toLowerCase() === aiMatchedName.toLowerCase()
    );
    if (exact) return { id: exact.id, name: exact.full_name, confidence: 1.0 };

    // Try first-name match against AI suggestion
    const aiFirst = firstName(aiMatchedName);
    const byAiFirst = employees.find(e => firstName(e.full_name) === aiFirst);
    if (byAiFirst) return { id: byAiFirst.id, name: byAiFirst.full_name, confidence: 0.85 };
  }

  // 2. Fuzzy: find best first-name match among all employees
  let best: { id: string; name: string; confidence: number } | null = null;
  for (const emp of employees) {
    const empFirst = firstName(emp.full_name);
    const score = similarity(ocrFirst, empFirst);
    if (score >= 0.6 && (!best || score > best.confidence)) {
      best = { id: emp.id, name: emp.full_name, confidence: score };
    }
  }

  return best;
}

function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota') || msg.includes('UNAVAILABLE');
}

export async function POST(request: Request) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const pool = getKeyPool();

    // 1. Prepare image data
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    let mimeType = 'image/jpeg';
    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }
    const ext = mimeType.split('/')[1] || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    // 2. Fetch employee names from DB for matching
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name');

    if (empError) throw empError;

    const employeeNames = employees?.map(e => e.full_name) || [];

    // 3. Prepare Prompt for Gemini
    const systemInstruction = `Kamu adalah asisten mailroom cerdas. Tugasmu mengekstrak data dari resi paket dan mencocokkannya dengan database karyawan.

Daftar Karyawan:
${employeeNames.join('\n')}

ATURAN PENTING PENCOCOKAN NAMA:
- Nama di resi sering menggunakan sebutan/panggilan seperti "Mba", "Mas", "Bp", "Pak", "Ibu", "Sdr", "Sdri", dll.
- CONTOH: Jika resi tertulis "Mba Diva" dan di daftar ada "Diva Amanda", maka matched_employee_name = "Diva Amanda".
- CONTOH: Jika resi tertulis "Bp Budi" dan di daftar ada "Budi Santoso", maka matched_employee_name = "Budi Santoso".
- Selalu HAPUS sebutan/panggilan tersebut lalu cocokkan berdasarkan NAMA PERTAMA.
- Jika ada beberapa karyawan dengan nama pertama yang sama, pilih yang paling cocok dari konteks di resi.

Tugas:
1. Ekstrak nama penerima (raw), nomor resi, dan ekspedisi (courier) dari gambar resi.
2. Cocokkan nama penerima dengan daftar karyawan di atas menggunakan aturan di atas.
3. Kembalikan data HANYA dalam format JSON. JANGAN BERIKAN TEKS LAIN SELAIN JSON.

Format JSON yang diharapkan:
{
  "recipient_name_raw": "string",
  "tracking_number": "string",
  "courier": "string",
  "matched_employee_name": "string nama lengkap dari daftar (atau null jika tidak ada yang mirip)",
  "match_confidence": 0.0 (0 sampai 1.0)
}`;

    // 4. Call Gemini API with key rotation + model fallback
    const callGeminiWithKeyRotation = async (): Promise<string> => {
      const maxAttempts = pool.getStatus().total + 1;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const { client, keyIndex } = pool.getWorkingClient();

        for (const model of MODELS) {
          try {
            const result = await client.models.generateContent({
              model,
              contents: [
                systemInstruction,
                {
                  inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                  }
                }
              ],
              config: {
                responseMimeType: 'application/json',
              }
            });

            const text = result.text;
            if (!text) throw new Error('No response from Gemini API');
            return text;
          } catch (err: unknown) {
            if (isRateLimitError(err)) {
              console.warn(`[Scan] Key #${keyIndex} rate-limited on ${model}, rotating...`);
              pool.markRateLimited(keyIndex);
              break;
            }
            console.warn(`[Scan] Model ${model} failed (key #${keyIndex}): ${err instanceof Error ? err.message : err}`);
            if (model === MODELS[MODELS.length - 1]) {
              pool.markRateLimited(keyIndex);
            }
          }
        }
      }

      throw new Error('Semua API key Gemini sudah habis / rate-limited. Coba lagi nanti.');
    };

    // Run Gemini + Upload in parallel
    const [responseText, publicUrl] = await Promise.all([
      callGeminiWithKeyRotation(),
      (async () => {
        const { error } = await supabase
          .storage
          .from('receipts')
          .upload(fileName, buffer, { contentType: mimeType, upsert: false });
        if (error) throw new Error(`Failed to upload image: ${error.message}`);
        const { data: { publicUrl } } = supabase
          .storage
          .from('receipts')
          .getPublicUrl(fileName);
        return publicUrl;
      })()
    ]);

    // 5. Parse Gemini response
    let aiData;
    try {
      aiData = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        aiData = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Failed to parse Gemini JSON response');
      }
    }

    // 6. Fuzzy employee matching
    const matched = matchEmployee(
      aiData.recipient_name_raw || '',
      aiData.matched_employee_name,
      employees || []
    );

    // 7. Return combined data
    return NextResponse.json({
      receipt_image_url: publicUrl,
      recipient_name_raw: aiData.recipient_name_raw || '',
      tracking_number: aiData.tracking_number || '',
      courier: aiData.courier || '',
      matched_employee_name: matched?.name || null,
      matched_employee_id: matched?.id || null,
      match_confidence: matched?.confidence || 0
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Scan API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
