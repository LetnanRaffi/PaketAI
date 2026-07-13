'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Employee, ScanResult } from '@/lib/types';
import CameraComponent from '@/app/components/CameraComponent';
import { 
  Camera, 
  Upload, 
  RefreshCw, 
  Check, 
  AlertTriangle, 
  Search, 
  User, 
  ArrowLeft,
  FileText
} from 'lucide-react';

export default function ScanPackage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  
  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0); // 0: Idle, 1: OCR, 2: Match, 3: Completed
  const [scanProgressText, setScanProgressText] = useState('');
  const [scanError, setScanError] = useState('');

  // Form states (pre-filled by OCR/AI)
  const [rawName, setRawName] = useState('');
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  
  // Manual employee selector states
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Fetch all employees for manual dropdown
    const fetchEmployees = async () => {
      try {
        const res = await fetch('/api/employees');
        if (res.ok) {
          const data = await res.json();
          setEmployees(data);
        }
      } catch (err) {
        console.error('Failed to fetch employees', err);
      }
    };
    fetchEmployees();
  }, []);

  const runRealScan = async (base64Image: string) => {
    setIsScanning(true);
    setScanStep(1);
    setScanError('');
    setScanProgressText('Mengirim gambar ke server AI...');

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image }),
      });

      setScanStep(2);
      setScanProgressText('Menganalisis resi (OCR) & mencocokkan nama...');

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to scan image');
      }

      setScanStep(3);
      setScanProgressText('Selesai!');
      
      setTimeout(() => {
        setIsScanning(false);
        setScanStep(0);
        
        // Load AI data into state
        setImagePreview(data.receipt_image_url); // Now it's the public URL from Supabase
        setRawName(data.recipient_name_raw || '');
        setCourier(data.courier || '');
        setTrackingNumber(data.tracking_number || '');
        setConfidence(data.match_confidence || 0);
        
        if (data.matched_employee_id) {
          setSelectedEmployeeId(data.matched_employee_id);
          setSearchTerm(data.matched_employee_name || '');
        } else {
          setSelectedEmployeeId('');
          setSearchTerm('');
        }
      }, 500);

    } catch (err: any) {
      console.error(err);
      setScanError(err.message || 'Terjadi kesalahan saat memproses gambar.');
      setIsScanning(false);
      setScanStep(0);
      setImagePreview(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // We must resize or compress if it's too large, but for now just read as Data URL
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      setImagePreview(base64Data); // temporary preview before real URL comes back
      runRealScan(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = (imageData: string) => {
    setShowCamera(false);
    setImagePreview(imageData);
    runRealScan(imageData);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview || imagePreview.startsWith('data:')) {
      alert('Tunggu gambar selesai diunggah.');
      return;
    }

    try {
      const res = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt_image_url: imagePreview,
          recipient_name_raw: rawName,
          employee_id: selectedEmployeeId || null,
          match_confidence: confidence,
          tracking_number: trackingNumber,
          courier: courier,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menyimpan paket');
      }

      router.push('/packages');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setImagePreview(null);
    setRawName('');
    setCourier('');
    setTrackingNumber('');
    setConfidence(0);
    setSelectedEmployeeId('');
    setSearchTerm('');
    setScanError('');
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => router.push('/')}
          className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Scan Resi Paket</h1>
          <p className="text-xs text-slate-500 font-medium">Input paket masuk otomatis memakai AI</p>
        </div>
      </div>

      {scanError && (
        <div className="rounded-xl bg-red-50 p-4 border border-red-100">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-bold">Error Processing AI</span>
          </div>
          <p className="text-xs text-red-500">{scanError}</p>
          <button onClick={resetForm} className="mt-2 text-xs font-semibold text-red-600 underline">Coba Lagi</button>
        </div>
      )}

      {/* Step 1: Upload or Snap Photo */}
      {!imagePreview && !isScanning && !scanError && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pilih Metode Input</h2>
            
            {/* Camera / Upload buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowCamera(true)}
                className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 hover:bg-slate-50 active:scale-95 transition-all text-center group cursor-pointer"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3 group-hover:scale-105 transition-transform">
                  <Camera className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-slate-800">Kamera Hp</span>
                <span className="text-[10px] text-slate-400 mt-1">Foto resi langsung</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 hover:bg-slate-50 active:scale-95 transition-all text-center group cursor-pointer"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600 mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-slate-800">Galeri Foto</span>
                <span className="text-[10px] text-slate-400 mt-1">Unggah file resi</span>
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* Step 2: Scanning Simulation Screen */}
      {isScanning && (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
          <div className="relative h-56 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-inner">
            {imagePreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreview}
                alt="Scanning..."
                className="h-full w-full object-cover"
              />
            )}
            
            {/* Lasersweep scanning animation overlay */}
            <div className="absolute inset-x-0 h-1 bg-indigo-500 shadow-md shadow-indigo-500 animate-scan" />
            <div className="absolute inset-0 bg-indigo-600/5 backdrop-brightness-95" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Menganalisis Resi</span>
            </div>
            <p className="text-sm font-semibold text-slate-600">{scanProgressText}</p>
          </div>
        </div>
      )}

      {/* Step 3: OCR Results Form */}
      {imagePreview && !isScanning && !scanError && (
        <form onSubmit={handleSavePackage} className="space-y-5 pb-8">
          {/* Scanned Image Preview */}
          <div className="flex items-center gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
            <div className="h-16 w-16 overflow-hidden rounded-lg border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Snapped resi"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-800">Foto Resi Terlampir</p>
              <button
                type="button"
                onClick={resetForm}
                className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-500 mt-1 flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Ulangi Snap</span>
              </button>
            </div>
          </div>

          {/* AI Match Banner */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Hasil AI matching</label>
            {confidence >= 0.8 ? (
              <div className="rounded-xl bg-green-50/70 p-3.5 border border-green-100 flex items-start gap-2.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-green-800">Karyawan Cocok Otomatis</span>
                    <span className="text-[9px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.2 rounded-full">
                      {(confidence * 100).toFixed(0)}% Akurasi
                    </span>
                  </div>
                  <p className="text-[11px] text-green-600 mt-0.5">
                    Nama hasil OCR &apos;{rawName}&apos; cocok dengan data karyawan.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-amber-50/70 p-3.5 border border-amber-100 flex items-start gap-2.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
                  <AlertTriangle className="h-3 w-3" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-amber-800">Akurasi Rendah / Perlu Koreksi</span>
                    <span className="text-[9px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.2 rounded-full">
                      {(confidence * 100).toFixed(0)}% Akurasi
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    Cocokkan manual nama penerima &apos;{rawName}&apos; dengan database.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Raw Recipient Name */}
            <div>
              <label htmlFor="rawName" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Nama Penerima Terbaca (OCR)
              </label>
              <input
                type="text"
                id="rawName"
                value={rawName}
                onChange={(e) => setRawName(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-600 transition-colors"
                required
              />
            </div>

            {/* Matching Employee Selector */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Hubungkan ke Karyawan
              </label>
              <div className="mt-1.5 relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Ketik nama karyawan..."
                  value={searchTerm}
                  onFocus={() => setShowDropdown(true)}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSelectedEmployeeId('');
                    setShowDropdown(true);
                  }}
                  className="block w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-8 text-sm text-slate-900 focus:border-indigo-600 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  <Search className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                </button>
              </div>

              {/* Autocomplete Dropdown */}
              {showDropdown && (
                <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg shadow-slate-100">
                  {filteredEmployees.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-400">Tidak ada karyawan ditemukan.</div>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setSelectedEmployeeId(emp.id);
                          setSearchTerm(emp.full_name);
                          setShowDropdown(false);
                        }}
                        className="flex w-full flex-col px-4 py-2 text-left hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-xs font-bold text-slate-800">{emp.full_name}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {emp.employee_id} &bull; {emp.department}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Courier & Tracking Number Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="courier" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Ekspedisi / Kurir
                </label>
                <input
                  type="text"
                  id="courier"
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-600 transition-colors"
                  required
                />
              </div>

              <div>
                <label htmlFor="trackingNumber" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Nomor Resi
                </label>
                <input
                  type="text"
                  id="trackingNumber"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-600 transition-colors"
                  required
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors active:scale-98"
            >
              Simpan Paket
            </button>
          </div>
        </form>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <CameraComponent
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
