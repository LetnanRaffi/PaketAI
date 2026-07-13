'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Package, Employee } from '@/lib/types';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  MapPin, 
  Phone, 
  Tag, 
  FileText, 
  CheckCircle
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
          if (data.employee) {
            setEmployee(data.employee);
          }
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
      <div className="flex flex-1 bg-white min-h-[50vh]">
        <PackageDetailSkeleton />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <p className="text-sm font-bold text-slate-700">Paket tidak ditemukan</p>
        <button 
          onClick={() => router.push('/packages')}
          className="text-xs font-bold text-indigo-600"
        >
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
        body: JSON.stringify({
          status: 'sudah_diambil',
          picked_up_at: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Gagal mengubah status paket');
      }

      const updatedPkg = await res.json();
      setPkg(updatedPkg);

      confetti({
        particleCount: 150,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message);
    } finally {
      setIsConfirming(false);
    }
  };

  const formattedDateReceived = new Date(pkg.received_at).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedDatePickedUp = pkg.picked_up_at
    ? new Date(pkg.picked_up_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => router.push('/packages')}
          className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Detail Paket</h1>
          <p className="text-xs text-slate-500 font-medium">Informasi & status serah terima</p>
        </div>
      </div>

      {/* Package Card Image */}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 shadow-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={pkg.receipt_image_url} 
          alt="Foto Resi" 
          className="h-full w-full object-cover"
        />
        <div className="absolute top-3 right-3">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
            pkg.status === 'belum_diambil'
              ? 'bg-orange-500 text-white'
              : 'bg-green-600 text-white'
          }`}>
            {pkg.status === 'belum_diambil' ? 'Pending (Belum Diambil)' : 'Sudah Diambil'}
          </span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="space-y-4">
        {/* Package Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Informasi Paket</h3>
          
          <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Penerima di Resi</span>
                <p className="text-sm font-bold text-slate-800">{pkg.recipient_name_raw}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Ekspedisi</span>
                <p className="text-xs font-semibold text-slate-700">{pkg.courier}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">No. Resi</span>
                <p className="text-xs font-semibold text-slate-700">{pkg.tracking_number}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Diterima Mailroom</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mt-0.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>{formattedDateReceived}</span>
              </div>
            </div>

            {pkg.match_confidence > 0 && (
              <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Skor Kecocokan AI</span>
                <span className="text-xs font-bold text-indigo-600">
                  {(pkg.match_confidence * 100).toFixed(0)}% Confidence
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Matched Employee Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Penerima Database</h3>
          
          {employee ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <User className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nama Karyawan</span>
                  <p className="text-sm font-bold text-slate-800">{employee.full_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Departemen</span>
                    <p className="text-xs font-semibold text-slate-700">{employee.department || 'Tanpa Departemen'}</p>
                  </div>
                </div>

                {employee.employee_id && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">NIK</span>
                      <p className="text-xs font-semibold text-slate-700">{employee.employee_id}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-50 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">No. WhatsApp</span>
                  <p className="text-xs font-semibold text-slate-700">{employee.phone_number}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
              <p className="text-xs text-slate-500">Tidak ada data karyawan yang terhubung.</p>
            </div>
          )}
        </div>

        {/* Pickup Info if Picked Up */}
        {pkg.status === 'sudah_diambil' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Informasi Pengambilan</h3>
            <div className="rounded-2xl bg-green-50/50 border border-green-100 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Status Serah Terima</span>
                  <p className="text-xs font-bold text-green-900">Selesai Diserahkan</p>
                </div>
              </div>
              <div className="pt-2 border-t border-green-100/50">
                <span className="text-[9px] font-bold text-green-700 uppercase">Waktu Ambil</span>
                <p className="text-xs font-semibold text-green-800">{formattedDatePickedUp}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA for Pending Packages */}
      {pkg.status === 'belum_diambil' && (
        <div className="pt-4 pb-8">
          <button
            onClick={handleConfirmPickup}
            disabled={isConfirming}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/10 hover:bg-indigo-500 transition-colors active:scale-98 disabled:opacity-50"
          >
            {isConfirming ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4.5 w-4.5" />
                <span>Sudah Diambil</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
