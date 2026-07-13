'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package } from '@/lib/types';
import { Search, Inbox, ChevronRight, Calendar } from 'lucide-react';

export default function PackagesList() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'semua' | 'belum_diambil' | 'sudah_diambil'>('semua');

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        let url = '/api/packages';
        const params = new URLSearchParams();
        if (statusFilter !== 'semua') {
          params.append('status', statusFilter);
        }
        if (searchTerm) {
          params.append('search', searchTerm);
        }
        if (params.toString()) {
          url += '?' + params.toString();
        }

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setPackages(data);
        }
      } catch (err) {
        console.error('Error fetching packages:', err);
      } finally {
        setLoading(false);
      }
    };

    // Debounce the API call slightly if searching
    const timer = setTimeout(() => {
      fetchPackages();
    }, 300);

    return () => clearTimeout(timer);
  }, [statusFilter, searchTerm]);

  if (loading && packages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white min-h-[50vh]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Daftar Paket</h1>
        <p className="text-xs text-slate-500 font-medium">Cari dan kelola status pengambilan paket</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Cari penerima, resi, atau kurir..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-indigo-600 focus:bg-white focus:ring-0 transition-colors"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1">
        {(['semua', 'belum_diambil', 'sudah_diambil'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors capitalize ${
              statusFilter === tab
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {tab === 'semua' ? 'Semua' : tab === 'belum_diambil' ? 'Belum Diambil' : 'Sudah Diambil'}
          </button>
        ))}
      </div>

      {/* List Container */}
      {packages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 px-4 text-center bg-slate-50/50">
          <Inbox className="h-10 w-10 text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-800">Paket Tidak Ditemukan</h3>
          <p className="text-xs text-slate-400 max-w-xs mt-1">
            Silakan ganti kata kunci pencarian atau bersihkan filter status.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Daftar Paket ({packages.length})
          </span>

          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-xs">
            {packages.map((pkg) => {
              const matchedName = pkg.employee?.full_name;
              const formattedDate = new Date(pkg.received_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <Link
                  key={pkg.id}
                  href={`/packages/${pkg.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50/50 active:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Thumbnail Image */}
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-100 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pkg.receipt_image_url}
                        alt="Resi"
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {pkg.recipient_name_raw}
                        </h4>
                        {matchedName && (
                          <span className="shrink-0 inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.2 text-[8px] font-semibold text-indigo-700">
                            Match: {matchedName.split(' ')[0]}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate font-medium">
                        {pkg.courier} &bull; {pkg.tracking_number}
                      </p>
                      <div className="flex items-center gap-1 text-[9px] text-slate-400">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span>{formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                        pkg.status === 'belum_diambil'
                          ? 'bg-orange-50 text-orange-600 border border-orange-100'
                          : 'bg-green-50 text-green-600 border border-green-100'
                      }`}
                    >
                      {pkg.status === 'belum_diambil' ? 'Pending' : 'Diambil'}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
