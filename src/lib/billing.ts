import { createClient } from '@/lib/supabase/server';
import type { Organization, Subscription } from '@/lib/types';

export const SUBSCRIPTION_AMOUNT = 159000;
export const TRIAL_DAYS = 7;
export const SUBSCRIPTION_DAYS = 30;

export async function getUserOrg(): Promise<{
  org: Organization | null;
  user_id: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (!userData?.org_id) return { org: null, user_id: user.id };

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', userData.org_id)
    .single();

  return { org, user_id: user.id };
}

export async function getOrgSubscription(
  orgId: string
): Promise<Subscription | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data;
}

export function isOrgActive(org: Organization | null): boolean {
  if (!org) return false;
  if (org.plan === 'active') {
    return true;
  }
  if (org.plan === 'trial') {
    return new Date(org.trial_ends_at) > new Date();
  }
  return false;
}

export function isTrialEnded(org: Organization): boolean {
  if (org.plan !== 'trial') return false;
  return new Date(org.trial_ends_at) <= new Date();
}

export function getDaysRemaining(org: Organization): number {
  if (org.plan === 'trial') {
    const diff = new Date(org.trial_ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
  return 0;
}

export async function createOrgAndLinkUser(params: {
  orgName: string;
  userId: string;
  fullName: string;
}): Promise<Organization> {
  const supabase = await createClient();

  // Generate slug from name
  const slug = params.orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  // Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: params.orgName,
      slug,
      plan: 'trial',
      trial_ends_at: new Date(
        Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000
      ).toISOString(),
    })
    .select()
    .single();

  if (orgError) throw orgError;

  // Link user to org
  const { error: userError } = await supabase.from('users').upsert({
    id: params.userId,
    org_id: org.id,
    role: 'admin',
    full_name: params.fullName,
  });

  if (userError) throw userError;

  // Create initial subscription record
  await supabase.from('subscriptions').insert({
    org_id: org.id,
    status: 'pending',
    amount: SUBSCRIPTION_AMOUNT,
  });

  return org;
}

export async function activateSubscription(
  orgId: string,
  orderId: string
): Promise<void> {
  const supabase = await createClient();
  const now = new Date();
  const periodEnd = new Date(now.getTime() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);

  // Update org
  await supabase
    .from('organizations')
    .update({ plan: 'active' })
    .eq('id', orgId);

  // Update or create subscription
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        temanqris_order_id: orderId,
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('subscriptions').insert({
      org_id: orgId,
      status: 'active',
      amount: SUBSCRIPTION_AMOUNT,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      temanqris_order_id: orderId,
    });
  }
}

export async function expireSubscription(orgId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('organizations')
    .update({ plan: 'expired' })
    .eq('id', orgId);

  await supabase
    .from('subscriptions')
    .update({ status: 'expired' })
    .eq('org_id', orgId)
    .eq('status', 'active');
}

// Allowed paths when subscription is expired
export const ALLOWED_PATHS_WHEN_EXPIRED = [
  '/login',
  '/register',
  '/billing',
  '/api/auth',
  '/api/billing',
];

export function isPathAllowedWhenExpired(pathname: string): boolean {
  return ALLOWED_PATHS_WHEN_EXPIRED.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}
