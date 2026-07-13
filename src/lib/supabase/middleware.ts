import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/api/auth'];
const ONBOARDING_PATH = '/onboarding';

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

  // Redirect authenticated users away from login/register
  if (
    user &&
    (pathname === '/login' || pathname === '/register')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // For authenticated users: check org status for billing gate
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (userData?.org_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('plan, trial_ends_at')
        .eq('id', userData.org_id)
        .single();

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

        // Check if user needs onboarding (no org or first visit)
        if (
          org.plan === 'trial' &&
          !pathname.startsWith(ONBOARDING_PATH) &&
          !pathname.startsWith('/api') &&
          !PUBLIC_PATHS.some((p) => pathname.startsWith(p))
        ) {
          // Check if onboarding was completed (employees exist)
          const { count } = await supabase
            .from('employees')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', userData.org_id);

          // If no employees and not on onboarding, redirect to onboarding
          // Only on first visit (check URL param)
          if (
            count === 0 &&
            request.nextUrl.searchParams.get('onboarded') !== '1'
          ) {
            const url = request.nextUrl.clone();
            url.pathname = ONBOARDING_PATH;
            return NextResponse.redirect(url);
          }
        }
      }
    }
  }

  return supabaseResponse;
}
