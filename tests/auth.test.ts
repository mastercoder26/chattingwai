import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import {
  authConfig,
  passwordMatches,
  createSession,
  verifySession,
  requestAuthenticated,
  SESSION_COOKIE,
  SESSION_SECONDS,
} from '../lib/auth';
import { proxy } from '../proxy';
import { POST as login } from '../app/api/auth/login/route';
import { POST as logout } from '../app/api/auth/logout/route';

const password = 'test-password-for-auth';
const config = {
  passwordHash: createHash('sha256').update(password).digest('hex'),
  sessionSecret: 'a'.repeat(64),
};
const savedHash = process.env.SITE_PASSWORD_HASH;
const savedSecret = process.env.SESSION_SECRET;
before(() => {
  process.env.SITE_PASSWORD_HASH = config.passwordHash;
  process.env.SESSION_SECRET = config.sessionSecret;
});
after(() => {
  if (savedHash === undefined) delete process.env.SITE_PASSWORD_HASH;
  else process.env.SITE_PASSWORD_HASH = savedHash;
  if (savedSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = savedSecret;
});

test('password comparison requires an exact, bounded match', () => {
  assert.equal(passwordMatches(password, config), true);
  for (const value of [password.toUpperCase(), '', password + ' ', 'x'.repeat(257)])
    assert.equal(passwordMatches(value, config), false);
});
test('sessions expire, reject tampering, and are invalidated by credential rotation', () => {
  const now = 1_800_000_000_000;
  const token = createSession(config, now);
  assert.equal(verifySession(token, config, now), true);
  assert.notEqual(createSession(config, now), token);
  assert.equal(verifySession(token, config, now + SESSION_SECONDS * 1000), false);
  assert.equal(
    verifySession(token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a'), config, now),
    false,
  );
  assert.equal(verifySession(token, { ...config, sessionSecret: 'b'.repeat(64) }, now), false);
  assert.equal(verifySession(token, { ...config, passwordHash: 'b'.repeat(64) }, now), false);
  assert.equal(verifySession(token, null, now), false);
  assert.equal(verifySession('malformed', config, now), false);
});
test('page and API access fail closed without a valid signed cookie', () => {
  assert.equal(
    proxy(new NextRequest('https://app.example/')).headers.get('location'),
    'https://app.example/login',
  );
  for (const path of ['/api/chat', '/api/models'])
    assert.equal(proxy(new NextRequest('https://app.example' + path)).status, 401);
  const cookie = `${SESSION_COOKIE}=${createSession(config)}`;
  const request = new NextRequest('https://app.example/api/chat', { headers: { cookie } });
  assert.equal(requestAuthenticated(request), true);
  assert.equal(proxy(request).headers.get('x-middleware-next'), '1');
  delete process.env.SESSION_SECRET;
  assert.equal(authConfig(), null);
  assert.equal(proxy(request).status, 503);
  process.env.SESSION_SECRET = config.sessionSecret;
});
function loginRequest(value: string, origin = 'https://app.example', address = 'test') {
  return new Request('https://app.example/api/auth/login', {
    method: 'POST',
    headers: {
      origin,
      host: 'app.example',
      'Content-Type': 'application/json',
      'x-forwarded-for': address,
    },
    body: JSON.stringify({ password: value }),
  });
}
test('login rejects foreign origins and wrong passwords without granting a cookie', async () => {
  assert.equal((await login(loginRequest(password, 'https://foreign.example'))).status, 403);
  const response = await login(loginRequest('wrong'));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('set-cookie'), null);
});
test('successful login grants a secure HTTP-only same-site session and logout clears it', async () => {
  const response = await login(loginRequest(password));
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie')!;
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=strict/i);
  assert.equal(
    requestAuthenticated(
      new Request('https://app.example/api/models', { headers: { cookie: cookie.split(';')[0] } }),
    ),
    true,
  );
  const cleared = await logout(
    new Request('https://app.example/api/auth/logout', {
      method: 'POST',
      headers: { origin: 'https://app.example', host: 'app.example' },
    }),
  );
  assert.match(cleared.headers.get('set-cookie')!, /Max-Age=0/i);
});
test('repeated login attempts are limited', async () => {
  for (let i = 0; i < 10; i++)
    assert.equal(
      (await login(loginRequest('wrong', 'https://app.example', 'limited-test'))).status,
      401,
    );
  const response = await login(loginRequest(password, 'https://app.example', 'limited-test'));
  assert.equal(response.status, 429);
  assert.ok(response.headers.get('retry-after'));
});
