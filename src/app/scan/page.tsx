'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Employee, ScanResult } from '@/lib/types';
import CameraComponent from '@/app/components/CameraComponent';
import {
  Camera, Upload, RefreshCw, Check, AlertTriangle, Search, User, ArrowLeft, X, Clock, ChevronDown, ChevronUp,
} from 'lucide-react';

interface ScanItem {
  id: string;
  imageData: string;
  previewUrl: string;
  result: ScanResult | null;
  status: 'pending' | 'scanning' | 'done' | 'error';
  error?: string;
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
  const [phase, setPhase] = useState<'collect' | 'processing' | 'review'>('collect');
  const [showCamera, setShowCamera] = useState(false);
  const [scanItems, setScanItems] = useState<ScanItem[]>([]);
  const [estimatedTimePerScan, setEstimatedTimePerScan] = useState(0);
  const [batchError, setBatchError] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch('/api/employees');
        if (res.ok) setEmployees(await res.json());
      } catch (err) { console.error('Failed to fetch employees', err); }
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
          const MAX_SIZE = 800;
          let { width, height } = img;
          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) { height = Math.round((height * MAX_SIZE) / width); width = MAX_SIZE; }
            else { width = Math.round((width * MAX_SIZE) / height); height = MAX_SIZE; }
          }
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const makeItems = (images: string[]): ScanItem[] =>
    images.map((img, i) => ({
      id: `scan-${Date.now()}-${i}`, imageData: img, previewUrl: img, result: null, status: 'pending' as const,
      rawName: '', courier: '', trackingNumber: '', confidence: 0, selectedEmployeeId: '', searchTerm: '', showDropdown: false,
    }));

  const handleCameraMultiple = useCallback(async (images: string[]) => {
    setShowCamera(false);
    if (images.length === 0) return;
    setScanItems(makeItems(images));
    setPhase('processing');
  }, []);

  const handleCameraSingle = useCallback(async (imageData: string) => {
    setShowCamera(false);
    setScanItems(makeItems([imageData]));
    setPhase('processing');
  }, []);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const images: string[] = [];
    for (let i = 0; i < files.length; i++) images.push(await compressImage(files[i]));
    setScanItems(makeItems(images));
    setPhase('processing');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startBatchScan = useCallback(async (items: ScanItem[]) => {
    const startTime = Date.now();
    setScanItems(prev => prev.map(it => ({ ...it, status: 'scanning' as const })));
    try {
      if (items.length === 1) {
        const res = await fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: items[0].imageData }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal scan');
        setScanItems(prev => prev.map(it => ({
          ...it, status: 'done', result: data, previewUrl: data.receipt_image_url || it.previewUrl,
          rawName: data.recipient_name_raw || '', courier: data.courier || '', trackingNumber: data.tracking_number || '',
          confidence: data.match_confidence || 0, selectedEmployeeId: data.matched_employee_id || '', searchTerm: data.matched_employee_name || '',
        })));
      } else {
        const res = await fetch('/api/scan-batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ images: items.map(it => it.imageData) }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal scan batch');
        const results = data.results as Array<{ receipt_image_url: string; recipient_name_raw: string; tracking_number: string; courier: string; matched_employee_name: string | null; matched_employee_id: string | null; match_confidence: number; }>;
        setScanItems(prev => prev.map((it, idx) => {
          const r = results[idx];
          if (!r) return { ...it, status: 'error', error: 'Hasil tidak ditemukan' };
          return { ...it, status: 'done', result: r, previewUrl: r.receipt_image_url || it.previewUrl, rawName: r.recipient_name_raw || '', courier: r.courier || '', trackingNumber: r.tracking_number || '', confidence: r.match_confidence || 0, selectedEmployeeId: r.matched_employee_id || '', searchTerm: r.matched_employee_name || '' };
        }));      }
      setEstimatedTimePerScan((Date.now() - startTime) / items.length);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setScanItems(prev => prev.map(it => (it.status === 'scanning' ? { ...it, status: 'error', error: errMsg } : it)));
    }
    setPhase('review');
  }, []);

  const phaseRef = useRef(phase);
  useEffect(() => {
    if (phase === 'processing' && phaseRef.current !== 'processing') startBatchScan(scanItems);
    phaseRef.current = phase;
  }, [phase, scanItems, startBatchScan]);

  const remainingScans = scanItems.filter(it => it.status === 'pending' || it.status === 'scanning').length;
  const etaSeconds = Math.max(0, Math.ceil(remainingScans * estimatedTimePerScan / 1000));
  const completedCount = scanItems.filter(it => it.status === 'done' || it.status === 'error').length;

  const updateItem = (index: number, updates: Partial<ScanItem>) => {
    setScanItems(prev => prev.map((it, i) => (i === index ? { ...it, ...updates } : it)));
  };

  const getFilteredEmployees = (searchTerm: string) =>
    employees.filter(emp => emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) || emp.phone_number?.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSaveAll = async () => {
    let savedCount = 0, failCount = 0;
    for (const item of scanItems) {
      if (!item.result) continue;
      try {
        const res = await fetch('/api/packages', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receipt_image_url: item.previewUrl, recipient_name_raw: item.rawName, employee_id: item.selectedEmployeeId || null, match_confidence: item.confidence, tracking_number: item.trackingNumber, courier: item.courier }),
        });
        if (res.ok) savedCount++; else failCount++;
      } catch { failCount++; }
    }
    if (failCount > 0) alert(`${savedCount} paket tersimpan, ${failCount} gagal.`);
    router.push('/packages');
  };

  const resetAll = () => { setScanItems([]); setPhase('collect'); setBatchError(''); setEstimatedTimePerScan(0); };

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => (phase === 'collect' ? router.push('/') : resetAll())} className="p-1 rounded-lg hover:bg-surface-hover transition-colors">
          <ArrowLeft className="h-5 w-5 text-on-surface-variant" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-on-surface font-display">Scan Resi Paket</h1>
          <p className="text-xs text-on-surface-muted font-medium">
            {phase === 'collect' && 'Foto semua resi lalu scan sekaligus'}
            {phase === 'processing' && `Scan ${completedCount}/${scanItems.length} resi`}
            {phase === 'review' && 'Review hasil sebelum disimpan'}
          </p>
        </div>
      </div>

      {batchError && (
        <div className="rounded-xl bg-error-container/15 p-4 border border-error/20">
          <div className="flex items-center gap-2 text-error mb-1">
            <AlertTriangle className="h-4 w-4" /><span className="text-sm font-bold">Error</span>
          </div>
          <p className="text-xs text-error/80">{batchError}</p>
          <button onClick={resetAll} className="mt-2 text-xs font-semibold text-error underline">Coba Lagi</button>
        </div>
      )}

      {/* COLLECT */}
      {phase === 'collect' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-muted label-caps">Pilih Metode Input</h2>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowCamera(true)}
                className="flex flex-col items-center justify-center rounded-2xl border border-outline-variant/30 bg-surface-elevated p-6 hover:bg-surface-hover active:scale-95 transition-all text-center group cursor-pointer">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary mb-3 group-hover:scale-105 transition-transform">
                  <Camera className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-on-surface">Kamera Hp</span>
                <span className="text-[10px] text-on-surface-muted mt-1">Foto beberapa resi</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border border-outline-variant/30 bg-surface-elevated p-6 hover:bg-surface-hover active:scale-95 transition-all text-center group cursor-pointer">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-highest text-on-surface-variant mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="h-6 w-6" />
                </div>
                <span className="text-xs font-bold text-on-surface">Galeri Foto</span>
                <span className="text-[10px] text-on-surface-muted mt-1">Pilih beberapa foto</span>
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFilesSelected} accept="image/*" multiple className="hidden" />
          </div>
        </div>
      )}

      {/* PROCESSING */}
      {phase === 'processing' && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-surface-elevated border border-outline-variant/20 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-muted label-caps">Memproses Resi</span>
              <span className="text-xs font-bold text-primary">{completedCount}/{scanItems.length}</span>
            </div>
            <div className="h-2 bg-surface-highest rounded-full overflow-hidden mb-3">
              <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out" style={{ width: `${(completedCount / scanItems.length) * 100}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-on-surface-muted">
                <Clock className="h-3 w-3" />
                <span>{remainingScans > 0 ? `Sisa ~${etaSeconds} detik` : 'Selesai!'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-on-surface-muted">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>{remainingScans > 0 ? 'AI sedang memproses...' : ''}</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {scanItems.map((item, i) => (
              <div key={item.id} className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                item.status === 'scanning' ? 'border-primary/30 bg-primary/5' :
                item.status === 'done' ? 'border-success/30 bg-success/5' :
                item.status === 'error' ? 'border-error/30 bg-error/5' :
                'border-outline-variant/20 bg-surface-elevated'
              }`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.previewUrl} alt={`Resi ${i + 1}`} className="h-12 w-12 rounded-lg object-cover border border-outline-variant/20" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-on-surface">Resi {i + 1}</p>
                  {item.status === 'pending' && <p className="text-[10px] text-on-surface-muted">Menunggu...</p>}
                  {item.status === 'scanning' && <p className="text-[10px] text-primary font-semibold">Sedang di-scan...</p>}
                  {item.status === 'done' && item.result && <p className="text-[10px] text-success font-semibold truncate">{item.result.recipient_name_raw} — {item.result.courier}</p>}
                  {item.status === 'error' && <p className="text-[10px] text-error font-semibold truncate">{item.error}</p>}
                </div>
                <div className="shrink-0">
                  {item.status === 'done' && <div className="h-6 w-6 rounded-full bg-success/15 flex items-center justify-center"><Check className="h-3 w-3 text-success" /></div>}
                  {item.status === 'error' && <div className="h-6 w-6 rounded-full bg-error/15 flex items-center justify-center"><X className="h-3 w-3 text-error" /></div>}
                  {item.status === 'scanning' && <RefreshCw className="h-4 w-4 text-primary animate-spin" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REVIEW */}
      {phase === 'review' && (
        <div className="space-y-4 pb-8">
          <div className="rounded-xl bg-surface-elevated border border-outline-variant/20 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-on-surface">{scanItems.filter(it => it.status === 'done').length} resi berhasil di-scan</p>
              <p className="text-[10px] text-on-surface-muted mt-0.5">Review & edit sebelum disimpan</p>
            </div>
            <button onClick={() => { setPhase('collect'); setScanItems([]); }}
              className="text-[10px] font-semibold text-primary hover:text-primary/80 flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />Scan Ulang
            </button>
          </div>
          {scanItems.map((item, i) => (
            <ReviewCard key={item.id} item={item} index={i} getFilteredEmployees={getFilteredEmployees} onUpdate={(updates) => updateItem(i, updates)} />
          ))}
          <button onClick={handleSaveAll}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-on-primary shadow-[0_4px_20px_rgba(82,213,255,0.25)] hover:brightness-110 transition-all active:scale-[0.98] font-display">
            Simpan Semua Paket ({scanItems.filter(it => it.status === 'done').length})
          </button>
        </div>
      )}

      {showCamera && <CameraComponent onCapture={handleCameraSingle} onClose={() => setShowCamera(false)} multiMode onCaptureMultiple={handleCameraMultiple} />}
    </div>
  );
}

/* REVIEW CARD */
function ReviewCard({ item, index, getFilteredEmployees, onUpdate }: {
  item: ScanItem; index: number; getFilteredEmployees: (term: string) => Employee[]; onUpdate: (updates: Partial<ScanItem>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const filteredEmployees = getFilteredEmployees(item.searchTerm);
  if (item.status !== 'done' && item.status !== 'error') return null;

  return (
    <div className="rounded-2xl border border-outline-variant/30 bg-surface-elevated overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-surface-hover/50 transition-colors">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.previewUrl} alt={`Resi ${index + 1}`} className="h-14 w-14 rounded-xl object-cover border border-outline-variant/20" />
        <div className="flex-1 min-w-0">
          {item.status === 'error' ? (
            <><p className="text-xs font-bold text-error">Gagal Scan</p><p className="text-[10px] text-error/70 truncate">{item.error}</p></>
          ) : (
            <>
              <p className="text-xs font-bold text-on-surface truncate">{item.rawName || 'Tanpa nama'}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-on-surface-muted">{item.courier}</span>
                {item.selectedEmployeeId && <span className="text-[9px] font-semibold bg-success/15 text-success px-1.5 py-0.2 rounded-full">Cocok</span>}
                {!item.selectedEmployeeId && item.rawName && <span className="text-[9px] font-semibold bg-tertiary/15 text-tertiary px-1.5 py-0.2 rounded-full">Perlu Koreksi</span>}
              </div>
            </>
          )}
        </div>
        <div className="shrink-0 text-on-surface-muted">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {expanded && item.status === 'done' && (
        <div className="px-4 pb-4 space-y-3 border-t border-outline-variant/20">
          <div className="pt-3">
            {item.confidence >= 0.8 ? (
              <div className="rounded-lg bg-success/10 p-2.5 border border-success/20 flex items-center gap-2">
                <Check className="h-3 w-3 text-success shrink-0" />
                <span className="text-[10px] font-bold text-success">Karyawan Cocok Otomatis ({(item.confidence * 100).toFixed(0)}%)</span>
              </div>
            ) : (
              <div className="rounded-lg bg-tertiary/10 p-2.5 border border-tertiary/20 flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-tertiary shrink-0" />
                <span className="text-[10px] font-bold text-tertiary">
                  {item.confidence > 0 ? `Akurasi Rendah (${(item.confidence * 100).toFixed(0)}%) — Koreksi manual` : 'Tidak ada match — Pilih karyawan'}
                </span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-on-surface-muted uppercase tracking-wide label-caps">Nama Penerima (OCR)</label>
            <input type="text" value={item.rawName} onChange={(e) => onUpdate({ rawName: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-outline-variant/40 bg-surface-highest py-2 px-3 text-xs text-on-surface placeholder-on-surface-muted/60 focus:border-primary transition-colors" />
          </div>
          <div className="relative">
            <label className="block text-[10px] font-semibold text-on-surface-muted uppercase tracking-wide label-caps">Hubungkan ke Karyawan</label>
            <div className="mt-1 relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <User className="h-3.5 w-3.5 text-on-surface-muted" />
              </div>
              <input type="text" placeholder="Ketik nama karyawan..." value={item.searchTerm}
                onFocus={() => onUpdate({ showDropdown: true })}
                onChange={(e) => onUpdate({ searchTerm: e.target.value, selectedEmployeeId: '', showDropdown: true })}
                className="block w-full rounded-lg border border-outline-variant/40 bg-surface-highest py-2 pl-9 pr-8 text-xs text-on-surface placeholder-on-surface-muted/60 focus:border-primary transition-colors" />
              <button type="button" onClick={() => onUpdate({ showDropdown: !item.showDropdown })} className="absolute inset-y-0 right-0 flex items-center pr-3">
                <Search className="h-3.5 w-3.5 text-on-surface-muted hover:text-on-surface-variant" />
              </button>
            </div>
            {item.showDropdown && (
              <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-outline-variant/30 bg-surface-elevated py-1 shadow-2xl shadow-black/40">
                {filteredEmployees.length === 0 ? (
                  <div className="px-4 py-2 text-[10px] text-on-surface-muted">Tidak ditemukan.</div>
                ) : (
                  filteredEmployees.map((emp) => (
                    <button key={emp.id} type="button" onClick={() => onUpdate({ selectedEmployeeId: emp.id, searchTerm: emp.full_name, showDropdown: false })}
                      className="flex w-full flex-col px-3 py-1.5 text-left hover:bg-surface-hover transition-colors">
                      <span className="text-[11px] font-bold text-on-surface">{emp.full_name}</span>
                      <span className="text-[9px] text-on-surface-muted">{emp.department || 'Tanpa Departemen'}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-on-surface-muted uppercase tracking-wide label-caps">Kurir</label>
              <input type="text" value={item.courier} onChange={(e) => onUpdate({ courier: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-outline-variant/40 bg-surface-highest py-2 px-3 text-xs text-on-surface placeholder-on-surface-muted/60 focus:border-primary transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-on-surface-muted uppercase tracking-wide label-caps">No. Resi</label>
              <input type="text" value={item.trackingNumber} onChange={(e) => onUpdate({ trackingNumber: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-outline-variant/40 bg-surface-highest py-2 px-3 text-xs text-on-surface placeholder-on-surface-muted/60 focus:border-primary transition-colors" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
