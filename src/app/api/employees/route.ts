import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUserOrgId } from '@/lib/org';

export async function GET() {
  try {
    const orgId = await requireUserOrgId();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('org_id', orgId)
      .order('full_name', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Unauthorized or no organization') {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await requireUserOrgId();
    const body = await request.json();
    const supabase = await createClient();

    if (!body.full_name?.trim()) {
      return NextResponse.json(
        { error: 'Nama lengkap wajib diisi.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('employees')
      .insert([
        {
          full_name: body.full_name,
          department: body.department || null,
          phone_number: body.phone_number || null,
          org_id: orgId,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Unauthorized or no organization') {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
