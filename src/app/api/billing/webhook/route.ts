import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

      // Use service role key for DB access (no auth cookies in webhook)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Find subscription by temanqris_order_id
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('org_id')
        .eq('temanqris_order_id', orderId)
        .single();

      if (sub?.org_id) {
        await activateSubscription(sub.org_id, orderId);
        console.log(`[Webhook] Subscription activated for org ${sub.org_id}, order ${orderId}`);
      } else {
        console.warn(`[Webhook] No subscription found for order ${orderId}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[Webhook] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
