'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import BottomNav from './BottomNav';
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
      <div className="flex h-screen items-center justify-center bg-asphalt">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.png" alt="PaketAI Logo" className="h-10 w-10 rounded-xl object-contain" />
          <span className="text-sm font-medium text-on-surface-muted font-display">Memuat PaketAI...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-asphalt flex flex-col antialiased">
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-surface border-x border-outline-variant/30 pb-20">
        <main className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
          {children}
        </main>
        
        {!isLoginPage && isLoggedIn && <BottomNav />}
      </div>
    </div>
  );
}
