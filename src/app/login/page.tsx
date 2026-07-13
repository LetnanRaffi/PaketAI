'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';


export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal login. Periksa kredensial Anda.');
      }

      window.location.href = '/';
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Gagal login. Periksa kredensial Anda.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-sm">
        {/* Brand / Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/10">
            <span className="text-xl font-bold tracking-wider">P</span>
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
            PaketAI
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Sistem Mailroom Cerdas & Otomatis
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-8 bg-white px-4 py-8 border border-slate-100 rounded-2xl shadow-sm sm:px-6">
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 flex items-start gap-2 border border-red-100">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Email Admin
              </label>
              <div className="mt-1.5 relative rounded-md shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-950 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:ring-0 transition-colors"
                  placeholder="nama@perusahaan.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Kata Sandi
                </label>
              </div>
              <div className="mt-1.5 relative rounded-md shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  name="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-950 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:ring-0 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none transition-colors active:scale-98"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Masuk Ke Dashboard</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Versi 1.0 (Core MVP) &bull; PaketAI
        </p>
      </div>
    </div>
  );
}
