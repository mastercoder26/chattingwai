export type ChatEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; reason?: string }
  | { type: 'error'; message: string };
// An incremental SSE parser: network chunks need not align with lines or events.
export class SSEParser {
  private buffer = '';
  push(chunk: string): string[] {
    this.buffer += chunk;
    const result: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = /\r?\n\r?\n/.exec(this.buffer))) {
      const frame = this.buffer.slice(0, match.index);
      this.buffer = this.buffer.slice(match.index + match[0].length);
      const data = frame
        .split(/\r?\n/)
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trimStart())
        .join('\n');
      if (data) result.push(data);
    }
    return result;
  }
  finish(): string[] {
    return this.push('\n\n');
  }
}
export function parseDelta(raw: string): ChatEvent | undefined {
  if (raw === '[DONE]') return { type: 'done' };
  const chunk = JSON.parse(raw);
  if (chunk.error)
    return {
      type: 'error',
      message:
        typeof chunk.error.message === 'string'
          ? chunk.error.message
          : 'The model could not complete this reply.',
    };
  const choice = chunk.choices?.[0];
  if (choice?.delta?.content) return { type: 'delta', text: choice.delta.content };
  if (choice?.finish_reason) return { type: 'done', reason: choice.finish_reason };
}
