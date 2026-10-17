import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { chatSchema } from '../lib/chat-schema';
import { attachmentSchema, exportContent, modelContent } from '../lib/attachments';
import { conversationsSchema } from '../lib/storage';
import { modelLogo } from '../lib/model-logos';
import { createSession, SESSION_COOKIE } from '../lib/auth';
import { POST } from '../app/api/chat/route';
const image =
  'data:image/png;base64,' + readFileSync('public/model-logos/light/openai.png').toString('base64');
const message = {
  id: 'picture',
  role: 'user' as const,
  content: 'Describe this',
  attachments: [
    { name: 'image.png', type: 'image' as const, content: image },
    { name: 'note.txt', content: 'Context' },
  ],
};

test('images become multimodal content while text attachments remain text', () => {
  assert.deepEqual(modelContent(message), [
    { type: 'text', text: 'Describe this\n\nAttached file: note.txt\n\nContext' },
    { type: 'image_url', image_url: { url: image } },
  ]);
  assert.match(exportContent(message), /!\[image.png\]\(data:image\/png;base64,/);
  assert.equal(modelContent({ ...message, attachments: [] }), 'Describe this');
});
test('image attachments survive persistence alongside legacy text attachments', () => {
  const value = [
    {
      id: 'chat',
      title: 'Picture',
      updatedAt: 1,
      model: 'openai/gpt-4o-mini',
      messages: [message],
    },
  ];
  assert.deepEqual(conversationsSchema.parse(JSON.parse(JSON.stringify(value))), value);
});
test('only bounded, supported inline image data is accepted', () => {
  for (const content of [
    'https://example.com/image.png',
    'data:image/svg+xml;base64,PHN2Zy8+',
    'data:image/png;base64,broken!',
    'data:image/png;base64,' + 'A'.repeat(700_000),
  ]) {
    assert.equal(
      attachmentSchema.safeParse({ type: 'image', name: 'bad', content }).success,
      false,
    );
  }
});
test('image parts cannot be injected as assistant content', () => {
  assert.equal(
    chatSchema.safeParse({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'assistant', content: modelContent(message) }],
    }).success,
    false,
  );
});
test('total conversation image payload stays within the deployment body limit', () => {
  const large = 'data:image/png;base64,' + 'A'.repeat(699_960);
  const messages = Array.from({ length: 5 }, () => ({
    role: 'user',
    content: [{ type: 'image_url', image_url: { url: large } }],
  }));
  assert.equal(chatSchema.safeParse({ model: 'openai/gpt-4o-mini', messages }).success, false);
});
test('provider aliases and model families use existing local logos', () => {
  for (const id of [
    'openai/gpt-4o-mini',
    '~anthropic/claude-latest',
    '~google/gemini-latest',
    'google/gemma-4',
    'qwen/qwen3',
    'moonshotai/kimi-k2',
  ]) {
    const logo = modelLogo(id);
    assert.ok(logo);
    for (const theme of ['light', 'dark'])
      assert.ok(existsSync(`public/model-logos/${theme}/${logo}.png`));
  }
  assert.equal(modelLogo('unknown/new-model'), undefined);
  assert.equal(modelLogo('google/gemma-4'), 'gemma-color');
});
test('chat API forwards images to vision models and rejects text-only models', async (t) => {
  const saved = {
    key: process.env.HACKCLUB_API_KEY,
    hash: process.env.SITE_PASSWORD_HASH,
    secret: process.env.SESSION_SECRET,
  };
  const config = { passwordHash: 'a'.repeat(64), sessionSecret: 'b'.repeat(64) };
  process.env.HACKCLUB_API_KEY = 'test-only';
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
  let forwarded = 0;
  t.mock.method(globalThis, 'fetch', async (url: string, init?: RequestInit) => {
    if (String(url).endsWith('/models'))
      return Response.json({
        data: [
          {
            id: 'vision/model',
            name: 'Vision',
            architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] },
          },
          {
            id: 'text/model',
            name: 'Text',
            architecture: { input_modalities: ['text'], output_modalities: ['text'] },
          },
        ],
      });
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body.messages[1].content, modelContent(message));
    forwarded++;
    return new Response('data: {"choices":[{"delta":{"content":"An image"}}]}\n\ndata: [DONE]\n\n');
  });
  const request = (model: string) =>
    new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: {
        host: 'localhost',
        origin: 'http://localhost',
        cookie: `${SESSION_COOKIE}=${createSession(config)}`,
      },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: modelContent(message) }] }),
    });
  const accepted = await POST(request('vision/model'));
  assert.equal(accepted.status, 200);
  assert.match(await accepted.text(), /An image/);
  const denied = await POST(request('text/model'));
  assert.equal(denied.status, 400);
  assert.match((await denied.json()).error, /vision/);
  assert.equal(forwarded, 1);
});
