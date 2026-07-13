'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Building2, User, UserPlus, AlertCircle, MailCheck } from 'lucide-react';

export default function Register() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName || !email || !password || !orgName) {
      setError('Semua field wajib diisi.');
      return;
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ fullName, email, password, orgName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal mendaftar.');
      }

      setRegistered(true);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Gagal mendaftar.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-sm">
        {registered ? (
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
              <MailCheck className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-on-surface font-display">Cek Email Anda</h2>
              <p className="mt-2 text-sm text-on-surface-muted">
                Kami sudah mengirim link verifikasi ke <span className="font-semibold text-on-surface">{email}</span>.
                Buka email dan klik link verifikasi untuk mengaktifkan akun.
              </p>
            </div>
            <div className="bg-tertiary-container/15 rounded-xl p-4 border border-tertiary/20 w-full text-left">
              <p className="text-xs text-tertiary leading-relaxed">
                Setelah verifikasi, Anda akan diarahkan ke halaman login untuk masuk.
              </p>
            </div>
            <button
              onClick={() => { setRegistered(false); setFullName(''); setEmail(''); setPassword(''); setOrgName(''); }}
              className="text-sm font-semibold text-primary hover:text-primary/80"
            >
              Daftar akun lain
            </button>
          </div>
        ) : (
        <>
        <div className="flex flex-col items-center text-center">
          <img src="/logo.png" alt="PaketAI Logo" className="h-12 w-12 rounded-xl object-contain shadow-[0_4px_20px_rgba(82,213,255,0.3)]" />
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-on-surface font-display">
            Buat Akun PaketAI
          </h2>
          <p className="mt-1 text-sm text-on-surface-muted">
            Mulai kelola paket karyawan dalam 2 menit
          </p>
        </div>

        <div className="mt-8 bg-surface-elevated px-4 py-8 border border-outline-variant/20 rounded-2xl sm:px-6">
          <form className="space-y-4" onSubmit={handleRegister}>
            {error && (
              <div className="rounded-lg bg-error-container/15 p-3 text-xs text-error flex items-start gap-2 border border-error/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="fullName" className="block text-xs font-bold uppercase tracking-wider text-on-surface-muted label-caps">
                Nama Lengkap
              </label>
              <div className="mt-1.5 relative rounded-lg">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-4 w-4 text-on-surface-muted" />
                </div>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full rounded-lg border border-outline-variant/40 bg-surface-highest py-2.5 pl-10 pr-3 text-sm text-on-surface placeholder-on-surface-muted/60 focus:border-primary transition-colors"
                  placeholder="Budi Santoso"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="orgName" className="block text-xs font-bold uppercase tracking-wider text-on-surface-muted label-caps">
                Nama Perusahaan
              </label>
              <div className="mt-1.5 relative rounded-lg">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Building2 className="h-4 w-4 text-on-surface-muted" />
                </div>
                <input
                  type="text"
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="block w-full rounded-lg border border-outline-variant/40 bg-surface-highest py-2.5 pl-10 pr-3 text-sm text-on-surface placeholder-on-surface-muted/60 focus:border-primary transition-colors"
                  placeholder="PT Maju Jaya"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-on-surface-muted label-caps">
                Email
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
                  className="block w-full rounded-lg border border-outline-variant/40 bg-surface-highest py-2.5 pl-10 pr-3 text-sm text-on-surface placeholder-on-surface-muted/60 focus:border-primary transition-colors"
                  placeholder="budi@majujaya.com"
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
                  className="block w-full rounded-lg border border-outline-variant/40 bg-surface-highest py-2.5 pl-10 pr-3 text-sm text-on-surface placeholder-on-surface-muted/60 focus:border-primary transition-colors"
                  placeholder="Minimal 6 karakter"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 px-4 text-sm font-semibold text-on-primary shadow-[0_4px_20px_rgba(82,213,255,0.25)] hover:brightness-110 focus:outline-none transition-all active:scale-[0.98] disabled:opacity-50 font-display"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                  <span>Membuat akun...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Daftar Sekarang</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-on-surface-muted">
          Sudah punya akun?{' '}
          <Link href="/login" className="font-semibold text-primary hover:text-primary/80">
            Masuk
          </Link>
        </p>
        </>
        )}
      </div>
    </div>
  );
}
