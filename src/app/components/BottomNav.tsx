'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Camera, Inbox, Users, User, CreditCard, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showAccount, setShowAccount] = useState(false);
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
    setShowAccount(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { label: 'Beranda', href: '/', icon: LayoutDashboard },
    { label: 'Paket', href: '/packages', icon: Inbox },
  ];

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const initials = email ? email.charAt(0).toUpperCase() : 'U';

  return (
    <>
      {/* Account popup overlay */}
      {showAccount && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowAccount(false)} />
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-64 rounded-2xl border border-slate-100 bg-white shadow-2xl shadow-slate-300/50 py-2 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold">
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
                className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <CreditCard className="h-4 w-4 text-slate-400" />
                Langganan & Pembayaran
              </Link>
              <Link
                href="/employees"
                className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Users className="h-4 w-4 text-slate-400" />
                Kelola Karyawan
              </Link>
            </div>
            <div className="border-t border-slate-100 pt-1">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </button>
            </div>
          </div>
        </>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-30 mx-auto flex h-16 max-w-md items-center justify-around border-t border-slate-100 bg-white/95 px-2 backdrop-blur-md">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-14 h-full transition-colors active:scale-95 duration-100 ${
                active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </Link>
          );
        })}

        {/* Center camera button */}
        <Link
          href="/scan"
          className="group relative -top-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-transform active:scale-95 duration-100"
          aria-label="Scan Resi"
        >
          <Camera className="h-6 w-6 transition-transform group-hover:scale-110" />
        </Link>

        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return null;
        })}

        <Link
          href="/employees"
          className={`flex flex-col items-center justify-center w-14 h-full transition-colors active:scale-95 duration-100 ${
            isActive('/employees') ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Karyawan</span>
        </Link>

        {/* Account button */}
        <button
          onClick={() => setShowAccount(!showAccount)}
          className={`flex flex-col items-center justify-center w-14 h-full transition-colors active:scale-95 duration-100 ${
            showAccount ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-current text-white text-[10px] font-bold">
            {initials}
          </div>
          <span className="text-[10px] font-medium tracking-wide">Akun</span>
        </button>
      </nav>
    </>
  );
}
