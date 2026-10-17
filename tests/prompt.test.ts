import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt, BASE_INSTRUCTIONS, INTELLIGENT_UI_GUIDANCE } from '../lib/prompts';
import { POST } from '../app/api/chat/route';
import { createSession, SESSION_COOKIE } from '../lib/auth';

test('buildSystemPrompt includes Glimpse base instructions verbatim', () => {
  const prompt = buildSystemPrompt();
  assert.ok(prompt.startsWith(BASE_INSTRUCTIONS));
  assert.ok(prompt.includes('You are Glimpse, a thoughtful and capable AI assistant.'));
  assert.ok(prompt.includes('Be helpful, clear, and honest.'));
  assert.ok(prompt.includes('Format responses with Markdown when useful'));
  assert.ok(prompt.includes('fenced code blocks with language names, headings, lists, and tables.'));
  assert.ok(prompt.includes('Use $...$ or $$...$$ for mathematical notation.'));
});

test('buildSystemPrompt documents fenced code block syntax and alias', () => {
  const prompt = buildSystemPrompt();
  assert.ok(prompt.includes('```intelligent-ui'));
  assert.ok(prompt.includes('```ui'));
  assert.ok(prompt.includes('valid JSON'));
});

test('buildSystemPrompt documents all 6 component types and their schemas', () => {
  const prompt = buildSystemPrompt();

  // 1. Tabs
  assert.ok(prompt.includes('Tabs'));
  assert.ok(prompt.includes('`tabs`'));
  assert.ok(prompt.includes('"tabs"'));
  assert.ok(prompt.includes('id'));
  assert.ok(prompt.includes('label'));
  assert.ok(prompt.includes('content'));

  // 2. Comparison
  assert.ok(prompt.includes('Comparison'));
  assert.ok(prompt.includes('`comparison`'));
  assert.ok(prompt.includes('"comparison"'));
  assert.ok(prompt.includes('name'));
  assert.ok(prompt.includes('badge'));
  assert.ok(prompt.includes('highlight'));
  assert.ok(prompt.includes('pros'));
  assert.ok(prompt.includes('cons'));
  assert.ok(prompt.includes('details'));

  // 3. Metrics / Stat
  assert.ok(prompt.includes('Metrics'));
  assert.ok(prompt.includes('`metrics`'));
  assert.ok(prompt.includes('`stat`'));
  assert.ok(prompt.includes('label'));
  assert.ok(prompt.includes('value'));
  assert.ok(prompt.includes('change'));
  assert.ok(prompt.includes('trend'));
  assert.ok(prompt.includes('"up"'));
  assert.ok(prompt.includes('"down"'));
  assert.ok(prompt.includes('"neutral"'));

  // 4. Checklist
  assert.ok(prompt.includes('Checklist'));
  assert.ok(prompt.includes('`checklist`'));
  assert.ok(prompt.includes('"checklist"'));
  assert.ok(prompt.includes('text'));
  assert.ok(prompt.includes('checked'));

  // 5. Accordion
  assert.ok(prompt.includes('Accordion'));
  assert.ok(prompt.includes('`accordion`'));
  assert.ok(prompt.includes('"accordion"'));
  assert.ok(prompt.includes('title'));
  assert.ok(prompt.includes('content'));

  // 6. Callout
  assert.ok(prompt.includes('Callout'));
  assert.ok(prompt.includes('`callout`'));
  assert.ok(prompt.includes('"callout"'));
  assert.ok(prompt.includes('variant'));
  assert.ok(prompt.includes('info'));
  assert.ok(prompt.includes('note'));
  assert.ok(prompt.includes('tip'));
  assert.ok(prompt.includes('warning'));
  assert.ok(prompt.includes('success'));
});

test('buildSystemPrompt enforces strict judicious usage guidelines', () => {
  const prompt = buildSystemPrompt();
  assert.ok(prompt.includes('Strict Judicious Usage Rules'));
  assert.ok(
    prompt.includes('ONLY when they genuinely enhance comprehension'),
    'Must instruct model to use components only when they enhance comprehension',
  );
  assert.ok(prompt.includes('comparing options'));
  assert.ok(prompt.includes('presenting key metrics'));
  assert.ok(prompt.includes('organizing multi-part guides'));
  assert.ok(
    prompt.includes(
      'NEVER force them into everyday conversational replies or use them as generic visual clutter',
    ),
    'Must strictly forbid everyday conversational overuse or visual clutter',
  );
  assert.ok(
    prompt.includes('Prefer standard Markdown'),
    'Must encourage standard Markdown for ordinary prose',
  );
});

