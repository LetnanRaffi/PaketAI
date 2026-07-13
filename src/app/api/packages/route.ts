import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const supabase = await createClient();
    
    // We join the employees table to get the matched employee's full_name
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
      .order('received_at', { ascending: false });

    if (status && status !== 'semua') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Filter by search term locally since Supabase text search on joined columns can be complex
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

    return NextResponse.json(filteredData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createClient();

    // Get current user id
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
          admin_id: user.id
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
