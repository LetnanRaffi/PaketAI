import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getOrgSubscription, getDaysRemaining } from '@/lib/billing';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !supabaseUrl) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const admin = createAdminClient(supabaseUrl, serviceKey);

    const { data: userData } = await admin
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json({
        org: null, subscription: null, days_remaining: 0,
        temanqris_url: null, temanqris_expires_at: null,
      });
    }

    const { data: org } = await admin
      .from('organizations')
      .select('*')
      .eq('id', userData.org_id)
      .single();

    if (!org) {
      return NextResponse.json({
        org: null, subscription: null, days_remaining: 0,
        temanqris_url: null, temanqris_expires_at: null,
      });
    }

    const { data: sub } = await admin
      .from('subscriptions')
      .select('*')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Auto-expire trial
    if (org.plan === 'trial' && new Date(org.trial_ends_at) <= new Date()) {
      await admin.from('organizations').update({ plan: 'expired' }).eq('id', org.id);
      org.plan = 'expired';
    }

    // Auto-expire active subscription
    if (org.plan === 'active' && sub?.current_period_end && new Date(sub.current_period_end) <= new Date()) {
      await admin.from('organizations').update({ plan: 'expired' }).eq('id', org.id);
      await admin.from('subscriptions').update({ status: 'expired' }).eq('id', sub.id);
      org.plan = 'expired';
    }

    return NextResponse.json({
      org: {
        name: org.name,
        plan: org.plan,
        trial_ends_at: org.trial_ends_at,
      },
      subscription: sub ? {
        status: sub.status,
        current_period_end: sub.current_period_end,
      } : null,
      days_remaining: getDaysRemaining(org),
      temanqris_url: null,
      temanqris_expires_at: null,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Billing] check-status error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
