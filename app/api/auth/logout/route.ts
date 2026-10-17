import { NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';
import { isSameOrigin } from '@/lib/origin';

export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json({ error: 'This request is not allowed.' }, { status: 403 });
  const response = NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'no-store' } },
  );
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(request), maxAge: 0 });
  return response;
}
