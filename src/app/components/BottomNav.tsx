'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Camera, Inbox, Users, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Beranda', href: '/', icon: LayoutDashboard },
    { label: 'Paket', href: '/packages', icon: Inbox },
  ];

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
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

      <Link
        href="/employees"
        className={`flex flex-col items-center justify-center w-14 h-full transition-colors active:scale-95 duration-100 ${
          isActive('/employees') ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <Users className="h-5 w-5 mb-1" />
        <span className="text-[10px] font-medium tracking-wide">Karyawan</span>
      </Link>

      <Link
        href="/account"
        className={`flex flex-col items-center justify-center w-14 h-full transition-colors active:scale-95 duration-100 ${
          isActive('/account') ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <User className="h-5 w-5 mb-1" />
        <span className="text-[10px] font-medium tracking-wide">Akun</span>
      </Link>
    </nav>
  );
}
