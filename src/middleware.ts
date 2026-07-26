import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), display-capture=()');

  const csp = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https:;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    media-src 'self' blob:;
    frame-src 'self' https:;
    font-src 'self' data: https:;
    connect-src 'self' wss://*.supabase.co https:;
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};
