import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPaymentLink } from '@/lib/temanqris';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('org_id, organizations(name)')
      .eq('id', user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 });
    }

    const orgName = Array.isArray(userData.organizations)
      ? (userData.organizations[0] as { name: string })?.name || 'PaketAI'
      : (userData.organizations as { name: string } | null)?.name || 'PaketAI';
    const orderId = `PAKETAI-TEST-${userData.org_id.slice(0, 8)}-${Date.now().toString(36)}`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const webhookUrl = `${appUrl}/api/billing/webhook`;
    const callbackUrl = `${appUrl}/billing?payment=success`;

    const result = await createPaymentLink({
      amount: 1,
      description: `[TEST] PaketAI - ${orgName}`,
      order_id: orderId,
      webhook_url: webhookUrl,
      callback_url: callbackUrl,
    });

    await supabase.from('subscriptions').insert({
      org_id: userData.org_id,
      status: 'pending',
      amount: 1,
      temanqris_order_id: orderId,
    });

    return NextResponse.json({
      payment_url: `https://temanqris.com${result.payment_link.url}`,
      order_id: orderId,
      amount: 1,
      expires_at: result.payment_link.expires_at,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
