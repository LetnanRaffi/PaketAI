import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUserOrgId } from '@/lib/org';
import { getKeyPool, isRateLimitError, buildBatchPrompt, matchEmployee } from '@/lib/gemini';

const MODELS = ['gemini-2.5-flash', 'gemini-3-flash-preview'] as const;

export async function POST(request: Request) {
  try {
    const orgId = await requireUserOrgId();
    const { images } = await request.json() as { images: string[] };

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'At least one image is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const pool = getKeyPool();

    const parsed = images.map((img) => {
      const base64Data = img.replace(/^data:image\/\w+;base64,/, '');
      let mimeType = 'image/jpeg';
      const mimeMatch = img.match(/^data:(image\/\w+);base64,/);
      if (mimeMatch) mimeType = mimeMatch[1];
      return { base64Data, mimeType };
    });

    const uploadPromises = parsed.map(({ base64Data, mimeType }, i) => {
      const ext = mimeType.split('/')[1] || 'jpg';
      const fileName = `${Date.now()}_${i}_${Math.random().toString(36).substring(7)}.${ext}`;
      const buffer = Buffer.from(base64Data, 'base64');

      return supabase.storage
        .from('receipts')
        .upload(fileName, buffer, { contentType: mimeType, upsert: false })
        .then(({ error }) => {
          if (error) throw new Error(`Failed to upload image ${i + 1}: ${error.message}`);
          return supabase.storage.from('receipts').getPublicUrl(fileName).data.publicUrl;
        });
    });

    // Fetch employees scoped to org
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name, department')
      .eq('org_id', orgId);

    if (empError) throw empError;
    const employeeNames = employees?.map(e => `${e.full_name} [${e.department || 'Umum'}]`) || [];

    const systemInstruction = buildBatchPrompt(employeeNames, images.length);

    const callGemini = async (): Promise<string> => {
      const maxAttempts = pool.getStatus().total + 1;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const { client, keyIndex } = pool.getWorkingClient();

        for (const model of MODELS) {
          try {
            const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
              { text: systemInstruction },
            ];

            for (const { base64Data, mimeType } of parsed) {
              parts.push({
                inlineData: { data: base64Data, mimeType }
              });
            }

            const result = await client.models.generateContent({
              model,
              contents: [{ role: 'user', parts }],
              config: {
                responseMimeType: 'application/json',
                temperature: 0,
                thinkingConfig: { thinkingBudget: 0 },
              }
            });

            const text = result.text;
            if (!text) throw new Error('No response from Gemini API');
            return text;
          } catch (err: unknown) {
            if (isRateLimitError(err)) {
              console.warn(`[ScanBatch] Key #${keyIndex} rate-limited on ${model}, rotating...`);
              pool.markRateLimited(keyIndex);
              break;
            }
            console.warn(`[ScanBatch] Model ${model} failed (key #${keyIndex}): ${err instanceof Error ? err.message : err}`);
            if (model === MODELS[MODELS.length - 1]) {
              pool.markRateLimited(keyIndex);
            }
          }
        }
      }

      throw new Error('Semua API key Gemini sudah habis / rate-limited. Coba lagi nanti.');
    };

    const [responseText, publicUrls] = await Promise.all([
      callGemini(),
      Promise.all(uploadPromises),
    ]);

    let aiResults: Array<{
      recipient_name_raw?: string;
      tracking_number?: string;
      courier?: string;
      matched_employee_name?: string | null;
      match_confidence?: number;
    }>;

    try {
      aiResults = JSON.parse(responseText);
      if (!Array.isArray(aiResults)) {
        aiResults = [aiResults];
      }
    } catch {
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        aiResults = JSON.parse(jsonMatch[1]);
        if (!Array.isArray(aiResults)) aiResults = [aiResults];
      } else {
        throw new Error('Failed to parse Gemini batch JSON response');
      }
    }

    const results = aiResults.map((aiData, i) => {
      const matched = matchEmployee(
        aiData.recipient_name_raw || '',
        aiData.matched_employee_name || null,
        employees || []
      );

      return {
        receipt_image_url: publicUrls[i] || '',
        recipient_name_raw: aiData.recipient_name_raw || '',
        tracking_number: aiData.tracking_number || '',
        courier: aiData.courier || '',
        matched_employee_name: matched?.name || null,
        matched_employee_id: matched?.id || null,
        match_confidence: matched?.confidence || 0,
      };
    });

    return NextResponse.json({ results });

  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Unauthorized or no organization') {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('ScanBatch API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
