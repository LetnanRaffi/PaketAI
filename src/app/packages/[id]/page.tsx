'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle,
  X,
  Lock,
  Edit3,
  QrCode
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PackageDetail() {
  const router = useRouter();
  const params = useParams();
  const pkgId = params.id as string;

  const [pkg, setPkg] = useState<Package | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal Verification states
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'pin' | 'signature' | 'qr'>('pin');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // PIN states
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  
  // Signature States
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

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

  // Set up Canvas events when method changes to signature
  useEffect(() => {
    if (verificationMethod === 'signature' && showVerifyModal && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#334155'; // Slate-700
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [verificationMethod, showVerifyModal]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white min-h-[50vh]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
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

  // --- Signature Canvas Handlers ---
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // --- Verification Submission ---
  const handleVerify = async () => {
    if (verificationMethod === 'pin' && pinDigits.length < 4) {
      alert('Masukkan 4 digit PIN verifikasi.');
      return;
    }

    setIsVerifying(true);

    try {
      const res = await fetch(`/api/packages/${pkg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'sudah_diambil',
          picked_up_at: new Date().toISOString(),
          picked_up_verification: verificationMethod,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update package');
      }

      const updatedPkg = await res.json();
      setPkg(updatedPkg);

      // Close Modal & Trigger Celebration Confetti
      setShowVerifyModal(false);
      confetti({
        particleCount: 150,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePinInput = (num: number) => {
    if (pinDigits.length < 4) {
      setPinDigits([...pinDigits, num.toString()]);
    }
  };

  const handlePinDelete = () => {
    setPinDigits(pinDigits.slice(0, -1));
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
                  <Tag className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">NIK</span>
                    <p className="text-xs font-semibold text-slate-700">{employee.employee_id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Departemen</span>
                    <p className="text-xs font-semibold text-slate-700">{employee.department}</p>
                  </div>
                </div>
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

        {/* Pickup Verification Info if Status is Picked Up */}
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

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-green-100/50">
                <div>
                  <span className="text-[9px] font-bold text-green-700 uppercase">Waktu Ambil</span>
                  <p className="text-xs font-semibold text-green-800">{formattedDatePickedUp}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-green-700 uppercase">Metode Verifikasi</span>
                  <p className="text-xs font-semibold text-green-800 capitalize">{pkg.picked_up_verification}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA for Pending Packages */}
      {pkg.status === 'belum_diambil' && (
        <div className="pt-4 pb-8">
          <button
            onClick={() => setShowVerifyModal(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/10 hover:bg-indigo-500 transition-colors active:scale-98"
          >
            <CheckCircle className="h-4.5 w-4.5" />
            <span>Konfirmasi Pengambilan</span>
          </button>
        </div>
      )}

      {/* --- Verification Sheet Modal --- */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-t-3xl bg-white px-5 py-6 space-y-5 animate-in slide-in-from-bottom duration-300">
            {/* Grab handle */}
            <div className="mx-auto h-1 w-12 rounded-full bg-slate-200" />
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Verifikasi Ambil Paket</h3>
                <p className="text-[11px] text-slate-500 font-medium">Pilih metode autentikasi serah terima</p>
              </div>
              <button 
                onClick={() => setShowVerifyModal(false)}
                className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Selector Tabs */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
              {(['pin', 'signature', 'qr'] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setVerificationMethod(method)}
                  className={`flex flex-col items-center justify-center py-2.5 rounded-lg text-center transition-colors ${
                    verificationMethod === method
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {method === 'pin' && <Lock className="h-4 w-4 mb-1" />}
                  {method === 'signature' && <Edit3 className="h-4 w-4 mb-1" />}
                  {method === 'qr' && <QrCode className="h-4 w-4 mb-1" />}
                  <span className="text-[9px] font-bold uppercase tracking-wider">
                    {method === 'pin' ? 'PIN' : method === 'signature' ? 'Tangan' : 'QR Scan'}
                  </span>
                </button>
              ))}
            </div>

            {/* Method Details Pane */}
            <div className="min-h-[220px] flex items-center justify-center">
              {/* 1. PIN Keypad Panel */}
              {verificationMethod === 'pin' && (
                <div className="w-full space-y-4">
                  <div className="flex justify-center gap-3.5">
                    {[0, 1, 2, 3].map((idx) => (
                      <div 
                        key={idx}
                        className={`h-3 w-3 rounded-full border border-slate-300 transition-all ${
                          pinDigits[idx] ? 'bg-indigo-600 border-indigo-600 scale-110' : 'bg-slate-50'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handlePinInput(num)}
                        className="py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold text-slate-800 active:bg-slate-200 transition-colors"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPinDigits([])}
                      className="py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePinInput(0)}
                      className="py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold text-slate-800 active:bg-slate-200 transition-colors"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handlePinDelete}
                      className="py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Del
                    </button>
                  </div>
                </div>
              )}

              {/* 2. Signature Drawer Panel */}
              {verificationMethod === 'signature' && (
                <div className="w-full space-y-3">
                  <div className="relative border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      width={350}
                      height={180}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-[180px] cursor-crosshair touch-none"
                    />
                    <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-slate-400">
                      Tanda tangan di atas canvas ini
                    </div>
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-500"
                    >
                      Hapus Tanda Tangan
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Mock QR Scanning feed */}
              {verificationMethod === 'qr' && (
                <div className="w-full max-w-[280px] flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50 p-6 space-y-4">
                  <div className="relative h-28 w-28 border-2 border-indigo-600/30 rounded-2xl flex items-center justify-center p-3">
                    <QrCode className="h-full w-full text-slate-300 animate-pulse" />
                    <div className="absolute -top-1.5 -left-1.5 h-4 w-4 border-t-2 border-l-2 border-indigo-600" />
                    <div className="absolute -top-1.5 -right-1.5 h-4 w-4 border-t-2 border-r-2 border-indigo-600" />
                    <div className="absolute -bottom-1.5 -left-1.5 h-4 w-4 border-b-2 border-l-2 border-indigo-600" />
                    <div className="absolute -bottom-1.5 -right-1.5 h-4 w-4 border-b-2 border-r-2 border-indigo-600" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-slate-800">Menunggu QR Card...</p>
                    <p className="text-[10px] text-slate-400">Dekatkan kartu QR karyawan ke kamera depan</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Verify CTA */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleVerify}
                disabled={isVerifying}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition-colors flex justify-center items-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <span>Konfirmasi Penyerahan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
