import { createClient } from '@/lib/supabase/server';

export async function getUserOrgId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single();

  return data?.org_id || null;
}

export async function requireUserOrgId(): Promise<string> {
  const orgId = await getUserOrgId();
  if (!orgId) throw new Error('Unauthorized or no organization');
  return orgId;
}
