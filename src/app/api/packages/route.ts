import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUserOrgId } from '@/lib/org';

export async function GET(request: Request) {
  try {
    const orgId = await requireUserOrgId();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const department = searchParams.get('department');

    const supabase = await createClient();
    
    let query = supabase
      .from('packages')
      .select(`
        *,
        employee:employees (
          id,
          full_name,
          employee_id,
          department,
          phone_number,
          created_at
        )
      `)
      .eq('org_id', orgId)
      .order('received_at', { ascending: false });

    if (status && status !== 'semua') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    let filteredData = data;
    if (search) {
      const s = search.toLowerCase();
      filteredData = data.filter((pkg: any) => {
        const empName = pkg.employee?.full_name?.toLowerCase() || '';
        return (
          pkg.recipient_name_raw.toLowerCase().includes(s) ||
          pkg.tracking_number.toLowerCase().includes(s) ||
          pkg.courier.toLowerCase().includes(s) ||
          empName.includes(s)
        );
      });
    }

    if (department) {
      filteredData = filteredData.filter((pkg: any) =>
        pkg.employee?.department === department
      );
    }

    return NextResponse.json(filteredData);
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('packages')
      .insert([
        {
          receipt_image_url: body.receipt_image_url,
          recipient_name_raw: body.recipient_name_raw,
          employee_id: body.employee_id || null,
          match_confidence: body.match_confidence || 0,
          tracking_number: body.tracking_number,
          courier: body.courier,
          status: 'belum_diambil',
          admin_id: user.id,
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
