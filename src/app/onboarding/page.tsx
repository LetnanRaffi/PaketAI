'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Upload, ArrowRight, CheckCircle2, Building2, Camera, ArrowLeft, Sparkles, Zap } from 'lucide-react';

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
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
        {/* Back button */}
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 mb-6"
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
                (step === 4 ? 3 : step) >= s ? 'bg-indigo-600' : 'bg-slate-200'
              }`} />
            </div>
          ))}
        </div>

        {/* Step 1: Pilih Plan */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white mx-auto shadow-md shadow-indigo-600/10">
                <Building2 className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">Selamat Datang di PaketAI!</h2>
              <p className="mt-2 text-sm text-slate-500">
                Pilih paket yang sesuai untuk tim Anda.
              </p>
            </div>

            {/* Plan Cards */}
            <div className="space-y-3">
              {/* Trial Card */}
              <button
                onClick={() => setSelectedPlan('trial')}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                  selectedPlan === 'trial'
                    ? 'border-indigo-600 bg-indigo-50 shadow-md shadow-indigo-600/10'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    selectedPlan === 'trial' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">Trial Gratis</p>
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                        7 HARI
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Coba semua fitur premium gratis selama 7 hari. Tanpa kartu kredit.
                    </p>
                    <p className="mt-2 text-lg font-bold text-indigo-600">Rp0</p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === 'trial' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                  }`}>
                    {selectedPlan === 'trial' && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                </div>
              </button>

              {/* Pro Card */}
              <button
                onClick={() => setSelectedPlan('pro')}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                  selectedPlan === 'pro'
                    ? 'border-green-600 bg-green-50 shadow-md shadow-green-600/10'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    selectedPlan === 'pro' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">Pro Bulanan</p>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                        POPULER
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Akses penuh semua fitur. Bayar bulanan via QRIS.
                    </p>
                    <p className="mt-2 text-lg font-bold text-green-600">Rp159.000<span className="text-xs font-normal text-slate-500">/bulan</span></p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === 'pro' ? 'border-green-600 bg-green-600' : 'border-slate-300'
                  }`}>
                    {selectedPlan === 'pro' && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={handlePlanNext}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors active:scale-98"
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
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 mx-auto">
                <Users className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">Import Karyawan</h2>
              <p className="mt-2 text-sm text-slate-500">
                Paste data CSV untuk import karyawan sekaligus.
              </p>
              <code className="mt-1 inline-block text-[10px] bg-slate-100 px-2 py-1 rounded font-mono text-slate-600">
                Nama,Departemen,Telepon
              </code>
            </div>

            <textarea
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:ring-0 h-40 resize-none"
              placeholder={'Nama,Departemen,Telepon\nBudi Santoso,HRD,081234567890\nSiti Rahmawati,Finance,081298765432'}
            />

            {employees.length > 0 && (
              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                <p className="text-xs font-semibold text-green-800">
                  {employees.length} karyawan siap diimport
                </p>
              </div>
            )}

            <button
              onClick={employees.length === 0 ? handleImportCSV : handleSaveEmployees}
              disabled={!csvInput.trim() || importing}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors active:scale-98"
            >
              {importing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600"
            >
              Lewati, import nanti saja
            </button>
          </div>
        )}

        {/* Step 3: Preview parsed employees */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 mx-auto">
                <Users className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">{employees.length} Karyawan Ditemukan</h2>
              <p className="mt-2 text-sm text-slate-500">Preview data sebelum disimpan.</p>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
              {employees.map((e, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{e.full_name}</p>
                    <p className="text-[10px] text-slate-400">{e.department} {e.phone_number && `\u2022 ${e.phone_number}`}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveEmployees}
              disabled={importing}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors active:scale-98"
            >
              {importing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Simpan Semua</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 4: Done */}
        {(step === 4 || (step === 3 && imported)) && (
          <div className="space-y-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Semua Siap!</h2>
              <p className="mt-2 text-sm text-slate-500">
                {imported
                  ? `${employees.length} karyawan sudah diimport. Mulai scan resi paket sekarang.`
                  : 'Anda bisa mulai scan resi paket atau import karyawan nanti dari menu Karyawan.'}
              </p>
            </div>
            <div className="space-y-3">
              <Link
                href="/scan"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 active:scale-98 transition-colors"
              >
                <Camera className="h-4 w-4" />
                <span>Mulai Scan Resi</span>
              </Link>
              <Link
                href="/"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-98 transition-colors"
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
