'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Settings, CreditCard, LogOut, User, ChevronDown, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) setEmail(session.user.email);
    };
    getUser();
  }, [supabase.auth]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const initials = email ? email.charAt(0).toUpperCase() : 'U';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold hover:bg-indigo-200 transition-colors"
      >
        {initials}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-slate-100 bg-white shadow-xl shadow-slate-200/50 py-1.5 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">{email || 'Akun'}</p>
                  <p className="text-[10px] text-slate-400">Admin</p>
                </div>
              </div>
            </div>
            <div className="py-1">
              <Link
                href="/billing"
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                Langganan & Pembayaran
              </Link>
              <Link
                href="/employees"
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User className="h-3.5 w-3.5 text-slate-400" />
                Kelola Karyawan
              </Link>
            </div>
            <div className="border-t border-slate-100 pt-1">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Keluar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
