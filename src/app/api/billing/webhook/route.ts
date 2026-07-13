import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/lib/temanqris';
import { activateSubscription } from '@/lib/billing';
import type { TemanQRISWebhookPayload } from '@/lib/temanqris';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-temanqris-signature');
    const webhookSecret = process.env.TEMANQRIS_WEBHOOK_SECRET;

    // Verify signature if secret is configured
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload: TemanQRISWebhookPayload = JSON.parse(rawBody);

    if (payload.event === 'payment.confirmed') {
      const orderId = payload.data.order_id;

      // Find subscription by temanqris_order_id
      const supabase = await createClient();
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('org_id')
        .eq('temanqris_order_id', orderId)
        .single();

      if (sub?.org_id) {
        await activateSubscription(sub.org_id, orderId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Webhook] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