test('buildSystemPrompt appends user preferences when provided and omits them when absent', () => {
  // Undefined / empty cases
  const defaultPrompt = buildSystemPrompt();
  assert.equal(defaultPrompt.includes('User preferences:'), false);
  assert.equal(buildSystemPrompt(undefined).includes('User preferences:'), false);
  assert.equal(buildSystemPrompt('').includes('User preferences:'), false);
  assert.equal(buildSystemPrompt('   \n  \t  ').includes('User preferences:'), false);
  assert.equal(defaultPrompt, `${BASE_INSTRUCTIONS}\n\n${INTELLIGENT_UI_GUIDANCE}`);

  // Provided preference
  const customPreference = 'Always answer in concise Japanese.';
  const customizedPrompt = buildSystemPrompt(customPreference);
  assert.ok(customizedPrompt.endsWith(`User preferences:\n${customPreference}`));
  assert.ok(customizedPrompt.startsWith(BASE_INSTRUCTIONS));
  assert.ok(customizedPrompt.includes(INTELLIGENT_UI_GUIDANCE));

  // Multi-line user instructions
  const multiLine = 'Line 1: Be concise.\nLine 2: Prefer TypeScript.';
  const multiLinePrompt = buildSystemPrompt(`  ${multiLine}  `);
  assert.ok(multiLinePrompt.endsWith(`User preferences:\n${multiLine}`));
});

test('chat completion API route incorporates buildSystemPrompt with and without user preferences', async (t) => {
  const saved = {
    key: process.env.HACKCLUB_API_KEY,
    hash: process.env.SITE_PASSWORD_HASH,
    secret: process.env.SESSION_SECRET,
  };
  const config = { passwordHash: 'a'.repeat(64), sessionSecret: 'b'.repeat(64) };
  process.env.HACKCLUB_API_KEY = 'test-key';
  process.env.SITE_PASSWORD_HASH = config.passwordHash;
  process.env.SESSION_SECRET = config.sessionSecret;

  t.after(() => {
    for (const [key, value] of Object.entries({
      HACKCLUB_API_KEY: saved.key,
      SITE_PASSWORD_HASH: saved.hash,
      SESSION_SECRET: saved.secret,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const capturedSystemPrompts: string[] = [];

  t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
    if (String(url).endsWith('/models')) {
      return Response.json({
        data: [
          {
            id: 'openai/gpt-4o-mini',
            name: 'GPT-4o mini',
            parameters: ['temperature'],
            architecture: { input_modalities: ['text'], output_modalities: ['text'] },
          },
        ],
      });
    }

    const body = JSON.parse(String(init?.body));
    const systemMessage = body.messages.find(
      (m: { role: string; content: string }) => m.role === 'system',
    );
    if (systemMessage) {
      capturedSystemPrompts.push(systemMessage.content);
    }
    return new Response('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: [DONE]\n\n');
  });

  const makeRequest = (body: object) =>
    new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: {
        host: 'localhost',
        origin: 'http://localhost',
        cookie: `${SESSION_COOKIE}=${createSession(config)}`,
      },
      body: JSON.stringify(body),
    });

  // Request 1: without instructions
  const res1 = await POST(
    makeRequest({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello' }],
    }),
  );
  assert.equal(res1.status, 200);
  assert.equal(capturedSystemPrompts.length, 1);
  assert.equal(capturedSystemPrompts[0], buildSystemPrompt());

  // Request 2: with custom user instructions
  const instructions = 'Always write unit tests first.';
  const res2 = await POST(
    makeRequest({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: 'How do I test?' }],
      instructions,
    }),
  );
  assert.equal(res2.status, 200);
  assert.equal(capturedSystemPrompts.length, 2);
  assert.equal(capturedSystemPrompts[1], buildSystemPrompt(instructions));
  assert.ok(capturedSystemPrompts[1].includes(`User preferences:\n${instructions}`));
});
