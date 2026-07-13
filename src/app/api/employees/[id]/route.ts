import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await createClient();

    // Check for duplicate employee_id excluding current one
    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .eq('employee_id', body.employee_id)
      .neq('id', id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'NIK sudah digunakan oleh karyawan lain.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('employees')
      .update({
        full_name: body.full_name,
        employee_id: body.employee_id,
        department: body.department,
        phone_number: body.phone_number,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase.from('employees').delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
