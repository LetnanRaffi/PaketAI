'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Package } from '@/lib/types';
import { Search, Inbox, ChevronRight, Calendar, Briefcase, ChevronDown } from 'lucide-react';
import { PackagesSkeleton } from '@/app/components/Skeleton';

export default function PackagesList() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'semua' | 'belum_diambil' | 'sudah_diambil'>('semua');
  const [deptFilter, setDeptFilter] = useState('semua');
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        let url = '/api/packages';
        const params = new URLSearchParams();
        if (statusFilter !== 'semua') params.append('status', statusFilter);
        if (searchTerm) params.append('search', searchTerm);
        if (params.toString()) url += '?' + params.toString();

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

    const timer = setTimeout(() => fetchPackages(), 300);
    return () => clearTimeout(timer);
  }, [statusFilter, searchTerm]);

  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    for (const pkg of packages) {
      if (pkg.employee?.department) deptSet.add(pkg.employee.department);
    }
    return Array.from(deptSet).sort();
  }, [packages]);

  const filteredPackages = useMemo(() => {
    if (deptFilter === 'semua') return packages;
    return packages.filter(pkg => pkg.employee?.department === deptFilter);
  }, [packages, deptFilter]);

  if (loading && packages.length === 0) {
    return (
      <div className="flex flex-1 bg-surface min-h-[50vh]">
        <PackagesSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-5">
      <div>
        <h1 className="text-xl font-bold text-on-surface font-display">Daftar Paket</h1>
        <p className="text-xs text-on-surface-muted font-medium">Cari dan kelola status pengambilan paket</p>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-on-surface-muted" />
        </div>
        <input
          type="text"
          placeholder="Cari penerima, resi, atau kurir..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full rounded-xl border border-outline-variant/40 bg-surface-highest py-2.5 pl-10 pr-4 text-sm text-on-surface placeholder-on-surface-muted/60 focus:border-primary transition-colors"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-outline-variant/20 pb-1">
        {(['semua', 'belum_diambil', 'sudah_diambil'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors capitalize ${
              statusFilter === tab
                ? 'bg-on-surface text-asphalt'
                : 'text-on-surface-muted hover:text-on-surface hover:bg-surface-hover'
            }`}
          >
            {tab === 'semua' ? 'Semua' : tab === 'belum_diambil' ? 'Belum Diambil' : 'Sudah Diambil'}
          </button>
        ))}
      </div>

      {/* Department Filter */}
      {departments.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowDeptDropdown(!showDeptDropdown)}
            className="flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface-elevated px-3.5 py-2.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-hover transition-colors w-full"
          >
            <Briefcase className="h-3.5 w-3.5 text-on-surface-muted" />
            <span className="flex-1 text-left">{deptFilter === 'semua' ? 'Semua Departemen' : deptFilter}</span>
            {deptFilter !== 'semua' && (
              <button onClick={(e) => { e.stopPropagation(); setDeptFilter('semua'); }} className="text-[10px] font-bold text-on-surface-muted hover:text-on-surface">
                Reset
              </button>
            )}
            <ChevronDown className={`h-3.5 w-3.5 text-on-surface-muted transition-transform ${showDeptDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showDeptDropdown && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-outline-variant/30 bg-surface-elevated py-1 shadow-2xl shadow-black/40">
              <button onClick={() => { setDeptFilter('semua'); setShowDeptDropdown(false); }}
                className={`w-full px-4 py-2 text-left text-xs font-semibold transition-colors ${deptFilter === 'semua' ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-hover'}`}>
                Semua Departemen
              </button>
              {departments.map((dept) => (
                <button key={dept} onClick={() => { setDeptFilter(dept); setShowDeptDropdown(false); }}
                  className={`w-full px-4 py-2 text-left text-xs font-semibold transition-colors ${deptFilter === dept ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-hover'}`}>
                  {dept}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* List */}
      {filteredPackages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant/30 py-16 px-4 text-center">
          <Inbox className="h-10 w-10 text-on-surface-muted/40 mb-2" />
          <h3 className="text-sm font-bold text-on-surface">Paket Tidak Ditemukan</h3>
          <p className="text-xs text-on-surface-muted max-w-xs mt-1">Silakan ganti filter atau kata kunci pencarian.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-muted label-caps">
            Daftar Paket ({filteredPackages.length})
          </span>
          <div className="divide-y divide-outline-variant/20 rounded-2xl border border-outline-variant/20 bg-surface-elevated overflow-hidden">
            {filteredPackages.map((pkg) => {
              const matchedName = pkg.employee?.full_name;
              const dept = pkg.employee?.department;
              const formattedDate = new Date(pkg.received_at).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              });

              return (
                <Link key={pkg.id} href={`/packages/${pkg.id}`}
                  className="flex items-center justify-between p-4 hover:bg-surface-hover/50 active:bg-surface-hover transition-colors">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-highest border border-outline-variant/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pkg.receipt_image_url} alt="Resi" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-on-surface truncate">{pkg.recipient_name_raw}</h4>
                        {matchedName && (
                          <span className="shrink-0 inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.2 text-[8px] font-semibold text-primary">
                            {matchedName.split(' ')[0]}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-on-surface-muted truncate font-medium">
                        {pkg.courier} &bull; {pkg.tracking_number}
                      </p>
                      <div className="flex items-center gap-2 text-[9px] text-on-surface-muted/70">
                        <span className="flex items-center gap-0.5">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {formattedDate}
                        </span>
                        {dept && (
                          <span className="flex items-center gap-0.5">
                            <Briefcase className="h-3 w-3 shrink-0" />
                            {dept}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                      pkg.status === 'belum_diambil'
                        ? 'bg-tertiary/15 text-tertiary border border-tertiary/20'
                        : 'bg-success/15 text-success border border-success/20'
                    }`}>
                      {pkg.status === 'belum_diambil' ? 'Pending' : 'Diambil'}
                    </span>
                    <ChevronRight className="h-4 w-4 text-on-surface-muted" />
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
