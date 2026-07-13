import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/api/auth'];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          if (headers) {
            Object.entries(headers).forEach(([key, value]) =>
              supabaseResponse.headers.set(key, value)
            );
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Redirect unauthenticated users to login
  if (
    !user &&
    !PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login only
  // (allow /register so users can always create new accounts)
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // For authenticated users: check org status for billing gate
  if (user) {
    let orgId: string | null = null;
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single();
      orgId = userData?.org_id ?? null;
    } catch {
      // users table may not exist yet (migration pending)
    }

    if (orgId) {
      let org: { plan: string; trial_ends_at: string } | null = null;
      try {
        const result = await supabase
          .from('organizations')
          .select('plan, trial_ends_at')
          .eq('id', orgId)
          .single();
        org = result.data;
      } catch {
        // organizations table may not exist yet
      }

      if (org) {
        // Check if trial has ended
        const isTrialEnded =
          org.plan === 'trial' && new Date(org.trial_ends_at) <= new Date();
        const isExpired =
          org.plan === 'expired' || org.plan === 'cancelled' || isTrialEnded;

        if (isExpired) {
          // Allow billing and auth paths, block everything else
          const allowed = [
            '/login',
            '/register',
            '/billing',
            '/api/auth',
            '/api/billing',
            '/onboarding',
          ];
          const isAllowed = allowed.some(
            (p) => pathname === p || pathname.startsWith(p + '/')
          );

          if (!isAllowed) {
            const url = request.nextUrl.clone();
            url.pathname = '/billing';
            return NextResponse.redirect(url);
          }
        }

        // Redirect to onboarding only once (use cookie to prevent loops)
        if (
          org.plan === 'trial' &&
          !pathname.startsWith('/onboarding') &&
          !pathname.startsWith('/api') &&
          !PUBLIC_PATHS.some((p) => pathname.startsWith(p))
        ) {
          const hasOnboarded = request.cookies.get('paketai_onboarded')?.value === '1';
          if (!hasOnboarded) {
            let count = 0;
            try {
              const result = await supabase
                .from('employees')
                .select('id', { count: 'exact', head: true })
                .eq('org_id', orgId);
              count = result.count ?? 0;
            } catch {
              // employees table may not exist yet
            }
            if (count === 0) {
              const url = request.nextUrl.clone();
              url.pathname = '/onboarding';
              return NextResponse.redirect(url);
            }
          }
        }
      }
    }
  }

  return supabaseResponse;
}
