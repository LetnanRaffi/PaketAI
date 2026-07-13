import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getKeyPool } from '@/lib/gemini';

const MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash'] as const;

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

Tugas:
1. Ekstrak nama penerima (raw), nomor resi, dan ekspedisi (courier) dari gambar resi.
2. Cocokkan nama penerima dengan daftar karyawan di atas.
3. Kembalikan data HANYA dalam format JSON. JANGAN BERIKAN TEKS LAIN SELAIN JSON.

Format JSON yang diharapkan:
{
  "recipient_name_raw": "string",
  "tracking_number": "string",
  "courier": "string",
  "matched_employee_name": "string (atau null jika tidak ada yang mirip)",
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
              break; // break model loop, retry with next key
            }
            // Non-rate-limit error on this model, try next model with same key
            console.warn(`[Scan] Model ${model} failed (key #${keyIndex}): ${err instanceof Error ? err.message : err}`);
            if (model === MODELS[MODELS.length - 1]) {
              // Last model failed too, try next key
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

    // 6. Resolve matched employee back to ID
    let matchedId = null;
    if (aiData.matched_employee_name && aiData.match_confidence >= 0.5) {
      const match = employees?.find(
        e => e.full_name.toLowerCase() === aiData.matched_employee_name?.toLowerCase()
      );
      if (match) {
        matchedId = match.id;
      } else {
        aiData.matched_employee_name = null;
        aiData.match_confidence = 0;
      }
    }

    // 7. Return combined data
    return NextResponse.json({
      receipt_image_url: publicUrl,
      recipient_name_raw: aiData.recipient_name_raw || '',
      tracking_number: aiData.tracking_number || '',
      courier: aiData.courier || '',
      matched_employee_name: aiData.matched_employee_name || null,
      matched_employee_id: matchedId,
      match_confidence: aiData.match_confidence || 0
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Scan API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
