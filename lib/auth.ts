import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'glimpse_session';
export const SESSION_SECONDS = 60 * 60 * 24 * 7;
export type AuthConfig = { passwordHash: string; sessionSecret: string };

export function authConfig(): AuthConfig | null {
  const passwordHash = process.env.SITE_PASSWORD_HASH;
  const sessionSecret = process.env.SESSION_SECRET;
  if (
    !passwordHash ||
    !/^[a-f0-9]{64}$/i.test(passwordHash) ||
    !sessionSecret ||
    sessionSecret.length < 64
  )
    return null;
  return { passwordHash: passwordHash.toLowerCase(), sessionSecret };
}

export function passwordMatches(password: string, config: AuthConfig) {
  if (!password || password.length > 256) return false;
  const provided = createHash('sha256').update(password).digest();
  return timingSafeEqual(provided, Buffer.from(config.passwordHash, 'hex'));
}

function signature(payload: string, config: AuthConfig) {
  return createHmac('sha256', config.sessionSecret)
    .update(`${config.passwordHash}:${payload}`)
    .digest('hex');
}

export function createSession(config: AuthConfig, now = Date.now()) {
  const expires = Math.floor(now / 1000) + SESSION_SECONDS;
  const payload = `v1.${expires}.${randomBytes(16).toString('hex')}`;
  return `${payload}.${signature(payload, config)}`;
}

export function verifySession(
  token: string | undefined,
  config: AuthConfig | null,
  now = Date.now(),
) {
  if (!token || !config || !/^v1\.\d{10}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(token)) return false;
  const [version, expiration, nonce, provided] = token.split('.');
  const expires = Number(expiration);
  if (expires <= Math.floor(now / 1000) || expires > Math.floor(now / 1000) + SESSION_SECONDS)
    return false;
  const expected = signature(`${version}.${expiration}.${nonce}`, config);
  return timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
}

export function requestAuthenticated(request: Request) {
  const cookie = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return verifySession(cookie?.slice(SESSION_COOKIE.length + 1), authConfig());
}

export function sessionCookieOptions(request: Request) {
  return {
    httpOnly: true,
    secure: process.env.VERCEL === '1' || new URL(request.url).protocol === 'https:',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: SESSION_SECONDS,
  };
}
