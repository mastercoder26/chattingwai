import { chatSchema } from '@/lib/chat-schema';
import { API_BASE, getModels } from '@/lib/models';
import { SSEParser, parseDelta } from '@/lib/stream';
import { isSameOrigin } from '@/lib/origin';
import { requestAuthenticated } from '@/lib/auth';
import { MAX_REQUEST_BYTES } from '@/lib/attachments';
import { buildSystemPrompt } from '@/lib/prompts';

export const runtime = 'nodejs';
export const maxDuration = 180;
const requests = new Map<string, { count: number; until: number }>();

export async function POST(request: Request) {
  if (!requestAuthenticated(request))
    return Response.json({ error: 'Unlock your workspace to continue.' }, { status: 401 });
  // Next may reconstruct request.url with localhost while the browser uses 127.0.0.1.
  // The incoming Host header identifies the origin the browser actually requested.
  if (!isSameOrigin(request))
    return Response.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403 });
  if (!process.env.HACKCLUB_API_KEY)
    return Response.json(
      { error: 'Add HACKCLUB_API_KEY to .env.local, then restart the app.' },
      { status: 503 },
    );
  if (Number(request.headers.get('content-length')) > MAX_REQUEST_BYTES)
    return Response.json({ error: 'This message is too large.' }, { status: 413 });
  let input;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_REQUEST_BYTES)
      return Response.json({ error: 'This message is too large.' }, { status: 413 });
    input = chatSchema.safeParse(JSON.parse(raw));
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!input.success)
    return Response.json(
      { error: input.error.issues[0]?.message || 'Invalid chat request.' },
      { status: 400 },
    );
  const now = Date.now();
  for (const [key, value] of requests) if (value.until < now) requests.delete(key);
  const address = request.headers.get('x-forwarded-for')?.split(',')[0] || 'local';
  const usage = requests.get(address) || { count: 0, until: now + 60_000 };
  if (usage.count >= 15)
    return Response.json({ error: 'A little breather. Try again in a minute.' }, { status: 429 });
  usage.count++;
  requests.set(address, usage);

  const { model, messages, instructions, temperature, maxTokens } = input.data;
  const { models, live } = await getModels();
  const metadata = models.find((m) => m.id === model);
  const hasImages = messages.some(
    (m) => Array.isArray(m.content) && m.content.some((p) => p.type === 'image_url'),
  );
  if (hasImages && !metadata?.inputModalities?.includes('image'))
    return Response.json(
      { error: 'Choose a vision-capable model to send images.' },
      { status: 400 },
    );
  if (live && !metadata)
    return Response.json(
      { error: 'This model is no longer available. Choose another model.' },
      { status: 400 },
    );
  const controller = new AbortController();
  const abort = () => controller.abort();
  request.signal.addEventListener('abort', abort);
  const timeout = setTimeout(abort, 180_000);
  const cleanup = () => {
    clearTimeout(timeout);
    request.signal.removeEventListener('abort', abort);
  };
  try {
    const upstream = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.HACKCLUB_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(instructions),
          },
          ...messages,
        ],
        stream: true,
        max_tokens: maxTokens,
        ...(metadata?.parameters.includes('temperature') ? { temperature } : {}),
      }),
    });
    if (!upstream.ok || !upstream.body) {
      cleanup();
      const status = upstream.status;
      const error =
        status === 401 || status === 403
          ? 'The API key was rejected. Check your Hack Club key.'
          : status === 429
            ? 'Hack Club’s usage limit was reached. Please try again later.'
            : status === 400
              ? 'This model could not accept the request. Try a different model or shorter conversation.'
              : 'The model is temporarily unavailable. Please try again.';
      return Response.json({ error }, { status: status >= 400 && status < 600 ? status : 502 });
    }
    const reader = upstream.body.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const parser = new SSEParser();
    const stream = new ReadableStream({
      async start(output) {
        let completed = false;
        const emit = (raw: string) => {
          const event = parseDelta(raw);
          if (!event) return;
          if (event.type === 'done') {
            if (completed) return;
            completed = true;
          }
          output.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
        };
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            for (const data of parser.push(decoder.decode(value, { stream: true }))) emit(data);
          }
          for (const data of parser.push(decoder.decode())) emit(data);
          for (const data of parser.finish()) emit(data);
          if (!completed)
            output.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: 'error',
                  message: 'The connection ended before the reply completed. You can retry.',
                }) + '\n',
              ),
            );
          output.close();
        } catch {
          if (!controller.signal.aborted) {
            try {
              output.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: 'error',
                    message: 'The connection was interrupted. Please try again.',
                  }) + '\n',
                ),
              );
              output.close();
            } catch {
              /* The browser has already disconnected. */
            }
          } else {
            try {
              output.close();
            } catch {
              /* Stream cancelled. */
            }
          }
        } finally {
          cleanup();
          reader.releaseLock();
        }
      },
      cancel() {
        controller.abort();
        cleanup();
        void reader.cancel().catch(() => {});
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-store, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch {
    cleanup();
    return Response.json(
      { error: 'Could not reach the model. Check your connection and try again.' },
      { status: 502 },
    );
  }
}
