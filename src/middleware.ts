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
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://quge5.com https://*.quge5.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://image.tmdb.org https://ui-avatars.com;
    media-src 'self' blob:;
    frame-src 'self' https://vidsrc.net https://vidlink.pro https://embed.su https://multiembed.mov https://streamingnow.mov https://*.vidsrc.net https://*.vidlink.pro https://*.embed.su https://*.multiembed.mov https://*.streamingnow.mov;
    font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com;
    connect-src 'self' https://api.themoviedb.org https://*.supabase.co wss://*.supabase.co https://quge5.com https://*.quge5.com;
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};
