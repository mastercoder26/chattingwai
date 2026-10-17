import type { IntelligentUIComponent, ParseResult } from './types';
import { validateIntelligentUI } from './schema';

const FENCE_REGEX = /(?:^|\n)[ \t]*```(?:intelligent-ui|ui)[ \t]*\r?\n?([\s\S]*?)(?:(?:^|\n)[ \t]*```|$)/i;

/**
 * Removes trailing commas preceding closing delimiters (} or ]) outside of string literals.
 */
function stripTrailingCommasBeforeDelimiters(json: string): string {
  let inStr = false;
  let esc = false;
  let out = '';

  for (let i = 0; i < json.length; i++) {
    const c = json[i];
    if (inStr) {
      if (esc) {
        esc = false;
      } else if (c === '\\') {
        esc = true;
      } else if (c === '"') {
        inStr = false;
      }
      out += c;
      continue;
    }

    if (c === '"') {
      inStr = true;
      out += c;
      continue;
    }

    if (c === ',') {
      let nextIdx = i + 1;
      while (nextIdx < json.length && /\s/.test(json[nextIdx])) {
        nextIdx++;
      }
      if (nextIdx < json.length && (json[nextIdx] === '}' || json[nextIdx] === ']')) {
        continue;
      }
    }

    out += c;
  }

  return out;
}

/**
 * Extracts a candidate JSON payload from raw text, stripping markdown code fences
 * (```intelligent-ui or ```ui) if present, or isolating the first JSON object block.
 */
