'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Upload, ArrowRight, CheckCircle2, Building2, Camera, ArrowLeft, Sparkles, Zap } from 'lucide-react';

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  useEffect(() => {
    document.cookie = 'paketai_onboarded=1; path=/; max-age=31536000';
  }, []);
  const [selectedPlan, setSelectedPlan] = useState<'trial' | 'pro'>('trial');
  const [employees, setEmployees] = useState<Array<{ full_name: string; department: string; phone_number: string }>>([]);
  const [csvInput, setCsvInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  const handleImportCSV = () => {
    if (!csvInput.trim()) return;
    setImporting(true);
    const lines = csvInput.trim().split('\n');
    const parsed = lines
      .slice(1)
      .filter((l) => l.trim())
      .map((line) => {
        const [full_name, department, phone_number] = line.split(',').map((s) => s.trim());
        return { full_name: full_name || '', department: department || '', phone_number: phone_number || '' };
      })
      .filter((e) => e.full_name);
    setEmployees(parsed);
    setImporting(false);
    if (parsed.length > 0) setStep(3);
  };

  const handleSaveEmployees = async () => {
    if (employees.length === 0) return;
    setImporting(true);
    try {
      const csvText = 'Nama,Departemen,Telepon\n' + employees
        .map((e) => `${e.full_name},${e.department},${e.phone_number}`)
        .join('\n');
      const res = await fetch('/api/employees/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });
      if (res.ok) setImported(true);
    } catch { /* continue */ }
    setStep(4);
    setImporting(false);
  };

  const handlePlanNext = () => {
    if (selectedPlan === 'pro') {
      router.push('/billing');
    } else {
      setStep(2);
    }
  };

  return (
    <div className="flex flex-1 flex-col py-8 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-sm">
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-1 text-xs font-semibold text-on-surface-muted hover:text-on-surface mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali
          </button>
        )}

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${
                (step === 4 ? 3 : step) >= s ? 'bg-primary' : 'bg-outline-variant/40'
              }`} />
            </div>
          ))}
        </div>

        {/* Step 1: Pilih Plan */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-on-primary mx-auto shadow-[0_4px_20px_rgba(82,213,255,0.25)]">
                <Building2 className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-on-surface font-display">Selamat Datang di PaketAI!</h2>
              <p className="mt-2 text-sm text-on-surface-muted">
                Pilih paket yang sesuai untuk tim Anda.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setSelectedPlan('trial')}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                  selectedPlan === 'trial'
                    ? 'border-primary bg-primary/10 shadow-[0_4px_20px_rgba(82,213,255,0.1)]'
                    : 'border-outline-variant/30 bg-surface-elevated hover:border-outline-variant/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    selectedPlan === 'trial' ? 'bg-primary text-on-primary' : 'bg-surface-highest text-on-surface-muted'
                  }`}>
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-on-surface">Trial Gratis</p>
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                        7 HARI
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-on-surface-muted">
                      Coba semua fitur premium gratis selama 7 hari. Tanpa kartu kredit.
                    </p>
                    <p className="mt-2 text-lg font-bold text-primary font-display">Rp0</p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === 'trial' ? 'border-primary bg-primary' : 'border-outline-variant'
                  }`}>
                    {selectedPlan === 'trial' && <div className="h-2 w-2 rounded-full bg-on-primary" />}
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedPlan('pro')}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                  selectedPlan === 'pro'
                    ? 'border-tertiary bg-tertiary/10 shadow-[0_4px_20px_rgba(255,184,114,0.1)]'
                    : 'border-outline-variant/30 bg-surface-elevated hover:border-outline-variant/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    selectedPlan === 'pro' ? 'bg-tertiary text-on-tertiary' : 'bg-surface-highest text-on-surface-muted'
                  }`}>
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-on-surface">Pro Bulanan</p>
                      <span className="rounded-full bg-tertiary/15 px-2 py-0.5 text-[10px] font-bold text-tertiary">
                        POPULER
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-on-surface-muted">
                      Akses penuh semua fitur. Bayar bulanan via QRIS.
                    </p>
                    <p className="mt-2 text-lg font-bold text-tertiary font-display">Rp159.000<span className="text-xs font-normal text-on-surface-muted">/bulan</span></p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === 'pro' ? 'border-tertiary bg-tertiary' : 'border-outline-variant'
                  }`}>
                    {selectedPlan === 'pro' && <div className="h-2 w-2 rounded-full bg-on-tertiary" />}
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={handlePlanNext}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 px-4 text-sm font-semibold text-on-primary shadow-[0_4px_20px_rgba(82,213,255,0.25)] hover:brightness-110 transition-all active:scale-[0.98] font-display"
            >
              {selectedPlan === 'trial' ? (
                <>
                  <span>Mulai Trial Gratis</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Bayar & Aktifkan Pro</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 2: Import Karyawan */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-highest text-on-surface-variant mx-auto">
                <Users className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-on-surface font-display">Import Karyawan</h2>
              <p className="mt-2 text-sm text-on-surface-muted">
                Paste data CSV untuk import karyawan sekaligus.
              </p>
              <code className="mt-1 inline-block text-[10px] bg-surface-highest px-2 py-1 rounded font-mono text-on-surface-muted">
                Nama,Departemen,Telepon
              </code>
            </div>

            <textarea
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              className="w-full rounded-xl border border-outline-variant/40 bg-surface-highest p-3 text-xs font-mono text-on-surface placeholder-on-surface-muted/60 focus:border-primary h-40 resize-none transition-colors"
              placeholder={'Nama,Departemen,Telepon\nBudi Santoso,HRD,081234567890\nSiti Rahmawati,Finance,081298765432'}
            />

            {employees.length > 0 && (
              <div className="bg-success-container/15 rounded-xl p-3 border border-success/20">
                <p className="text-xs font-semibold text-success">
                  {employees.length} karyawan siap diimport
                </p>
              </div>
            )}

            <button
              onClick={employees.length === 0 ? handleImportCSV : handleSaveEmployees}
              disabled={!csvInput.trim() || importing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary shadow-[0_4px_20px_rgba(82,213,255,0.25)] hover:brightness-110 disabled:opacity-50 transition-all active:scale-[0.98] font-display"
            >
              {importing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                  <span>Memproses...</span>
                </>
              ) : employees.length === 0 ? (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Parse CSV</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Simpan & Lanjut</span>
                </>
              )}
            </button>

            <button
              onClick={() => setStep(4)}
              className="w-full text-center text-xs text-on-surface-muted hover:text-on-surface"
            >
              Lewati, import nanti saja
            </button>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-highest text-on-surface-variant mx-auto">
                <Users className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-on-surface font-display">{employees.length} Karyawan Ditemukan</h2>
              <p className="mt-2 text-sm text-on-surface-muted">Preview data sebelum disimpan.</p>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-outline-variant/30 divide-y divide-outline-variant/20">
              {employees.map((e, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-on-surface">{e.full_name}</p>
                    <p className="text-[10px] text-on-surface-muted">{e.department} {e.phone_number && `\u2022 ${e.phone_number}`}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveEmployees}
              disabled={importing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary shadow-[0_4px_20px_rgba(82,213,255,0.25)] hover:brightness-110 disabled:opacity-50 transition-all active:scale-[0.98] font-display"
            >
              {importing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Semua</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 4: Done */}
        {(step === 4 || (step === 3 && imported)) && (
          <div className="space-y-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-on-surface font-display">Semua Siap!</h2>
              <p className="mt-2 text-sm text-on-surface-muted">
                {imported
                  ? `${employees.length} karyawan sudah diimport. Mulai scan resi paket sekarang.`
                  : 'Anda bisa mulai scan resi paket atau import karyawan nanti dari menu Karyawan.'}
              </p>
            </div>
            <div className="space-y-3">
              <Link
                href="/scan"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 px-4 text-sm font-semibold text-on-primary shadow-[0_4px_20px_rgba(82,213,255,0.25)] hover:brightness-110 active:scale-[0.98] transition-all font-display"
              >
                <Camera className="h-4 w-4" />
                <span>Mulai Scan Resi</span>
              </Link>
              <Link
                href="/"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/30 py-3 px-4 text-sm font-semibold text-on-surface-variant hover:bg-surface-hover active:scale-[0.98] transition-all"
              >
                Kembali ke Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
