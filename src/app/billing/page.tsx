'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, Clock, CheckCircle2, AlertCircle, ExternalLink, FlaskConical } from 'lucide-react';

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
  const [testCreating, setTestCreating] = useState(false);
  const [testUrl, setTestUrl] = useState<string | null>(null);

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

  const handleTestPay = async () => {
    setTestCreating(true);
    try {
      const res = await fetch('/api/billing/test-payment', { method: 'POST' });
      const data = await res.json();
      if (data.payment_url) {
        setTestUrl(data.payment_url);
      }
    } catch {
      alert('Gagal membuat test payment.');
    }
    setTestCreating(false);
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[50vh]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!info || info.error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center min-h-[50vh] space-y-4">
        <AlertCircle className="h-10 w-10 text-slate-300" />
        <p className="text-sm text-slate-500">{info?.error || 'Gagal memuat data billing.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
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
        <h1 className="text-xl font-bold text-slate-900">Langganan</h1>
        <p className="text-xs text-slate-500 mt-1">Kelola langganan PaketAI Anda</p>
      </div>

      {/* Status Card */}
      <div className={`rounded-2xl p-5 border ${
        isActive ? 'bg-green-50 border-green-100' :
        isTrial ? 'bg-indigo-50 border-indigo-100' :
        'bg-red-50 border-red-100'
      }`}>
        <div className="flex items-start gap-3">
          {isActive ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          ) : isTrial ? (
            <Clock className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className={`text-sm font-semibold ${
              isActive ? 'text-green-900' : isTrial ? 'text-indigo-900' : 'text-red-900'
            }`}>
              {isActive && 'Langganan Aktif'}
              {isTrial && `Trial - ${info.days_remaining} hari tersisa`}
              {isExpired && 'Langganan Berakhir'}
            </p>
            <p className={`text-xs mt-1 ${
              isActive ? 'text-green-700' : isTrial ? 'text-indigo-700' : 'text-red-700'
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
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Paket Langganan</h3>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-3xl font-bold text-slate-900">Rp159.000</span>
          <span className="text-sm text-slate-500">/bulan</span>
        </div>
        <ul className="mt-4 space-y-2 text-xs text-slate-600">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            AI scan resi tak terbatas
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            Database karyawan unlimited
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            Matching otomatis & batch scan
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            Dashboard & laporan paket
          </li>
        </ul>
      </div>

      {/* Payment Action */}
      {(isTrial || isExpired) && (
        <div className="space-y-4">
          {info.temanqris_url ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs text-center space-y-4">
              <p className="text-xs font-semibold text-slate-700">Selesaikan pembayaran:</p>
              <a
                href={info.temanqris_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 py-2.5 px-6 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                <CreditCard className="h-4 w-4" />
                <span>Buka Halaman Pembayaran</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              {info.temanqris_expires_at && (
                <p className="text-[10px] text-slate-400">
                  Link berakhir: {new Date(info.temanqris_expires_at).toLocaleString('id-ID')}
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={handlePay}
              disabled={creating}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors active:scale-98 disabled:opacity-50"
            >
              {creating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
          <p className="text-[10px] text-center text-slate-400">
            Pembayaran via QRIS (GoPay, OVO, DANA, ShopeePay, semua bank)
          </p>
        </div>
      )}

      {/* Test Payment */}
      <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical className="h-4 w-4 text-amber-600" />
          <p className="text-xs font-bold text-amber-800">Test Pembayaran</p>
        </div>
        <p className="text-[11px] text-amber-700 mb-3">
          Buat link pembayaran Rp1 untuk testing integrasi TemanQRIS.
        </p>
        {testUrl ? (
          <a
            href={testUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 py-2 px-4 text-xs font-semibold text-white hover:bg-amber-500 transition-colors"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Buka Test Payment (Rp1)</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <button
            onClick={handleTestPay}
            disabled={testCreating}
            className="flex items-center gap-2 rounded-lg bg-amber-600 py-2 px-4 text-xs font-semibold text-white hover:bg-amber-500 transition-colors disabled:opacity-50"
          >
            {testCreating ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <FlaskConical className="h-3.5 w-3.5" />
                <span>Buat Test Payment Rp1</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
