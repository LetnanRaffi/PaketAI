import { createHmac, timingSafeEqual } from 'node:crypto';

const TEMANQRIS_BASE_URL = 'https://temanqris.com/api/qris';

function getApiKey(): string {
  const key = process.env.TEMANQRIS_API_KEY;
  if (!key) throw new Error('TEMANQRIS_API_KEY not configured');
  return key;
}

async function temanqris<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${TEMANQRIS_BASE_URL}${path}`, {
    ...options,
    headers: {
      'X-API-Key': getApiKey(),
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || 'TemanQRIS API error');
  }
  return data as T;
}

export interface TemanQRISPaymentLink {
  id: number;
  link_code: string;
  order_id: string;
  url: string;
  amount: number;
  description: string;
  merchant_name: string;
  webhook_url: string;
  expires_at: string;
}

export interface TemanQRISGenerateResponse {
  success: boolean;
  qris: string;
  qr_image: string;
  amount: number;
  fee: { type: string; value: number };
  expires_at: string;
  payment_link: TemanQRISPaymentLink;
}

export interface TemanQRISOrder {
  order_id: string;
  title: string;
  amount: number;
  total_amount: number;
  status: 'pending' | 'awaiting_confirmation' | 'paid' | 'expired' | 'cancelled';
  is_paid: boolean;
  is_expired: boolean;
  created_at: string;
  paid_at: string | null;
}

export interface TemanQRISMyQris {
  id: number;
  qris_string: string;
  merchant_name: string;
  merchant_city: string;
  created_at: string;
  updated_at: string;
}

export interface TemanQRISUsage {
  tier: string;
  daily_limit: number;
  usage: {
    today: {
      total: number;
      remaining: number;
      by_endpoint: Array<{ endpoint: string; request_count: number }>;
    };
    this_month: {
      total: number;
      by_endpoint: Array<{ endpoint: string; request_count: number }>;
    };
  };
}

export interface TemanQRISWebhookPayload {
  event: 'payment.awaiting_confirmation' | 'payment.confirmed';
  timestamp: string;
  data: {
    order_id: string;
    link_code: string;
    amount: number;
    description: string;
    status: string;
    paid_at: string | null;
    created_at: string;
  };
}

// === API Methods ===

export async function uploadQRIS(params: {
  qris_string?: string;
  qris_image_path?: string;
}): Promise<{ message: string; qris_string: string; merchant: { name: string; city: string } }> {
  if (params.qris_string) {
    return temanqris('/upload', {
      method: 'POST',
      body: JSON.stringify({ qris_string: params.qris_string }),
    });
  }
  throw new Error('qris_string is required for upload');
}

export async function getMyQRIS(): Promise<{
  success: boolean;
  has_qris: boolean;
  qris?: TemanQRISMyQris;
}> {
  return temanqris('/my-qris');
}

export async function createPaymentLink(params: {
  amount: number;
  description: string;
  order_id: string;
  webhook_url: string;
  callback_url: string;
}): Promise<{ success: boolean; payment_link: TemanQRISPaymentLink }> {
  return temanqris('/payment-link', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function generateDynamicQRIS(params: {
  amount: number;
  order_id?: string;
  webhook_url?: string;
  callback_url?: string;
  fee_type?: 'rupiah' | 'percent';
  fee_value?: number;
}): Promise<TemanQRISGenerateResponse> {
  return temanqris('/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getOrderStatus(orderId: string): Promise<{
  success: boolean;
  order: TemanQRISOrder;
}> {
  return temanqris(`/orders/${encodeURIComponent(orderId)}`);
}

export async function verifyOrder(
  orderId: string,
  params?: { payer_name?: string; payer_note?: string }
): Promise<{ success: boolean; message: string; order: TemanQRISOrder }> {
  return temanqris(`/orders/${encodeURIComponent(orderId)}/verify`, {
    method: 'POST',
    body: JSON.stringify(params || {}),
  });
}

export async function cancelOrder(orderId: string): Promise<{
  success: boolean;
  message: string;
  order: TemanQRISOrder;
}> {
  return temanqris(`/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'POST',
  });
}

export async function getUsage(): Promise<TemanQRISUsage> {
  return temanqris('/usage');
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected =
    'sha256=' +
    createHmac('sha256', secret).update(payload).digest('hex');
  const received = Buffer.from(signature || '');
  const expectedBuffer = Buffer.from(expected);
  return (
    received.length === expectedBuffer.length &&
    timingSafeEqual(received, expectedBuffer)
  );
}
