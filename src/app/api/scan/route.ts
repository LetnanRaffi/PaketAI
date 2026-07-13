import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUserOrgId } from '@/lib/org';
import { getKeyPool, isRateLimitError, buildPrompt, matchEmployee } from '@/lib/gemini';

const MODELS = ['gemini-2.5-flash', 'gemini-3-flash-preview'] as const;

export async function POST(request: Request) {
  try {
    const orgId = await requireUserOrgId();
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const pool = getKeyPool();

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    let mimeType = 'image/jpeg';
    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }
    const ext = mimeType.split('/')[1] || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    // Fetch employee names scoped to org
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name')
      .eq('org_id', orgId);

    if (empError) throw empError;

    const employeeNames = employees?.map(e => e.full_name) || [];

    const systemInstruction = buildPrompt(employeeNames);

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
                temperature: 0,
                thinkingConfig: { thinkingBudget: 0 },
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

    const matched = matchEmployee(
      aiData.recipient_name_raw || '',
      aiData.matched_employee_name,
      employees || []
    );

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
    if (err.message === 'Unauthorized or no organization') {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error('Scan API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
