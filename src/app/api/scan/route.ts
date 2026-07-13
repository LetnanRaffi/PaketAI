import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
  try {
    const { imageBase64 } = await request.json();
    
    if (!imageBase64) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Upload image to Supabase Storage
    // Extract base64 data (remove data:image/jpeg;base64, prefix)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Determine mime type from prefix or default to jpeg
    let mimeType = 'image/jpeg';
    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }
    const ext = mimeType.split('/')[1] || 'jpg';
    
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    
    const { error: uploadError } = await supabase
      .storage
      .from('receipts')
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('receipts')
      .getPublicUrl(fileName);

    // 2. Fetch employee names from DB for matching
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, full_name');
      
    if (empError) throw empError;
    
    // We only send names to save tokens
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

    // 4. Call Gemini API
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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

    const responseText = response.text;
    if (!responseText) {
      throw new Error('No response from Gemini API');
    }

    // 5. Parse Gemini response
    let aiData;
    try {
      aiData = JSON.parse(responseText);
    } catch (e) {
      // Sometimes models wrap json in markdown blocks despite instructions
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
        // If the AI made up a name not exactly in the list
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

  } catch (error: any) {
    console.error('Scan API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
