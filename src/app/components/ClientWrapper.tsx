'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import BottomNav from './BottomNav';
import TopNav from './TopNav';
import { createClient } from '@/lib/supabase/client';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      
      // Auto redirect logic handled mostly by middleware, but client-side fast-refresh helps
      const publicPaths = ['/login', '/register'];
      if (!session && !publicPaths.includes(pathname)) {
        router.replace('/login');
      } else if (session && publicPaths.includes(pathname)) {
        router.replace('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router, supabase.auth]);

  const isLoginPage = pathname === '/login';
  
  if (loading && !isLoginPage) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-slate-500 font-sans">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <span className="text-sm font-medium">Memuat PaketAI...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Mobile Frame Container */}
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col border-x border-slate-100 bg-white shadow-2xl shadow-slate-200/50 pb-20">
        {/* Top right account nav */}
        {!isLoginPage && isLoggedIn && (
          <div className="absolute top-3 right-3 z-30">
            <TopNav />
          </div>
        )}
        <main className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
          {children}
        </main>
        
        {/* Only show navigation if logged in and not on login page */}
        {!isLoginPage && isLoggedIn && <BottomNav />}
      </div>
    </div>
  );
}
