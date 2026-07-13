import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createClient();

    // Check for duplicate employee_id
    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .eq('employee_id', body.employee_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'NIK sudah terdaftar di database.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('employees')
      .insert([
        {
          full_name: body.full_name,
          employee_id: body.employee_id,
          department: body.department,
          phone_number: body.phone_number,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
