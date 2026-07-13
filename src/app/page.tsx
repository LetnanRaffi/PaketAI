'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { 
  Inbox, 
  Clock, 
  Camera, 
  Users, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { DashboardSkeleton } from '@/app/components/Skeleton';

export default function Dashboard() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [adminEmail, setAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setAdminEmail(session.user.email);
      } else {
        setAdminEmail('Petugas Mailroom');
      }

      try {
        const res = await fetch('/api/packages');
        if (res.ok) {
          const data = await res.json();
          setPackages(data);
        }
      } catch (err) {
        console.error('Failed to fetch packages', err);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [supabase.auth]);

  if (loading) {
    return (
      <div className="flex flex-1 bg-surface min-h-[50vh]">
        <DashboardSkeleton />
      </div>
    );
  }

  const pendingCount = packages.filter(p => p.status === 'belum_diambil').length;
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCount = packages.filter(p => new Date(p.received_at) >= todayStart).length;

  const recentPackages = packages.slice(0, 3);

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-muted">Selamat Bekerja</span>
          <h1 className="text-xl font-bold text-on-surface truncate max-w-[200px] font-display">
            {adminEmail.split('@')[0]}
          </h1>
        </div>
      </div>

      {/* Info Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-container to-primary p-5 text-white shadow-[0_4px_20px_rgba(82,213,255,0.15)]">
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-white backdrop-blur-sm">
            <TrendingUp className="h-3 w-3" />
            Core MVP
          </span>
          <h2 className="text-lg font-bold font-display">Teknologi OCR & AI</h2>
          <p className="text-xs text-white/80 leading-relaxed max-w-xs">
            Foto resi langsung dari kamera hp, sistem mencocokkan nama karyawan otomatis.
          </p>
        </div>
        <div className="absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-white opacity-10 blur-xl" />
        <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-white opacity-10 blur-xl" />
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-elevated p-4">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-tertiary/15 text-tertiary">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold text-on-surface-muted uppercase tracking-wider">Pending</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-on-surface tracking-tight font-display">{pendingCount}</p>
          <p className="mt-1 text-[10px] font-medium text-on-surface-muted">Paket belum diambil</p>
        </div>

        <div className="rounded-2xl border border-outline-variant/20 bg-surface-elevated p-4">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Inbox className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold text-on-surface-muted uppercase tracking-wider">Hari Ini</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-on-surface tracking-tight font-display">{todayCount}</p>
          <p className="mt-1 text-[10px] font-medium text-on-surface-muted">Paket didata hari ini</p>
        </div>
      </div>

      {/* Quick Access Menu */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-muted label-caps">Akses Cepat</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/scan"
            className="flex items-center gap-3 rounded-xl border border-outline-variant/20 bg-surface-elevated p-3 hover:bg-surface-hover active:scale-98 transition-all"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary shadow-sm shadow-primary/20">
              <Camera className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-on-surface">Scan Resi</p>
              <p className="text-[9px] text-on-surface-muted">Foto & input paket</p>
            </div>
          </Link>

          <Link
            href="/employees"
            className="flex items-center gap-3 rounded-xl border border-outline-variant/20 bg-surface-elevated p-3 hover:bg-surface-hover active:scale-98 transition-all"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-container/30 text-secondary">
              <Users className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-on-surface">Karyawan</p>
              <p className="text-[9px] text-on-surface-muted">Kelola database</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Packages */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-muted label-caps">Aktivitas Terakhir</h3>
          <Link href="/packages" className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center">
            <span>Lihat Semua</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {recentPackages.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant/30 p-8 text-center">
            <Inbox className="h-8 w-8 text-on-surface-muted/50 mb-2" />
            <p className="text-xs text-on-surface-muted">Belum ada paket didata.</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/20 rounded-2xl border border-outline-variant/20 bg-surface-elevated overflow-hidden">
            {recentPackages.map((pkg) => (
              <Link
                key={pkg.id}
                href={`/packages/${pkg.id}`}
                className="flex items-center justify-between p-4 hover:bg-surface-hover/50 active:bg-surface-hover transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-highest border border-outline-variant/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pkg.receipt_image_url}
                      alt="Resi"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-on-surface truncate">
                      {pkg.recipient_name_raw}
                    </p>
                    <p className="text-[10px] text-on-surface-muted truncate mt-0.5">
                      {pkg.courier} &bull; {pkg.tracking_number}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                      pkg.status === 'belum_diambil'
                        ? 'bg-tertiary/15 text-tertiary'
                        : 'bg-success/15 text-success'
                    }`}
                  >
                    {pkg.status === 'belum_diambil' ? 'Pending' : 'Diambil'}
                  </span>
                  <ChevronRight className="h-4 w-4 text-on-surface-muted" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
