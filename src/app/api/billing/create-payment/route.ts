import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { SUBSCRIPTION_AMOUNT } from '@/lib/billing';
import { createPaymentLink } from '@/lib/temanqris';

export async function POST() {
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
      .select('org_id, organizations(name)')
      .eq('id', user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 });
    }

    const orgName = Array.isArray(userData.organizations)
      ? (userData.organizations[0] as { name: string })?.name || 'PaketAI'
      : (userData.organizations as { name: string } | null)?.name || 'PaketAI';
    const orderId = `PAKETAI-${userData.org_id.slice(0, 8)}-${Date.now().toString(36)}`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const webhookUrl = `${appUrl}/api/billing/webhook`;
    const callbackUrl = `${appUrl}/billing?payment=success`;

    const result = await createPaymentLink({
      amount: SUBSCRIPTION_AMOUNT,
      description: `Langganan PaketAI - ${orgName}`,
      order_id: orderId,
      webhook_url: webhookUrl,
      callback_url: callbackUrl,
    });

    await admin.from('subscriptions').insert({
      org_id: userData.org_id,
      status: 'pending',
      amount: SUBSCRIPTION_AMOUNT,
      temanqris_order_id: orderId,
    });

    return NextResponse.json({
      payment_url: `https://temanqris.com${result.payment_link.url}`,
      order_id: orderId,
      expires_at: result.payment_link.expires_at,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
