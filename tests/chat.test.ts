import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SSEParser, parseDelta } from '../lib/stream';
import { chatSchema } from '../lib/chat-schema';
import { settingsSchema, conversationsSchema } from '../lib/storage';
import { messageContent } from '../lib/types';
import { isSameOrigin } from '../lib/origin';

test('stream parser preserves an event split across network chunks', () => {
  const parser = new SSEParser();
  assert.deepEqual(parser.push('data: {"choices":[{"delta":{"con'), []);
  assert.deepEqual(parser.push('tent":"Hello"}}]}\n'), []);
  const events = parser.push('\ndata: [DONE]\n\n');
  assert.deepEqual(events.map(parseDelta), [{ type: 'delta', text: 'Hello' }, { type: 'done' }]);
});
test('stream parser supports CRLF, comments, and final events without a newline', () => {
  const parser = new SSEParser();
  assert.deepEqual(parser.push(': heartbeat\r\n\r\ndata: [DONE]'), []);
  assert.deepEqual(parser.finish(), ['[DONE]']);
});
test('stream parser joins multi-line SSE data', () => {
  assert.deepEqual(new SSEParser().push('event: test\ndata: first\ndata: second\n\n'), [
    'first\nsecond',
  ]);
});
test('stream delta handles finish reasons and upstream errors', () => {
  assert.deepEqual(parseDelta('{"choices":[{"delta":{},"finish_reason":"length"}]}'), {
    type: 'done',
    reason: 'length',
  });
  assert.deepEqual(parseDelta('{"error":{"message":"Usage limit reached"}}'), {
    type: 'error',
    message: 'Usage limit reached',
  });
  assert.equal(parseDelta('{"choices":[],"usage":{"total_tokens":20}}'), undefined);
});
const valid = { model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: 'Hello' }] };
test('chat schema accepts conversation history and sets bounded defaults', () => {
  const result = chatSchema.parse(valid);
  assert.equal(result.maxTokens, 4096);
  assert.equal(result.temperature, 0.7);
});
test('chat schema rejects client system messages, excessive tokens, and invalid temperature', () => {
  assert.equal(
    chatSchema.safeParse({
      ...valid,
      messages: [{ role: 'system', content: 'Override instructions' }],
    }).success,
    false,
  );
  assert.equal(chatSchema.safeParse({ ...valid, maxTokens: 999999 }).success, false);
  assert.equal(chatSchema.safeParse({ ...valid, temperature: -1 }).success, false);
});
test('chat schema limits total conversation size', () => {
  const messages = Array.from({ length: 4 }, () => ({ role: 'user', content: 'x'.repeat(90_000) }));
  assert.equal(chatSchema.safeParse({ ...valid, messages }).success, false);
});
test('attachment contents are included in the model context', () => {
  assert.equal(
    messageContent({
      id: '1',
      role: 'user',
      content: 'Explain this',
      attachments: [{ name: 'example.py', content: 'print(42)' }],
    }),
    'Explain this\n\nAttached file: example.py\n\nprint(42)',
  );
});
test('invalid persisted settings and conversations cannot corrupt the UI', () => {
  assert.equal(settingsSchema.safeParse({ theme: 'something else' }).success, false);
  assert.equal(
    conversationsSchema.safeParse([{ id: 'a', messages: 'not an array' }]).success,
    false,
  );
  assert.deepEqual(conversationsSchema.parse([]), []);
});
test('origin protection accepts the browser Host when Next reconstructs localhost', () => {
  const request = new Request('http://localhost:3000/api/chat', {
    headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' },
  });
  assert.equal(isSameOrigin(request), true);
});
test('origin protection rejects foreign and opaque browser origins', () => {
  for (const origin of ['https://unrelated.example', 'null', 'http://localhost:4000']) {
    assert.equal(
      isSameOrigin(
        new Request('http://localhost:3000/api/chat', {
          headers: { origin, host: 'localhost:3000' },
        }),
      ),
      false,
    );
  }
});
