import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgSubscription, getDaysRemaining } from '@/lib/billing';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 });
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', userData.org_id)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const subscription = await getOrgSubscription(org.id);

    // Check if trial has ended
    if (org.plan === 'trial' && new Date(org.trial_ends_at) <= new Date()) {
      await supabase
        .from('organizations')
        .update({ plan: 'expired' })
        .eq('id', org.id);
      org.plan = 'expired';
    }

    // Check if active subscription has ended
    if (org.plan === 'active' && subscription?.current_period_end) {
      if (new Date(subscription.current_period_end) <= new Date()) {
        await supabase
          .from('organizations')
          .update({ plan: 'expired' })
          .eq('id', org.id);
        await supabase
          .from('subscriptions')
          .update({ status: 'expired' })
          .eq('id', subscription.id);
        org.plan = 'expired';
      }
    }

    return NextResponse.json({
      org: {
        name: org.name,
        plan: org.plan,
        trial_ends_at: org.trial_ends_at,
      },
      subscription: subscription ? {
        status: subscription.status,
        current_period_end: subscription.current_period_end,
      } : null,
      days_remaining: getDaysRemaining(org),
      temanqris_url: null,
      temanqris_expires_at: null,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
