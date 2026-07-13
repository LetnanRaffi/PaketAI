'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Package, Employee } from '@/lib/types';
import { 
  ArrowLeft, Calendar, User, MapPin, Phone, Tag, FileText, CheckCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PackageDetailSkeleton } from '@/app/components/Skeleton';

export default function PackageDetail() {
  const router = useRouter();
  const params = useParams();
  const pkgId = params.id as string;

  const [pkg, setPkg] = useState<Package | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const fetchPackage = async () => {
      try {
        const res = await fetch(`/api/packages/${pkgId}`);
        if (res.ok) {
          const data = await res.json();
          setPkg(data);
          if (data.employee) setEmployee(data.employee);
        }
      } catch (err) {
        console.error('Failed to fetch package', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPackage();
  }, [pkgId]);

  if (loading) {
    return (
      <div className="flex flex-1 bg-surface min-h-[50vh]">
        <PackageDetailSkeleton />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <p className="text-sm font-bold text-on-surface">Paket tidak ditemukan</p>
        <button onClick={() => router.push('/packages')} className="text-xs font-bold text-primary">
          Kembali ke Daftar Paket
        </button>
      </div>
    );
  }

  const handleConfirmPickup = async () => {
    setIsConfirming(true);
    try {
      const res = await fetch(`/api/packages/${pkg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sudah_diambil', picked_up_at: new Date().toISOString() }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Gagal mengubah status paket');
      }
      const updatedPkg = await res.json();
      setPkg(updatedPkg);
      confetti({ particleCount: 150, spread: 60, origin: { y: 0.7 } });
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsConfirming(false);
    }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/packages')} className="p-1 rounded-lg hover:bg-surface-hover transition-colors">
          <ArrowLeft className="h-5 w-5 text-on-surface-variant" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-on-surface font-display">Detail Paket</h1>
          <p className="text-xs text-on-surface-muted font-medium">Informasi & status serah terima</p>
        </div>
      </div>

      {/* Image */}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-highest">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pkg.receipt_image_url} alt="Foto Resi" className="h-full w-full object-cover" />
        <div className="absolute top-3 right-3">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
            pkg.status === 'belum_diambil'
              ? 'bg-tertiary text-on-tertiary'
              : 'bg-success text-white'
          }`}>
            {pkg.status === 'belum_diambil' ? 'Pending' : 'Sudah Diambil'}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-4">
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-muted label-caps">Informasi Paket</h3>
          <div className="rounded-2xl border border-outline-variant/20 bg-surface-elevated p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-highest text-on-surface-variant">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wide label-caps">Penerima di Resi</span>
                <p className="text-sm font-bold text-on-surface">{pkg.recipient_name_raw}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-outline-variant/20">
              <div>
                <span className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wide label-caps">Ekspedisi</span>
                <p className="text-xs font-semibold text-on-surface-variant">{pkg.courier}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wide label-caps">No. Resi</span>
                <p className="text-xs font-semibold text-on-surface-variant">{pkg.tracking_number}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-outline-variant/20">
              <span className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wide label-caps">Diterima Mailroom</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant mt-0.5">
                <Calendar className="h-3.5 w-3.5 text-on-surface-muted" />
                <span>{fmtDate(pkg.received_at)}</span>
              </div>
            </div>
            {pkg.match_confidence > 0 && (
              <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between">
                <span className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wide label-caps">Skor Kecocokan AI</span>
                <span className="text-xs font-bold text-primary">{(pkg.match_confidence * 100).toFixed(0)}% Confidence</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-muted label-caps">Penerima Database</h3>
          {employee ? (
            <div className="rounded-2xl border border-outline-variant/20 bg-surface-elevated p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-on-surface-muted uppercase tracking-wide label-caps">Nama Karyawan</span>
                  <p className="text-sm font-bold text-on-surface">{employee.full_name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-on-surface-muted shrink-0" />
                  <div>
                    <span className="text-[9px] font-bold text-on-surface-muted uppercase label-caps">Departemen</span>
                    <p className="text-xs font-semibold text-on-surface-variant">{employee.department || 'Tanpa Departemen'}</p>
                  </div>
                </div>
                {employee.employee_id && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-on-surface-muted shrink-0" />
                    <div>
                      <span className="text-[9px] font-bold text-on-surface-muted uppercase label-caps">NIK</span>
                      <p className="text-xs font-semibold text-on-surface-variant">{employee.employee_id}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="pt-2 border-t border-outline-variant/20 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-on-surface-muted shrink-0" />
                <div>
                  <span className="text-[9px] font-bold text-on-surface-muted uppercase label-caps">No. WhatsApp</span>
                  <p className="text-xs font-semibold text-on-surface-variant">{employee.phone_number}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-outline-variant/30 p-4 text-center">
              <p className="text-xs text-on-surface-muted">Tidak ada data karyawan yang terhubung.</p>
            </div>
          )}
        </div>

        {pkg.status === 'sudah_diambil' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-muted label-caps">Informasi Pengambilan</h3>
            <div className="rounded-2xl bg-success/5 border border-success/20 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-success uppercase tracking-wide label-caps">Status Serah Terima</span>
                  <p className="text-xs font-bold text-on-surface">Selesai Diserahkan</p>
                </div>
              </div>
              <div className="pt-2 border-t border-success/10">
                <span className="text-[9px] font-bold text-success uppercase label-caps">Waktu Ambil</span>
                <p className="text-xs font-semibold text-on-surface-variant">{pkg.picked_up_at ? fmtDate(pkg.picked_up_at) : '-'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {pkg.status === 'belum_diambil' && (
        <div className="pt-4 pb-8">
          <button
            onClick={handleConfirmPickup}
            disabled={isConfirming}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary shadow-[0_4px_20px_rgba(82,213,255,0.25)] hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 font-display"
          >
            {isConfirming ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Sudah Diambil</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
