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

export default function Dashboard() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [adminEmail, setAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      // Get user
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setAdminEmail(session.user.email);
      } else {
        setAdminEmail('Petugas Mailroom');
      }

      // Fetch packages
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
      <div className="flex flex-1 items-center justify-center bg-white min-h-[50vh]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  // Stats calculations
  const pendingCount = packages.filter(p => p.status === 'belum_diambil').length;
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCount = packages.filter(p => new Date(p.received_at) >= todayStart).length;

  const recentPackages = packages.slice(0, 3); // Already sorted in API

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selamat Bekerja</span>
          <h1 className="text-xl font-bold text-slate-900 truncate max-w-[200px]">
            {adminEmail.split('@')[0]}
          </h1>
        </div>
      </div>

      {/* Info Banner / Quick status */}
      <div className="relative overflow-hidden rounded-2xl bg-indigo-600 p-5 text-white shadow-md shadow-indigo-600/10">
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-white">
            <TrendingUp className="h-3 w-3" />
            Core MVP
          </span>
          <h2 className="text-lg font-bold">Teknologi OCR & AI</h2>
          <p className="text-xs text-indigo-100 leading-relaxed max-w-xs">
            Foto resi langsung dari kamera hp, sistem mencocokkan nama karyawan otomatis.
          </p>
        </div>
        {/* Background decorative blob */}
        <div className="absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-indigo-500 opacity-20 blur-xl" />
        <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-indigo-700 opacity-30 blur-xl" />
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold text-slate-400">Total Pending</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900 tracking-tight">{pendingCount}</p>
          <p className="mt-1 text-[10px] font-medium text-slate-500">Paket belum diambil</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Inbox className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold text-slate-400">Hari Ini</span>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900 tracking-tight">{todayCount}</p>
          <p className="mt-1 text-[10px] font-medium text-slate-500">Paket didata hari ini</p>
        </div>
      </div>

      {/* Quick Access Menu */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Akses Cepat</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/scan"
            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-50 active:scale-98 transition-all"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-600/10">
              <Camera className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800">Scan Resi</p>
              <p className="text-[9px] text-slate-400">Foto & input paket</p>
            </div>
          </Link>

          <Link
            href="/employees"
            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-50 active:scale-98 transition-all"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
              <Users className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800">Karyawan</p>
              <p className="text-[9px] text-slate-400">Kelola database</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Packages */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Aktivitas Terakhir</h3>
          <Link href="/packages" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 flex items-center">
            <span>Lihat Semua</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {recentPackages.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
            <Inbox className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-xs text-slate-500">Belum ada paket didata.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-xs">
            {recentPackages.map((pkg) => (
              <Link
                key={pkg.id}
                href={`/packages/${pkg.id}`}
                className="flex items-center justify-between p-4 hover:bg-slate-50/50 active:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pkg.receipt_image_url}
                      alt="Resi"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {pkg.recipient_name_raw}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {pkg.courier} &bull; {pkg.tracking_number}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                      pkg.status === 'belum_diambil'
                        ? 'bg-orange-50 text-orange-600'
                        : 'bg-green-50 text-green-600'
                    }`}
                  >
                    {pkg.status === 'belum_diambil' ? 'Pending' : 'Diambil'}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
