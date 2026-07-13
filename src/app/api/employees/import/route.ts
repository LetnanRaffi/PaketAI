import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { csvText } = await request.json();
    if (!csvText) {
      return NextResponse.json(
        { error: 'Teks data CSV tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Fetch existing employee IDs for deduplication
    const { data: existingEmployees, error: fetchError } = await supabase
      .from('employees')
      .select('employee_id');

    if (fetchError) throw fetchError;
    
    const existingIds = new Set(
      existingEmployees?.map(e => e.employee_id.toLowerCase()) || []
    );

    const lines = csvText.split('\n');
    const newEmployees = [];
    const importIds = new Set();
    let lineIdx = 0;

    for (const line of lines) {
      lineIdx++;
      if (!line.trim()) continue;

      const parts = line.split(',').map((p: string) => p.trim());
      if (parts.length < 2) {
        return NextResponse.json(
          { error: `Format baris ${lineIdx} salah. Wajib berisi minimal: Nama Lengkap, NIK` },
          { status: 400 }
        );
      }

      const [full_name, employee_id, department = '', phone_number = ''] = parts;
      const lowerId = employee_id.toLowerCase();

      // Skip if it's already in DB or already in the import list
      if (existingIds.has(lowerId) || importIds.has(lowerId)) {
        continue;
      }

      importIds.add(lowerId);
      newEmployees.push({
        full_name,
        employee_id,
        department,
        phone_number,
      });
    }

    if (newEmployees.length === 0) {
      return NextResponse.json(
        { error: 'Semua baris diabaikan (mungkin NIK duplikat atau format tidak cocok).' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('employees')
      .insert(newEmployees)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
