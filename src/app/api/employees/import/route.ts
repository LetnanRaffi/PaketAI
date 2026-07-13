import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUserOrgId } from '@/lib/org';

export async function POST(request: Request) {
  try {
    const orgId = await requireUserOrgId();
    const { csvText } = await request.json();
    if (!csvText) {
      return NextResponse.json(
        { error: 'Teks data CSV tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch existing employee names for deduplication (scoped to org)
    const { data: existingEmployees, error: fetchError } = await supabase
      .from('employees')
      .select('full_name')
      .eq('org_id', orgId);

    if (fetchError) throw fetchError;

    const existingNames = new Set(
      existingEmployees?.map(e => e.full_name.toLowerCase().trim()) || []
    );

    const lines = csvText.split('\n');
    const newEmployees = [];
    const importNames = new Set();
    let lineIdx = 0;

    for (const line of lines) {
      lineIdx++;
      if (!line.trim()) continue;

      const parts = line.split(',').map((p: string) => p.trim());
      if (parts.length < 1 || !parts[0]) {
        return NextResponse.json(
          { error: `Baris ${lineIdx}: format salah. Minimal berisi nama.` },
          { status: 400 }
        );
      }

      const [full_name, department = '', phone_number = ''] = parts;
      const lowerName = full_name.toLowerCase().trim();

      if (existingNames.has(lowerName) || importNames.has(lowerName)) {
        continue;
      }

      importNames.add(lowerName);
      newEmployees.push({
        full_name: full_name.trim(),
        department: department.trim() || null,
        phone_number: phone_number.trim() || null,
        org_id: orgId,
      });
    }

    if (newEmployees.length === 0) {
      return NextResponse.json(
        { error: 'Semua baris diabaikan (nama duplikat atau format tidak cocok).' },
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
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Unauthorized or no organization') {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
