import { NextResponse, type NextRequest } from 'next/server';
import { authConfig, SESSION_COOKIE, verifySession } from '@/lib/auth';

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === '/api/auth/login' || path === '/api/auth/logout' || path === '/login')
    return NextResponse.next();
  const config = authConfig();
  if (verifySession(request.cookies.get(SESSION_COOKIE)?.value, config)) return NextResponse.next();
  if (path.startsWith('/api/'))
    return NextResponse.json(
      { error: 'Unlock your workspace to continue.' },
      { status: config ? 401 : 503, headers: { 'Cache-Control': 'no-store' } },
    );
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'] };