export function extractJsonPayload(raw: string): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // If already valid JSON starting with an object, return directly
  if (trimmed.startsWith('{')) {
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      // Proceed to extraction/repair
    }
  }

  const fenceMatch = FENCE_REGEX.exec(trimmed);
  const firstFenceIndex = trimmed.search(/(?:^|\n)[ \t]*```(?:intelligent-ui|ui)/i);
  const firstBraceIndex = trimmed.indexOf('{');

  let text = trimmed;

  if (
    fenceMatch &&
    firstFenceIndex !== -1 &&
    (firstBraceIndex === -1 || firstFenceIndex <= firstBraceIndex)
  ) {
    text = fenceMatch[1].trim();
  }

  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) {
    return text.replace(/```\s*$/, '').trim();
  }

  text = text.slice(firstBrace);

  // Check if outer braces are already balanced
  let depth = 0;
  let inStr = false;
  let esc = false;
  let matchEnd = -1;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) {
        esc = false;
      } else if (c === '\\') {
        esc = true;
      } else if (c === '"') {
        inStr = false;
      }
      continue;
    }

    if (c === '"') {
      inStr = true;
      continue;
    }

    if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) {
        matchEnd = i + 1;
        break;
      }
    }
  }

  if (matchEnd !== -1) {
    return text.slice(0, matchEnd);
  }

  return text.replace(/```\s*$/, '').trim();
}

/**
 * Stack-based delimiter auto-repair function for streaming JSON:
 * - Tracks open double quotes (respecting escape sequences \").
 * - Tracks open brackets [ and braces {.
 * - Closes unclosed strings, adds missing closing brackets/braces in reverse order.
 * - Strips trailing commas and incomplete key/value punctuation.
 * - Sanitizes incomplete literals (true/false/null).
 */
export function repairStreamingJson(partialJson: string): string {
  if (typeof partialJson !== 'string') return '';
  const trimmed = partialJson.trim();
  if (!trimmed) return '';

  // First, strip internal malformed trailing commas before existing delimiters
  const sanitized = stripTrailingCommasBeforeDelimiters(trimmed);

  let inString = false;
  let isEscaped = false;
  const stack: ('{' | '[')[] = [];

  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{' || char === '[') {
      stack.push(char);
    } else if (char === '}') {
      if (stack.length > 0 && stack[stack.length - 1] === '{') {
        stack.pop();
      }
    } else if (char === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === '[') {
        stack.pop();
      }
    }
  }

  let repaired = sanitized;

  if (inString) {
    if (isEscaped) {
      repaired = repaired.slice(0, -1);
    }
    repaired += '"';
  } else {
    // Repair incomplete numbers or booleans/null
    repaired = repaired
      .replace(/:\s*-$/, ': 0')
      .replace(/(\d+)\.$/, '$1')
      .replace(/\b(t|tr|tru)$/, 'true')
      .replace(/\b(f|fa|fal|fals)$/, 'false')
      .replace(/\b(n|nu|nul)$/, 'null');
  }

  repaired = repaired.trimEnd();

  // If stack top is an object '{', check for incomplete keys or dangling colons
  if (stack.length > 0 && stack[stack.length - 1] === '{') {
    if (/:\s*$/.test(repaired)) {
      repaired += ' null';
    } else if (/,\s*"[^"]*"\s*$/.test(repaired)) {
      repaired = repaired.replace(/,\s*"[^"]*"\s*$/, '');
    } else if (/\{\s*"[^"]*"\s*$/.test(repaired)) {
      repaired = repaired.replace(/\{\s*"[^"]*"\s*$/, '{');
    }
  }

  // Strip trailing commas before closing delimiters
  repaired = repaired.replace(/,\s*$/, '');

  // Close unclosed structures in reverse order
  for (let i = stack.length - 1; i >= 0; i--) {
    repaired += stack[i] === '{' ? '}' : ']';
  }

  return repaired;
}

/**
 * Parses a streaming or complete payload for Intelligent UI components.
 * - Extracts JSON payload from code fences or raw strings.
 * - Attempts standard JSON.parse first.
 * - If standard parse fails, attempts delimiter auto-repair and partial validation.
 * - Validates against Zod schemas.
 * - Guarantees NEVER to throw an unhandled exception.
 */
export function parseStreamingPayload(raw: string): ParseResult<IntelligentUIComponent> {
  const safeRaw = typeof raw === 'string' ? raw : String(raw ?? '');

  try {
    const trimmed = safeRaw.trim();
    if (!trimmed) {
      return {
        status: 'error',
        error: 'Empty payload',
        raw: safeRaw,
      };
    }

    // Fast-path: If the entire input is already valid JSON without needing extraction
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        const validation = validateIntelligentUI(parsed);
        if (validation.success) {
          return {
            status: 'complete',
            data: validation.data,
            raw: safeRaw,
          };
        }
      } catch {
        // Continue to extraction and repair
      }
    }

    const extracted = extractJsonPayload(safeRaw);
    if (!extracted || !extracted.includes('{')) {
      return {
        status: 'error',
        error: 'No JSON component structure detected',
        raw: safeRaw,
      };
    }

    // 1. Try standard JSON.parse first on extracted content
    try {
      const parsed = JSON.parse(extracted);
      const validation = validateIntelligentUI(parsed);
      if (validation.success) {
        return {
          status: 'complete',
          data: validation.data,
          raw: safeRaw,
        };
      }
      return {
        status: 'error',
        error: validation.error,
        raw: safeRaw,
      };
    } catch {
      // Standard parse failed, proceed to streaming repair
    }

    // 2. Delimiter auto-repair for streaming JSON
    const repaired = repairStreamingJson(extracted);
    if (!repaired) {
      return {
        status: 'error',
        error: 'Failed to repair streaming JSON',
        raw: safeRaw,
      };
    }

    try {
      const repairedParsed = JSON.parse(repaired);
      const validation = validateIntelligentUI(repairedParsed);
      if (validation.success) {
        return {
          status: 'partial',
          data: validation.data,
          raw: safeRaw,
        };
      }
      return {
        status: 'error',
        error: validation.error,
        raw: safeRaw,
      };
    } catch (parseError) {
      return {
        status: 'error',
        error:
          parseError instanceof Error
            ? `JSON repair parse error: ${parseError.message}`
            : 'JSON repair syntax error',
        raw: safeRaw,
      };
    }
  } catch (err) {
    return {
      status: 'error',
      error: err instanceof Error ? err.message : 'Unexpected parser error',
      raw: safeRaw,
    };
  }
}
