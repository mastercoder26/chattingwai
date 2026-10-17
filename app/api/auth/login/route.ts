import { NextResponse } from 'next/server';
import {
  authConfig,
  createSession,
  passwordMatches,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '@/lib/auth';
import { isSameOrigin } from '@/lib/origin';

export const runtime = 'nodejs';
const attempts = new Map<string, { count: number; expires: number }>();

export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json({ error: 'This sign-in request is not allowed.' }, { status: 403 });
  const config = authConfig();
  if (!config)
    return NextResponse.json({ error: 'Workspace access is not configured yet.' }, { status: 503 });
  if (Number(request.headers.get('content-length')) > 1024)
    return NextResponse.json({ error: 'Invalid password.' }, { status: 400 });
  const now = Date.now();
  for (const [key, attempt] of attempts) if (attempt.expires <= now) attempts.delete(key);
  const address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const attempt = attempts.get(address) || { count: 0, expires: now + 60_000 };
  if (attempt.count >= 10)
    return NextResponse.json(
      { error: 'Too many attempts. Try again in a minute.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((attempt.expires - now) / 1000)) },
      },
    );
  attempt.count++;
  attempts.set(address, attempt);
  let password: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 1024) throw new Error('Too large');
    password = JSON.parse(raw).password;
  } catch {
    return NextResponse.json({ error: 'Enter a valid password.' }, { status: 400 });
  }
  if (typeof password !== 'string' || !passwordMatches(password, config))
    return NextResponse.json(
      { error: 'That password doesn’t match. Give it another try.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  const response = NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'no-store' } },
  );
  response.cookies.set(SESSION_COOKIE, createSession(config), sessionCookieOptions(request));
  return response;
}
