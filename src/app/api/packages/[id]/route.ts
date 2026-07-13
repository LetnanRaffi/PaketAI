import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
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
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await createClient();

    // Only allow updating certain fields (status, picked up info)
    const updateData: any = {};
    if (body.status) updateData.status = body.status;
    if (body.picked_up_at) updateData.picked_up_at = body.picked_up_at;
    if (body.picked_up_verification) updateData.picked_up_verification = body.picked_up_verification;

    const { data, error } = await supabase
      .from('packages')
      .update(updateData)
      .eq('id', id)
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
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
