'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, Clock, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { BillingSkeleton } from '@/app/components/Skeleton';

interface BillingInfo {
  org: {
    name: string;
    plan: string;
    trial_ends_at: string;
  } | null;
  subscription: {
    status: string;
    current_period_end: string | null;
  } | null;
  days_remaining: number;
  temanqris_url: string | null;
  temanqris_expires_at: string | null;
  error?: string;
}

export default function Billing() {
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/billing/check-status')
      .then((r) => r.json())
      .then((data) => {
        setInfo(data);
        setLoading(false);
      })
      .catch(() => {
        setInfo({ org: null, subscription: null, days_remaining: 0, temanqris_url: null, temanqris_expires_at: null, error: 'Gagal menghubungi server.' });
        setLoading(false);
      });
  }, []);

  const handlePay = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/billing/create-payment', { method: 'POST' });
      const data = await res.json();
      if (data.payment_url) {
        window.open(data.payment_url, '_blank');
      }
      setInfo((prev) => prev ? { ...prev, temanqris_url: data.payment_url, temanqris_expires_at: data.expires_at } : prev);
    } catch {
      alert('Gagal membuat pembayaran. Coba lagi.');
    }
    setCreating(false);
  };

  if (loading) {
    return (
      <div className="flex flex-1 min-h-[50vh]">
        <BillingSkeleton />
      </div>
    );
  }

  if (!info || info.error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-[50vh] space-y-4">
        <AlertCircle className="h-10 w-10 text-on-surface-muted/50" />
        <p className="text-sm text-on-surface-muted">{info?.error || 'Gagal memuat data billing.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs font-semibold text-primary hover:text-primary/80"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  const plan = info.org?.plan || 'trial';
  const isTrial = plan === 'trial';
  const isActive = plan === 'active';
  const isExpired = plan === 'expired' || plan === 'cancelled';

  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h1 className="text-xl font-bold text-on-surface font-display">Langganan</h1>
        <p className="text-xs text-on-surface-muted mt-1">Kelola langganan PaketAI Anda</p>
      </div>

      {/* Status Card */}
      <div className={`rounded-2xl p-5 border ${
        isActive ? 'bg-success/10 border-success/20' :
        isTrial ? 'bg-primary/10 border-primary/20' :
        'bg-error-container/10 border-error/20'
      }`}>
        <div className="flex items-start gap-3">
          {isActive ? (
            <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
          ) : isTrial ? (
            <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-error shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className={`text-sm font-semibold ${
              isActive ? 'text-success' : isTrial ? 'text-primary' : 'text-error'
            }`}>
              {isActive && 'Langganan Aktif'}
              {isTrial && `Trial - ${info.days_remaining} hari tersisa`}
              {isExpired && 'Langganan Berakhir'}
            </p>
            <p className={`text-xs mt-1 ${
              isActive ? 'text-on-surface-variant' : isTrial ? 'text-on-surface-variant' : 'text-on-surface-muted'
            }`}>
              {isActive && info.subscription?.current_period_end &&
                `Berlaku hingga ${new Date(info.subscription.current_period_end).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
              }
              {isTrial && info.org?.trial_ends_at &&
                `Trial berakhir ${new Date(info.org.trial_ends_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
              }
              {isExpired && 'Perpanjang langganan untuk mengakses fitur.'}
            </p>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-elevated p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-muted label-caps">Paket Langganan</h3>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-3xl font-bold text-on-surface font-display">Rp159.000</span>
          <span className="text-sm text-on-surface-muted">/bulan</span>
        </div>
        <ul className="mt-4 space-y-2 text-xs text-on-surface-variant">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            AI scan resi tak terbatas
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            Database karyawan unlimited
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            Matching otomatis & batch scan
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            Dashboard & laporan paket
          </li>
        </ul>
      </div>

      {/* Payment Action */}
      {(isTrial || isExpired) && (
        <div className="space-y-4">
          {info.temanqris_url ? (
            <div className="rounded-2xl border border-outline-variant/20 bg-surface-elevated p-5 text-center space-y-4">
              <p className="text-xs font-semibold text-on-surface-variant">Selesaikan pembayaran:</p>
              <a
                href={info.temanqris_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-primary py-2.5 px-6 text-sm font-semibold text-on-primary shadow-[0_4px_20px_rgba(82,213,255,0.25)] hover:brightness-110 transition-all font-display"
              >
                <CreditCard className="h-4 w-4" />
                <span>Buka Halaman Pembayaran</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              {info.temanqris_expires_at && (
                <p className="text-[10px] text-on-surface-muted">
                  Link berakhir: {new Date(info.temanqris_expires_at).toLocaleString('id-ID')}
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={handlePay}
              disabled={creating}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 px-4 text-sm font-semibold text-on-primary shadow-[0_4px_20px_rgba(82,213,255,0.25)] hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 font-display"
            >
              {creating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  <span>Bayar Sekarang - Rp159.000</span>
                </>
              )}
            </button>
          )}
          <p className="text-[10px] text-center text-on-surface-muted">
            Pembayaran via QRIS (GoPay, OVO, DANA, ShopeePay, semua bank)
          </p>
        </div>
      )}
    </div>
  );
}
