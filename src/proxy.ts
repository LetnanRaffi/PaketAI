import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow auth routes and static files through
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Run session refresh + auth check
  const response = await updateSession(request);

  // If redirect (to /login), pass through
  if (response.status === 307 || response.status === 302) {
    return response;
  }

  // For billing gate: check if org is expired
  // We do this by checking for a session cookie and reading the org status
  // The actual check happens in billing.ts helpers used by pages/APIs
  // Here we just allow billing-related paths when expired

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
