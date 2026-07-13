'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
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

      if (!res.ok) {
        let errorMsg = 'Gagal login. Periksa kredensial Anda.';
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
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
          {/* Brand */}
          <div className="flex flex-col items-center text-center">
            <img src="/logo.png" alt="PaketAI Logo" className="h-12 w-12 rounded-xl object-contain shadow-[0_4px_20px_rgba(82,213,255,0.3)]" />
            <h2 className="mt-6 text-2xl font-bold tracking-tight text-on-surface font-display">
              PaketAI
            </h2>
            <p className="mt-1 text-sm text-on-surface-muted">
              Sistem Mailroom Cerdas & Otomatis
            </p>
          </div>

        {/* Login Card */}
        <div className="mt-8 bg-surface-elevated px-4 py-8 border border-outline-variant/20 rounded-2xl sm:px-6">
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="rounded-lg bg-error-container/15 p-3 text-xs text-error flex items-start gap-2 border border-error/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-on-surface-muted label-caps">
                Email Admin
              </label>
              <div className="mt-1.5 relative rounded-lg">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-on-surface-muted" />
                </div>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-outline-variant/40 bg-surface-highest py-2.5 pl-10 pr-3 text-sm text-on-surface placeholder-on-surface-muted/60 focus:border-primary focus:bg-surface-highest transition-colors"
                  placeholder="nama@perusahaan.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-on-surface-muted label-caps">
                Kata Sandi
              </label>
              <div className="mt-1.5 relative rounded-lg">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-on-surface-muted" />
                </div>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-outline-variant/40 bg-surface-highest py-2.5 pl-10 pr-3 text-sm text-on-surface placeholder-on-surface-muted/60 focus:border-primary focus:bg-surface-highest transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 px-4 text-sm font-semibold text-on-primary shadow-[0_4px_20px_rgba(82,213,255,0.25)] hover:brightness-110 focus:outline-none transition-all active:scale-[0.98] font-display"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
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
        <p className="mt-6 text-center text-xs text-on-surface-muted">
          Belum punya akun?{' '}
          <Link href="/register" className="font-semibold text-primary hover:text-primary/80">
            Daftar Gratis
          </Link>
        </p>
      </div>
    </div>
  );
}
