'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, CreditCard, Users, LogOut, ChevronRight, Building2, Clock, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AccountSkeleton } from '@/app/components/Skeleton';

interface AccountInfo {
  email: string;
  full_name: string;
  org_name: string;
  plan: string;
  trial_ends_at: string | null;
  days_remaining: number;
}

export default function AccountPage() {
  const router = useRouter();
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const email = session?.user?.email || '';
        const fullName = session?.user?.user_metadata?.full_name || '';

        const res = await fetch('/api/billing/check-status');
        if (res.ok) {
          const data = await res.json();
          setInfo({
            email,
            full_name: fullName,
            org_name: data.org?.name || '',
            plan: data.org?.plan || 'trial',
            trial_ends_at: data.org?.trial_ends_at || null,
            days_remaining: data.days_remaining || 0,
          });
        } else {
          setInfo({ email, full_name: fullName, org_name: '', plan: 'trial', trial_ends_at: null, days_remaining: 0 });
        }
      } catch {
        const { data: { session } } = await supabase.auth.getSession();
        setInfo({
          email: session?.user?.email || '',
          full_name: session?.user?.user_metadata?.full_name || '',
          org_name: '',
          plan: 'trial',
          trial_ends_at: null,
          days_remaining: 0,
        });
      }
      setLoading(false);
    };
    fetchInfo();
  }, [supabase.auth]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex flex-1 min-h-[50vh]">
        <AccountSkeleton />
      </div>
    );
  }

  const initials = info?.email ? info.email.charAt(0).toUpperCase() : 'U';
  const planLabel = info?.plan === 'active' ? 'Pro Aktif' : info?.plan === 'trial' ? 'Trial' : 'Tidak Aktif';

  return (
    <div className="flex flex-col space-y-6">
      {/* Profile Card */}
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-elevated p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary text-lg font-bold font-display">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-on-surface truncate font-display">{info?.full_name || 'Admin'}</p>
            <p className="text-xs text-on-surface-muted truncate">{info?.email}</p>
            {info?.org_name && (
              <div className="flex items-center gap-1 mt-1">
                <Building2 className="h-3 w-3 text-on-surface-muted" />
                <p className="text-[11px] text-on-surface-muted">{info.org_name}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Status */}
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-elevated overflow-hidden">
        <div className="px-5 pt-4 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-muted label-caps">Langganan</h3>
        </div>
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {info?.plan === 'active' ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : info?.plan === 'trial' ? (
                <Clock className="h-5 w-5 text-primary" />
              ) : (
                <CreditCard className="h-5 w-5 text-error" />
              )}
              <div>
                <p className="text-sm font-semibold text-on-surface">{planLabel}</p>
                {info?.plan === 'trial' && info.days_remaining > 0 && (
                  <p className="text-[11px] text-on-surface-muted">{info.days_remaining} hari tersisa</p>
                )}
              </div>
            </div>
            <Link
              href="/billing"
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80"
            >
              Detail
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-elevated overflow-hidden divide-y divide-outline-variant/20">
        <Link
          href="/billing"
          className="flex items-center gap-3 px-5 py-4 hover:bg-surface-hover transition-colors"
        >
          <CreditCard className="h-4 w-4 text-on-surface-muted" />
          <span className="flex-1 text-sm font-medium text-on-surface-variant">Langganan & Pembayaran</span>
          <ChevronRight className="h-4 w-4 text-on-surface-muted/50" />
        </Link>
        <Link
          href="/employees"
          className="flex items-center gap-3 px-5 py-4 hover:bg-surface-hover transition-colors"
        >
          <Users className="h-4 w-4 text-on-surface-muted" />
          <span className="flex-1 text-sm font-medium text-on-surface-variant">Kelola Karyawan</span>
          <ChevronRight className="h-4 w-4 text-on-surface-muted/50" />
        </Link>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center justify-center gap-2 rounded-2xl border border-error/20 bg-surface-elevated py-3 text-sm font-semibold text-error hover:bg-error-container/10 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Keluar
      </button>

      <p className="text-center text-[10px] text-on-surface-muted/40">PaketAI v1.0</p>
    </div>
  );
}
