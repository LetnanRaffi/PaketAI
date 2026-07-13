import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export default async function proxy(request: NextRequest) {
  // Skip middleware entirely for auth API routes — they handle their own cookies
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    return undefined;
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (e.g. robots.txt)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
