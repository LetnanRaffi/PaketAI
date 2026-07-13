'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  X,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ScanItem {
  id: string;
  imageData: string;
  previewUrl: string;
  result: ScanResult | null;
  status: 'pending' | 'scanning' | 'done' | 'error';
  error?: string;
  // Editable fields
  rawName: string;
  courier: string;
  trackingNumber: string;
  confidence: number;
  selectedEmployeeId: string;
  searchTerm: string;
  showDropdown: boolean;
}

export default function ScanPackage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);

  // Phase: collect | processing | review
  const [phase, setPhase] = useState<'collect' | 'processing' | 'review'>('collect');
  const [showCamera, setShowCamera] = useState(false);

  // Batch scan state
  const [scanItems, setScanItems] = useState<ScanItem[]>([]);
  const [currentScanIndex, setCurrentScanIndex] = useState(0);
  const [estimatedTimePerScan, setEstimatedTimePerScan] = useState(0);

  // Overall error
  const [batchError, setBatchError] = useState('');

  useEffect(() => {
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

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 1024;
          let { width, height } = img;

          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            } else {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const makeItems = (images: string[]): ScanItem[] =>
    images.map((img, i) => ({
      id: `scan-${Date.now()}-${i}`,
      imageData: img,
      previewUrl: img,
      result: null,
      status: 'pending' as const,
      rawName: '',
      courier: '',
      trackingNumber: '',
      confidence: 0,
      selectedEmployeeId: '',
      searchTerm: '',
      showDropdown: false,
    }));

  // Called when camera returns multiple photos
  const handleCameraMultiple = useCallback(async (images: string[]) => {
    setShowCamera(false);
    if (images.length === 0) return;

    const items = makeItems(images);
    setScanItems(items);
    setPhase('processing');
    setCurrentScanIndex(0);

  }, []);

  // Called when camera returns single photo (fallback)
  const handleCameraSingle = useCallback(async (imageData: string) => {
    setShowCamera(false);
    const items = makeItems([imageData]);
    setScanItems(items);
    setPhase('processing');
    setCurrentScanIndex(0);

  }, []);

  // Called when files are selected from gallery
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const images: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const compressed = await compressImage(files[i]);
      images.push(compressed);
    }

    const items = makeItems(images);
    setScanItems(items);
    setPhase('processing');
    setCurrentScanIndex(0);


    // Reset the input so the same files can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Run batch scan sequentially — triggered when phase changes to 'processing'
  const startBatchScan = useCallback(
    async (items: ScanItem[]) => {
      const startTime = Date.now();
      let avgPerScan = 0;

      for (let i = 0; i < items.length; i++) {
        setCurrentScanIndex(i);
        setScanItems(prev =>
          prev.map((it, idx) => (idx === i ? { ...it, status: 'scanning' } : it))
        );

        try {
          const res = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: items[i].imageData }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Gagal scan');

          setScanItems(prev =>
            prev.map((it, idx) => {
              if (idx !== i) return it;
              return {
                ...it,
                status: 'done',
                result: data,
                previewUrl: data.receipt_image_url || it.previewUrl,
                rawName: data.recipient_name_raw || '',
                courier: data.courier || '',
                trackingNumber: data.tracking_number || '',
                confidence: data.match_confidence || 0,
                selectedEmployeeId: data.matched_employee_id || '',
                searchTerm: data.matched_employee_name || '',
              };
            })
          );

          const elapsed = Date.now() - startTime;
          avgPerScan = elapsed / (i + 1);
          setEstimatedTimePerScan(avgPerScan);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan';
          setScanItems(prev =>
            prev.map((it, idx) =>
              idx === i ? { ...it, status: 'error', error: errMsg } : it
            )
          );
        }
      }

      setPhase('review');
    },
    []
  );

  // Trigger batch scan when phase changes
  const phaseRef = useRef(phase);
  useEffect(() => {
    if (phase === 'processing' && phaseRef.current !== 'processing') {
      startBatchScan(scanItems);
    }
    phaseRef.current = phase;
  }, [phase, scanItems, startBatchScan]);

  // Calculate ETA
  const remainingScans = scanItems.filter(it => it.status === 'pending' || it.status === 'scanning').length;
  const estimatedRemainingMs = remainingScans * estimatedTimePerScan;
  const etaSeconds = Math.max(0, Math.ceil(estimatedRemainingMs / 1000));
  const completedCount = scanItems.filter(it => it.status === 'done' || it.status === 'error').length;

  // Update a scan item's editable fields
  const updateItem = (index: number, updates: Partial<ScanItem>) => {
    setScanItems(prev => prev.map((it, i) => (i === index ? { ...it, ...updates } : it)));
  };

  const getFilteredEmployees = (searchTerm: string) =>
    employees.filter(
      emp =>
        emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Save all packages
  const handleSaveAll = async () => {
    let savedCount = 0;
    let failCount = 0;

    for (const item of scanItems) {
      if (!item.result) continue;
      try {
        const res = await fetch('/api/packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receipt_image_url: item.previewUrl,
            recipient_name_raw: item.rawName,
            employee_id: item.selectedEmployeeId || null,
            match_confidence: item.confidence,
            tracking_number: item.trackingNumber,
            courier: item.courier,
          }),
        });
        if (res.ok) savedCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    if (failCount > 0) {
      alert(`${savedCount} paket tersimpan, ${failCount} gagal.`);
    }
    router.push('/packages');
  };

  const resetAll = () => {
    setScanItems([]);
    setCurrentScanIndex(0);
    setPhase('collect');
    setBatchError('');
    setEstimatedTimePerScan(0);
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => (phase === 'collect' ? router.push('/') : resetAll())}
          className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Scan Resi Paket</h1>
          <p className="text-xs text-slate-500 font-medium">
            {phase === 'collect' && 'Foto semua resi lalu scan sekaligus'}
            {phase === 'processing' && `Scan ${completedCount}/${scanItems.length} resi`}
            {phase === 'review' && 'Review hasil sebelum disimpan'}
          </p>
        </div>
      </div>

      {batchError && (
        <div className="rounded-xl bg-red-50 p-4 border border-red-100">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-bold">Error</span>
          </div>
          <p className="text-xs text-red-500">{batchError}</p>
          <button onClick={resetAll} className="mt-2 text-xs font-semibold text-red-600 underline">
            Coba Lagi
          </button>
        </div>
      )}

      {/* ==================== COLLECT PHASE ==================== */}
      {phase === 'collect' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pilih Metode Input
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowCamera(true)}
                className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 hover:bg-slate-50 active:scale-95 transition-all text-center group cursor-pointer"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3 group-hover:scale-105 transition-transform">
                  <Camera className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-slate-800">Kamera Hp</span>
                <span className="text-[10px] text-slate-400 mt-1">Foto beberapa resi</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 hover:bg-slate-50 active:scale-95 transition-all text-center group cursor-pointer"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600 mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-slate-800">Galeri Foto</span>
                <span className="text-[10px] text-slate-400 mt-1">Pilih beberapa foto</span>
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFilesSelected}
              accept="image/*"
              multiple
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* ==================== PROCESSING PHASE ==================== */}
      {phase === 'processing' && (
        <div className="space-y-5">
          {/* Overall progress */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Memproses Resi
              </span>
              <span className="text-xs font-bold text-indigo-600">
                {completedCount}/{scanItems.length}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(completedCount / scanItems.length) * 100}%` }}
              />
            </div>

            {/* ETA */}
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Clock className="h-3 w-3" />
                <span>
                  {remainingScans > 0
                    ? `Sisa ~${etaSeconds} detik`
                    : 'Selesai!'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>
                  {scanItems[currentScanIndex]?.status === 'scanning'
                    ? `Scan resi ${currentScanIndex + 1}...`
                    : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Per-item status list */}
          <div className="space-y-2">
            {scanItems.map((item, i) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                  i === currentScanIndex && item.status === 'scanning'
                    ? 'border-indigo-200 bg-indigo-50/50'
                    : item.status === 'done'
                    ? 'border-green-100 bg-green-50/30'
                    : item.status === 'error'
                    ? 'border-red-100 bg-red-50/30'
                    : 'border-slate-100 bg-slate-50/30'
                }`}
              >
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt={`Resi ${i + 1}`}
                  className="h-12 w-12 rounded-lg object-cover border border-slate-200"
                />

                {/* Status */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700">Resi {i + 1}</p>
                  {item.status === 'pending' && (
                    <p className="text-[10px] text-slate-400">Menunggu...</p>
                  )}
                  {item.status === 'scanning' && (
                    <p className="text-[10px] text-indigo-500 font-semibold">Sedang di-scan...</p>
                  )}
                  {item.status === 'done' && item.result && (
                    <p className="text-[10px] text-green-600 font-semibold truncate">
                      {item.result.recipient_name_raw} — {item.result.courier}
                    </p>
                  )}
                  {item.status === 'error' && (
                    <p className="text-[10px] text-red-500 font-semibold truncate">{item.error}</p>
                  )}
                </div>

                {/* Icon */}
                <div className="shrink-0">
                  {item.status === 'done' && (
                    <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="h-3 w-3 text-green-600" />
                    </div>
                  )}
                  {item.status === 'error' && (
                    <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center">
                      <X className="h-3 w-3 text-red-600" />
                    </div>
                  )}
                  {item.status === 'scanning' && (
                    <RefreshCw className="h-4 w-4 text-indigo-500 animate-spin" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== REVIEW PHASE ==================== */}
      {phase === 'review' && (
        <div className="space-y-4 pb-8">
          {/* Summary */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-700">
                {scanItems.filter(it => it.status === 'done').length} resi berhasil di-scan
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Review & edit sebelum disimpan
              </p>
            </div>
            <button
              onClick={() => {
                setPhase('collect');
                setScanItems([]);
              }}
              className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Scan Ulang
            </button>
          </div>

          {/* Result cards */}
          {scanItems.map((item, i) => (
            <ReviewCard
              key={item.id}
              item={item}
              index={i}
              getFilteredEmployees={getFilteredEmployees}
              onUpdate={(updates) => updateItem(i, updates)}
            />
          ))}

          {/* Save all button */}
          <button
            onClick={handleSaveAll}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 transition-colors active:scale-[0.98]"
          >
            Simpan Semua Paket ({scanItems.filter(it => it.status === 'done').length})
          </button>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <CameraComponent
          onCapture={handleCameraSingle}
          onClose={() => setShowCamera(false)}
          multiMode
          onCaptureMultiple={handleCameraMultiple}
        />
      )}
    </div>
  );
}

/* ==================== REVIEW CARD COMPONENT ==================== */

function ReviewCard({
  item,
  index,
  getFilteredEmployees,
  onUpdate,
}: {
  item: ScanItem;
  index: number;
  getFilteredEmployees: (term: string) => Employee[];
  onUpdate: (updates: Partial<ScanItem>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const filteredEmployees = getFilteredEmployees(item.searchTerm);

  if (item.status !== 'done' && item.status !== 'error') return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 transition-colors"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.previewUrl}
          alt={`Resi ${index + 1}`}
          className="h-14 w-14 rounded-xl object-cover border border-slate-200"
        />
        <div className="flex-1 min-w-0">
          {item.status === 'error' ? (
            <>
              <p className="text-xs font-bold text-red-600">Gagal Scan</p>
              <p className="text-[10px] text-red-400 truncate">{item.error}</p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold text-slate-800 truncate">
                {item.rawName || 'Tanpa nama'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-400">{item.courier}</span>
                {item.selectedEmployeeId && (
                  <span className="text-[9px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.2 rounded-full">
                    Cocok
                  </span>
                )}
                {!item.selectedEmployeeId && item.rawName && (
                  <span className="text-[9px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.2 rounded-full">
                    Perlu Koreksi
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        <div className="shrink-0 text-slate-400">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded form */}
      {expanded && item.status === 'done' && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
          {/* Confidence banner */}
          <div className="pt-3">
            {item.confidence >= 0.8 ? (
              <div className="rounded-lg bg-green-50 p-2.5 border border-green-100 flex items-center gap-2">
                <Check className="h-3 w-3 text-green-600 shrink-0" />
                <span className="text-[10px] font-bold text-green-800">
                  Karyawan Cocok Otomatis ({(item.confidence * 100).toFixed(0)}%)
                </span>
              </div>
            ) : (
              <div className="rounded-lg bg-amber-50 p-2.5 border border-amber-100 flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                <span className="text-[10px] font-bold text-amber-800">
                  {item.confidence > 0
                    ? `Akurasi Rendah (${(item.confidence * 100).toFixed(0)}%) — Koreksi manual`
                    : 'Tidak ada match — Pilih karyawan'}
                </span>
              </div>
            )}
          </div>

          {/* OCR name */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              Nama Penerima (OCR)
            </label>
            <input
              type="text"
              value={item.rawName}
              onChange={(e) => onUpdate({ rawName: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs text-slate-900 focus:border-indigo-600 transition-colors"
            />
          </div>

          {/* Employee selector */}
          <div className="relative">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              Hubungkan ke Karyawan
            </label>
            <div className="mt-1 relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <User className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Ketik nama karyawan..."
                value={item.searchTerm}
                onFocus={() => onUpdate({ showDropdown: true })}
                onChange={(e) => {
                  onUpdate({ searchTerm: e.target.value, selectedEmployeeId: '', showDropdown: true });
                }}
                className="block w-full rounded-lg border border-slate-200 py-2 pl-9 pr-8 text-xs text-slate-900 focus:border-indigo-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => onUpdate({ showDropdown: !item.showDropdown })}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                <Search className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {item.showDropdown && (
              <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {filteredEmployees.length === 0 ? (
                  <div className="px-4 py-2 text-[10px] text-slate-400">Tidak ditemukan.</div>
                ) : (
                  filteredEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        onUpdate({
                          selectedEmployeeId: emp.id,
                          searchTerm: emp.full_name,
                          showDropdown: false,
                        });
                      }}
                      className="flex w-full flex-col px-3 py-1.5 text-left hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-[11px] font-bold text-slate-800">{emp.full_name}</span>
                      <span className="text-[9px] text-slate-400">
                        {emp.employee_id} &bull; {emp.department}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Courier & Tracking */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                Kurir
              </label>
              <input
                type="text"
                value={item.courier}
                onChange={(e) => onUpdate({ courier: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs text-slate-900 focus:border-indigo-600 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                No. Resi
              </label>
              <input
                type="text"
                value={item.trackingNumber}
                onChange={(e) => onUpdate({ trackingNumber: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-200 py-2 px-3 text-xs text-slate-900 focus:border-indigo-600 transition-colors"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
