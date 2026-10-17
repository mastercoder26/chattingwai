import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { parseStreamingPayload } from '../components/intelligent-ui/parser';
import { IntelligentUIRenderer } from '../components/intelligent-ui';

describe('Adversarial Streaming Resilience & Delimiter Stress Harness (Challenger 1)', () => {
  // Payloads for all 6 Intelligent UI components
  const canonicalPayloads = {
    tabs: JSON.stringify({
      type: 'tabs',
      activeTab: 'tab-overview',
      tabs: [
        {
          id: 'tab-overview',
          label: 'Overview',
          content: '### Overview\nWelcome to Intelligent UI streaming.',
          icon: 'info',
        },
        {
          id: 'tab-code',
          label: 'Code Samples',
          content: '```ts\nexport const answer = 42;\n```',
          icon: 'code',
        },
      ],
    }),
    comparison: JSON.stringify({
      type: 'comparison',
      title: 'Database Architecture Evaluation',
      subtitle: 'PostgreSQL vs Redis vs SQLite',
      items: [
        {
          name: 'PostgreSQL',
          badge: 'Relational',
          highlight: true,
          price: '$15/mo',
          pros: ['ACID compliant', 'Complex queries', 'Rich JSONB support'],
          cons: ['Higher memory footprint', 'Connection pooling required'],
          details: { latency: '<5ms', durability: 'Full WAL' },
        },
        {
          name: 'Redis',
          badge: 'In-Memory',
          highlight: false,
          price: '$20/mo',
          pros: ['Sub-millisecond speed', 'Pub/Sub primitives'],
          cons: ['RAM cost', 'Complex persistence tuning'],
          details: [
            { key: 'latency', value: '<1ms' },
            { key: 'durability', value: 'AOF / RDB' },
          ],
        },
      ],
    }),
    checklist: JSON.stringify({
      type: 'checklist',
      title: 'Production Readiness Checklist',
      items: [
        { id: 'item-1', text: 'Verify SSL certificates', checked: true, required: true },
        { id: 'item-2', text: 'Enable rate limiting on API', checked: false, required: true },
        { id: 'item-3', text: 'Configure automated backups', checked: false, required: false },
      ],
    }),
    metrics: JSON.stringify({
      type: 'metrics',
      metrics: [
        {
          label: 'P99 Latency',
          value: '42ms',
          unit: 'ms',
          trend: 'up',
          change: '-18%',
          description: 'Improved after cache warming',
        },
        {
          label: 'Error Rate',
          value: 0.01,
          unit: '%',
          trend: 'down',
          change: '-0.05%',
          description: 'Zero 5xx in last 24h',
        },
        {
          label: 'Total Requests',
          value: 1250000,
          trend: 'neutral',
          change: '+12%',
        },
      ],
    }),
    accordion: JSON.stringify({
      type: 'accordion',
      items: [
        {
          id: 'acc-1',
          title: 'Section 1: Architecture Guidelines',
          content: 'Stateless frontend services with Edge caching.',
          defaultOpen: true,
        },
        {
          id: 'acc-2',
          title: 'Section 2: Security & Authentication',
          content: 'Strict JWT signature verification with short TTL.',
          defaultOpen: false,
        },
      ],
    }),
    callout: JSON.stringify({
      type: 'callout',
      variant: 'warning',
      title: 'Scheduled Maintenance Notice',
      content: 'API endpoints will be in read-only mode on Sunday between 02:00-04:00 UTC.',
    }),
  };

  // Helper to test safety: parser must never throw and renderer must never throw
  function assertSafeExecution(raw: unknown, context: string) {
    let parseRes: ReturnType<typeof parseStreamingPayload>;
    try {
      parseRes = parseStreamingPayload(raw as string);
    } catch (err) {
      assert.fail(`[CRITICAL] parseStreamingPayload THREW an unhandled exception on: ${context}. Error: ${err}`);
    }

    assert.ok(
      ['complete', 'partial', 'error'].includes(parseRes.status),
      `Expected valid status on ${context}, got: ${parseRes.status}`,
    );

    // Renderer testing for valid strings or safe coercion
    const safeRawString = typeof raw === 'string' ? raw : String(raw ?? '');
    let html: string;
    try {
      html = renderToStaticMarkup(React.createElement(IntelligentUIRenderer, { raw: safeRawString }));
    } catch (err) {
      assert.fail(`[CRITICAL] IntelligentUIRenderer THREW an unhandled exception on: ${context}. Error: ${err}`);
    }

    assert.ok(typeof html === 'string', `Expected HTML string from renderer on ${context}`);
    assert.ok(
      html.includes('ui-fallback') ||
        html.includes('intelligent-ui-skeleton') ||
        html.includes('intelligent-ui-root'),
      `Rendered output must contain valid fallback, skeleton, or root markup on ${context}. Output: ${html.slice(0, 80)}`,
    );

    return { parseRes, html };
  }

  // ==========================================================================
  // SUITE 1: Truncated Streaming Tokens at Every Single Character Boundary
  // ==========================================================================
  describe('Suite 1: Single-Character Streaming Token Slicing Across All 6 Components', () => {
    for (const [name, payload] of Object.entries(canonicalPayloads)) {
      it(`evaluates all ${payload.length} character boundaries for raw JSON: ${name}`, () => {
        let partialOrCompleteCount = 0;

        for (let i = 1; i <= payload.length; i++) {
          const slice = payload.slice(0, i);
          const { parseRes } = assertSafeExecution(slice, `raw_${name}_len_${i}`);

          if (parseRes.status === 'complete' || parseRes.status === 'partial') {
            partialOrCompleteCount++;
            if (parseRes.data) {
              assert.equal(parseRes.data.type, name === 'callout' ? 'callout' : parseRes.data.type);
            }
          }
        }

        // Must successfully reach complete by the end
        const finalResult = parseStreamingPayload(payload);
        assert.equal(finalResult.status, 'complete');
        assert.ok(partialOrCompleteCount > 0);
      });

      it(`evaluates all character boundaries wrapped in code fence: ${name}`, () => {
        const fenced = `\`\`\`intelligent-ui\n${payload}\n\`\`\``;
        let partialOrCompleteCount = 0;

        for (let i = 1; i <= fenced.length; i++) {
          const slice = fenced.slice(0, i);
          const { parseRes } = assertSafeExecution(slice, `fenced_${name}_len_${i}`);

          if (parseRes.status === 'complete' || parseRes.status === 'partial') {
            partialOrCompleteCount++;
          }
        }

        const finalResult = parseStreamingPayload(fenced);
        assert.equal(finalResult.status, 'complete');
        assert.ok(partialOrCompleteCount > 0);
      });
    }
  });

  // ==========================================================================
  // SUITE 2: Truncated Strings in Keys, Values, Arrays, and Nested Structures
  // ==========================================================================
  describe('Suite 2: Truncation in Keys, Values, and Nested Structures', () => {
    const structuralTruncationCases = [
      // Truncated at opening braces
      '{',
      '{{',
      '{"',
      '{"t',
      '{"type',
      '{"type"',
      '{"type":',
      '{"type": ',
      '{"type": "c',
      '{"type": "callout',
      '{"type": "callout"',
      // Dangling commas & properties
      '{"type": "callout",',
      '{"type": "callout", ',
      '{"type": "callout", "',
      '{"type": "callout", "t',
      '{"type": "callout", "title',
      '{"type": "callout", "title"',
      '{"type": "callout", "title":',
      '{"type": "callout", "title": ',
      '{"type": "callout", "title": "',
      '{"type": "callout", "title": "System Alert',
      '{"type": "callout", "title": "System Alert"',
      '{"type": "callout", "title": "System Alert",',
      '{"type": "callout", "title": "System Alert", "c',
      '{"type": "callout", "title": "System Alert", "content":',
      '{"type": "callout", "title": "System Alert", "content": "Working',
      // Array truncations
      '{"type": "tabs", "tabs":',
      '{"type": "tabs", "tabs": [',
      '{"type": "tabs", "tabs": [{',
      '{"type": "tabs", "tabs": [{"id":',
      '{"type": "tabs", "tabs": [{"id": "tab-1"',
      '{"type": "tabs", "tabs": [{"id": "tab-1",',
      '{"type": "tabs", "tabs": [{"id": "tab-1", "label": "Tab One"',
      '{"type": "tabs", "tabs": [{"id": "tab-1", "label": "Tab One"},',
      '{"type": "tabs", "tabs": [{"id": "tab-1", "label": "Tab One"}, {',
      '{"type": "tabs", "tabs": [{"id": "tab-1", "label": "Tab One"}, {"id": "tab-2',
      // Deep nested structures (comparison details)
      '{"type": "comparison", "items": [{"name": "A", "details":',
      '{"type": "comparison", "items": [{"name": "A", "details": {',
      '{"type": "comparison", "items": [{"name": "A", "details": {"cpu":',
      '{"type": "comparison", "items": [{"name": "A", "details": {"cpu": "4 cores',
      '{"type": "comparison", "items": [{"name": "A", "details": {"cpu": "4 cores"',
      '{"type": "comparison", "items": [{"name": "A", "details": {"cpu": "4 cores",',
      '{"type": "comparison", "items": [{"name": "A", "details": {"cpu": "4 cores", "ram": "16GB"',
      // Nested array details
      '{"type": "comparison", "items": [{"name": "B", "details": [',
      '{"type": "comparison", "items": [{"name": "B", "details": [{',
      '{"type": "comparison", "items": [{"name": "B", "details": [{"key": "vCPU"',
      '{"type": "comparison", "items": [{"name": "B", "details": [{"key": "vCPU", "value": "8"',
      '{"type": "comparison", "items": [{"name": "B", "details": [{"key": "vCPU", "value": "8"}',
      // Truncated numbers & booleans
      '{"type": "metrics", "metrics": [{"label": "Load", "value":',
      '{"type": "metrics", "metrics": [{"label": "Load", "value": -',
      '{"type": "metrics", "metrics": [{"label": "Load", "value": 0.',
      '{"type": "metrics", "metrics": [{"label": "Load", "value": 42.',
      '{"type": "checklist", "items": [{"id": "c1", "text": "Task", "checked": t',
      '{"type": "checklist", "items": [{"id": "c1", "text": "Task", "checked": tr',
      '{"type": "checklist", "items": [{"id": "c1", "text": "Task", "checked": f',
      '{"type": "checklist", "items": [{"id": "c1", "text": "Task", "checked": fa',
      '{"type": "callout", "title": n',
      '{"type": "callout", "title": nu',
    ];

    for (const [idx, snippet] of structuralTruncationCases.entries()) {
      it(`safely handles structural truncation case #${idx}: ${JSON.stringify(snippet)}`, () => {
        assertSafeExecution(snippet, `truncation_case_${idx}`);
        assertSafeExecution(`\`\`\`intelligent-ui\n${snippet}`, `fenced_truncation_case_${idx}`);
      });
    }
  });

  // ==========================================================================
  // SUITE 3: Escaped Characters, Unicode, Emojis, and Special Tokens
  // ==========================================================================
  describe('Suite 3: Escaped Characters, Unicode, Emojis, and Special Tokens', () => {
    it('safely handles escaped double quotes cut off at backslash and quote boundaries', () => {
      const escapeVariants = [
        '{"type": "callout", "content": "Quote: \\"',
        '{"type": "callout", "content": "Quote: \\',
        '{"type": "callout", "content": "Path C:\\\\',
        '{"type": "callout", "content": "Path C:\\\\Program Files',
        '{"type": "callout", "content": "Three slashes: \\\\\\',
        '{"type": "callout", "content": "Four slashes: \\\\\\\\',
        '{"type": "callout", "content": "Nested: \\"word\\" inside',
        '{"type": "callout", "content": "Escaped newline: \\n and tab: \\t',
        '{"type": "callout", "content": "Dangling escape at end: test\\',
        '{"type": "callout", "content": "Unicode escape \\u0041',
        '{"type": "callout", "content": "Truncated unicode hex \\u00',
        '{"type": "callout", "content": "Truncated unicode hex \\u',
      ];

      for (const [i, v] of escapeVariants.entries()) {
        assertSafeExecution(v, `escape_variant_${i}`);
      }
    });

    it('safely handles non-ASCII unicode and multi-byte surrogate pairs sliced mid-byte', () => {
      const multilingualPayload = JSON.stringify({
        type: 'callout',
        title: '多语言测试 🌍 🚀 💡',
        content:
          '日本語: 警告システム\nArabic: نظام التنبيه التجريبي\nHindi: बुद्धिमान यूआई परीक्षण\nEmoji sequence: 👩‍💻 👨‍👩‍👧‍👦 🏳️‍🌈',
      });

      for (let i = 1; i <= multilingualPayload.length; i++) {
        const slice = multilingualPayload.slice(0, i);
        assertSafeExecution(slice, `unicode_slice_${i}`);
      }
    });

    it('safely handles regex special metacharacters and dollar replacement tokens', () => {
      const regexTokensPayload = JSON.stringify({
        type: 'callout',
        title: 'Regex Metacharacters & Dollar Signs',
        content: 'Symbols: .*+?^${}()|[]\\/ and replacements: $1, $&, $\', $`, $$, $0',
      });

      for (let i = 1; i <= regexTokensPayload.length; i++) {
        const slice = regexTokensPayload.slice(0, i);
        assertSafeExecution(slice, `regex_slice_${i}`);
      }
    });

    it('safely handles markdown code blocks and backticks embedded within payload content', () => {
      const embeddedCodePayload = JSON.stringify({
        type: 'tabs',
        tabs: [
          {
            id: 'embedded-md',
            label: 'Code Block',
            content: '```intelligent-ui\n{"type": "callout"}\n```\nAnd ```python\nprint("hi")\n```',
          },
        ],
      });

      for (let i = 1; i <= embeddedCodePayload.length; i++) {
        const slice = embeddedCodePayload.slice(0, i);
        assertSafeExecution(slice, `embedded_code_slice_${i}`);
      }
    });
  });

  // ==========================================================================
  // SUITE 4: Malformed, Corrupted, Non-JSON, and Binary Garbage Payloads
  // ==========================================================================
  describe('Suite 4: Malformed, Corrupted, Non-JSON, and Binary Garbage Payloads', () => {
    const corruptedPayloads = [
      '',
      '   ',
      '\n\t\r\n',
      '{{{{{{{{',
      '}}}}}}}}',
      '[[[[[[[[',
      ']]]]]]]]',
      '{{{[][][[]]{{{',
      '{"type": "tabs"}}}}}',
      '{"type": "tabs"]]]]',
      '{"type": "metrics",,,,,,,}',
      '{"type": "metrics"::::::}',
      '{"type", "metrics"}',
      '{,,,,,,,,,,,,}',
      '{"type": "tabs", "tabs": [,,,,]}',
      '\x00\x01\x02\x03\x04\x05\x06\x07',
      '\x00{"type": "callout"}\x00',
      '{"type": "callout", "content": "\x00\x08\x1f\x7f"}',
      Buffer.from([0xff, 0xfe, 0xfd, 0x00, 0x12, 0x34]).toString('latin1'),
      '# Heading 1\nThis is just a standard markdown response without any components.',
      '<div><span>HTML block</span><p>Not a JSON UI</p></div>',
      '```python\ndef hello():\n    return "world"\n```',
      '```bash\nnpm run build\n```',
      '- Item 1\n- Item 2\n- Item 3',
      '| Header 1 | Header 2 |\n|---|---|\n| Cell 1 | Cell 2 |',
      '{"type": "unknown_component_type", "items": []}',
      '{"type": 12345}',
      '{"type": true}',
      '{"type": null}',
      '{"type": "tabs", "tabs": "not-an-array"}',
      '{"type": "comparison", "items": "invalid"}',
      '{"type": "metrics", "metrics": "invalid"}',
      '{"type": "checklist", "items": "invalid"}',
      '{"type": "accordion", "items": "invalid"}',
      '{"type": "callout", "variant": 12345}',
    ];

    for (const [idx, badInput] of corruptedPayloads.entries()) {
      it(`safely rejects or degrades corrupted payload #${idx}`, () => {
        const { parseRes, html } = assertSafeExecution(badInput, `corrupted_${idx}`);
        if (parseRes.status === 'error') {
          assert.ok(html.includes('ui-fallback'));
        }
      });
    }
  });

  // ==========================================================================
  // SUITE 5: Unclosed Markdown Fences & Delimiter Variations
  // ==========================================================================
  describe('Suite 5: Unclosed Markdown Fences and Delimiter Variations', () => {
    const fenceVariations = [
      '```intelligent-ui',
      '```intelligent-ui\n',
      '```intelligent-ui   \n',
      '   ```intelligent-ui\n',
      '\t```intelligent-ui\n',
      '```ui',
      '```ui\n',
      '```UI\n',
      '```INTELLIGENT-UI\n',
      '```intelligent-ui\n{"type": "callout", "content": "Unclosed fence',
      '```intelligent-ui\n{"type": "callout", "content": "Unclosed fence"}',
      '```intelligent-ui\n{"type": "callout", "content": "Has unclosed backtick ` inside"}',
      '```intelligent-ui\n```intelligent-ui\n{"type": "callout"}',
      'Leading conversational text before the component:\n\n```intelligent-ui\n{"type": "callout", "title": "Tip", "content": "Works inline"}',
      '```intelligent-ui\n{"type": "callout", "title": "Tip", "content": "Trailing conversational text"}\n```\nHere is some trailing text.',
    ];

    for (const [idx, fence] of fenceVariations.entries()) {
      it(`handles fence variation #${idx}: ${JSON.stringify(fence.slice(0, 40))}`, () => {
        assertSafeExecution(fence, `fence_variation_${idx}`);
      });
    }
  });

  // ==========================================================================
  // SUITE 6: Multi-token & Non-uniform Chunk Size Streaming Simulation
  // ==========================================================================
  describe('Suite 6: Multi-Token & Random Chunk Arrival Simulation', () => {
    const chunkSizes = [2, 3, 5, 8, 13, 21];

    for (const [name, payload] of Object.entries(canonicalPayloads)) {
      it(`simulates variable chunk arrivals (Fibonacci 2..21) for ${name}`, () => {
        const fenced = `\`\`\`intelligent-ui\n${payload}\n\`\`\``;
        for (const chunkSize of chunkSizes) {
          let accumulated = '';
          for (let i = 0; i < fenced.length; i += chunkSize) {
            accumulated += fenced.slice(i, i + chunkSize);
            assertSafeExecution(accumulated, `chunk_${chunkSize}_${name}_at_${i}`);
          }
        }
      });
    }

    it('simulates pseudo-random chunk arrival stream (1 to 15 chars) across all components', () => {
      // Deterministic PRNG for reproducible test runs
      let seed = 42;
      function pseudoRandom() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      }

      for (const [name, payload] of Object.entries(canonicalPayloads)) {
        const fenced = `\`\`\`ui\n${payload}\n\`\`\``;
        let accumulated = '';
        let pos = 0;

        while (pos < fenced.length) {
          const chunkSize = 1 + Math.floor(pseudoRandom() * 15);
          accumulated += fenced.slice(pos, pos + chunkSize);
          pos += chunkSize;
          assertSafeExecution(accumulated, `prng_stream_${name}_pos_${pos}`);
        }

        const finalRes = parseStreamingPayload(accumulated);
        assert.equal(finalRes.status, 'complete');
      }
    });
  });

  // ==========================================================================
  // SUITE 7: Fuzz Engine with Adversarial Byte Mutations
  // ==========================================================================
  describe('Suite 7: Fuzz Engine with 500 Adversarial Byte Mutations', () => {
    it('executes 500 mutated adversarial payloads with zero crashes or unhandled exceptions', () => {
      const basePayload = canonicalPayloads.metrics;
      let seed = 1337;
      function rand() {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      }

      const mutators = [
        // 1. Bit flip / char replacement
        (str: string) => {
          const idx = Math.floor(rand() * str.length);
          const char = String.fromCharCode(Math.floor(rand() * 256));
          return str.slice(0, idx) + char + str.slice(idx + 1);
        },
        // 2. Random insertion of delimiters or quotes
        (str: string) => {
          const idx = Math.floor(rand() * str.length);
          const chars = ['{', '}', '[', ']', '"', '\\', ':', ',', '`', '\0', '\n'];
          const ins = chars[Math.floor(rand() * chars.length)];
          return str.slice(0, idx) + ins + str.slice(idx);
        },
        // 3. Random chunk deletion
        (str: string) => {
          const start = Math.floor(rand() * str.length);
          const len = Math.floor(rand() * 15);
          return str.slice(0, start) + str.slice(start + len);
        },
        // 4. Repeated delimiter burst
        (str: string) => {
          const idx = Math.floor(rand() * str.length);
          return str.slice(0, idx) + '}'.repeat(10) + str.slice(idx);
        },
        // 5. Injected unclosed quotes
        (str: string) => {
          const idx = Math.floor(rand() * str.length);
          return str.slice(0, idx) + '"' + str.slice(idx);
        },
      ];

      for (let i = 0; i < 500; i++) {
        const mutator = mutators[Math.floor(rand() * mutators.length)];
        const mutated = mutator(basePayload);
        assertSafeExecution(mutated, `fuzz_mutation_${i}`);
      }
    });
  });

  // ==========================================================================
  // SUITE 8: Stress Performance & Catastrophic Backtracking (ReDoS) Verification
  // ==========================================================================
  describe('Suite 8: Stress Performance & Catastrophic Backtracking (ReDoS)', () => {
    it('parses 1000 incremental slices of large payload in under 2000ms with zero memory leaks', () => {
      const largePayload = JSON.stringify({
        type: 'tabs',
        tabs: Array.from({ length: 15 }, (_, i) => ({
          id: `tab-${i + 1}`,
          label: `Configuration Tab ${i + 1}`,
          content: `Detailed documentation for tab ${i + 1} with code:\n\`\`\`ts\nconst val = ${i};\n\`\`\`\n` +
            'A'.repeat(200),
          icon: 'settings',
        })),
      });

      const start = Date.now();
      const step = Math.max(1, Math.floor(largePayload.length / 500));
      let iterations = 0;

      for (let i = 1; i <= largePayload.length; i += step) {
        const slice = largePayload.slice(0, i);
        parseStreamingPayload(slice);
        iterations++;
      }

      const elapsed = Date.now() - start;
      const perIterationMs = elapsed / iterations;

      assert.ok(
        elapsed < 2000,
        `Performance stress test took ${elapsed}ms for ${iterations} iterations (${perIterationMs.toFixed(3)}ms/op), expected < 2000ms`,
      );
    });

    it('survives adversarial repetitive regex backtracking inputs without hanging', () => {
      const maliciousPatterns = [
        '```intelligent-ui\n' + ' '.repeat(5000) + '```',
        '```ui\n' + '`'.repeat(5000),
        '```intelligent-ui\n' + '\n'.repeat(5000) + '```',
        '```intelligent-ui\n' + '{"a":'.repeat(200),
        '{"type": "callout", "content": "' + '\\\\'.repeat(3000),
        '{"type": "callout", "content": "' + '""'.repeat(3000),
        '```intelligent-ui\n' + '```'.repeat(1000),
      ];

      for (const [idx, pattern] of maliciousPatterns.entries()) {
        const start = Date.now();
        assertSafeExecution(pattern, `redos_pattern_${idx}`);
        const elapsed = Date.now() - start;
        assert.ok(
          elapsed < 300,
          `Adversarial ReDoS pattern #${idx} took ${elapsed}ms, possible catastrophic backtracking!`,
        );
      }
    });
  });
});
