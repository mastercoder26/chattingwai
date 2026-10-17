import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  repairStreamingJson,
  parseStreamingPayload,
  extractJsonPayload,
} from '../components/intelligent-ui/parser';
import {
  tabsSchema,
  comparisonSchema,
  metricsSchema,
  checklistSchema,
  accordionSchema,
  calloutSchema,
  intelligentUIComponentSchema,
  validateIntelligentUI,
} from '../components/intelligent-ui/schema';
import type { IntelligentUIComponent } from '../components/intelligent-ui/types';

describe('Intelligent UI Parser & Streaming Engine (Milestone M1)', () => {
  // ==========================================================================
  // SUITE 1: Full Payloads for all 6 Components
  // ==========================================================================
  describe('Full Payloads for All 6 Components', () => {
    it('parses complete TabsComponent with markdown and icons', () => {
      const raw = JSON.stringify({
        type: 'tabs',
        activeTab: 'tab-2',
        tabs: [
          { id: 'tab-1', label: 'Overview', content: '# Welcome\nThis is overview.', icon: 'info' },
          { id: 'tab-2', label: 'Code', content: '```ts\nconst x = 1;\n```', icon: 'code' },
        ],
      });
      const result = parseStreamingPayload(raw);
      assert.equal(result.status, 'complete');
      assert.ok(result.data);
      if (result.data?.type === 'tabs') {
        assert.equal(result.data.activeTab, 'tab-2');
        assert.equal(result.data.tabs.length, 2);
        assert.equal(result.data.tabs[0].label, 'Overview');
        assert.equal(result.data.tabs[1].content, '```ts\nconst x = 1;\n```');
      }
    });

    it('parses TabsComponent with "items" alias and defaults activeTab to first tab', () => {
      const raw = JSON.stringify({
        type: 'tabs',
        items: [
          { id: 'first', label: 'First', content: 'First content' },
          { id: 'second', label: 'Second', content: 'Second content' },
        ],
      });
      const result = parseStreamingPayload(raw);
      assert.equal(result.status, 'complete');
      if (result.data?.type === 'tabs') {
        assert.equal(result.data.activeTab, 'first');
        assert.equal(result.data.tabs.length, 2);
      }
    });

    it('parses complete ComparisonComponent with details record and details array', () => {
      const raw = JSON.stringify({
        type: 'comparison',
        title: 'Compute Architecture Comparison',
        subtitle: 'Serverless vs Dedicated',
        items: [
          {
            name: 'AWS Lambda',
            badge: 'Serverless',
            highlight: true,
            price: '$0.20 / 1M req',
            pros: ['Zero idle cost', 'Automatic horizontal scale'],
            cons: ['Cold starts', '15-min execution limit'],
            details: { runtime: 'Node / Python', maxMemory: '10GB' },
          },
          {
            name: 'EC2 Dedicated',
            badge: 'Traditional',
            highlight: false,
            price: '$0.0464 / hr',
            pros: ['Predictable latency', 'Unlimited run duration'],
            cons: ['Idle costs', 'Manual scaling'],
            details: [
              { key: 'vCPU', value: '2' },
              { key: 'RAM', value: '8GB' },
            ],
          },
        ],
      });
      const result = parseStreamingPayload(raw);
      assert.equal(result.status, 'complete');
      if (result.data?.type === 'comparison') {
        assert.equal(result.data.title, 'Compute Architecture Comparison');
        assert.equal(result.data.items.length, 2);
        assert.equal(result.data.items[0].highlight, true);
        assert.deepEqual(result.data.items[0].details, {
          runtime: 'Node / Python',
          maxMemory: '10GB',
        });
        assert.deepEqual(result.data.items[1].details, [
          { key: 'vCPU', value: '2' },
          { key: 'RAM', value: '8GB' },
        ]);
      }
    });

    it('parses complete MetricsComponent and normalizes "stat" to "metrics"', () => {
      const raw = JSON.stringify({
        type: 'stat',
        metrics: [
          {
            label: 'Total Requests',
            value: 1250000,
            unit: 'reqs',
            change: '+14%',
            trend: 'up',
            description: 'Monthly traffic volume',
          },
          {
            label: 'Avg Response Time',
            value: '42ms',
            change: '-8%',
            trend: 'down',
            description: 'Global P50 latency',
          },
        ],
      });
      const result = parseStreamingPayload(raw);
      assert.equal(result.status, 'complete');
      if (result.data?.type === 'metrics') {
        assert.equal(result.data.type, 'metrics');
        assert.equal(result.data.metrics.length, 2);
        assert.equal(result.data.metrics[0].value, '1250000');
        assert.equal(result.data.metrics[0].trend, 'up');
        assert.equal(result.data.metrics[1].value, '42ms');
        assert.equal(result.data.metrics[1].trend, 'down');
      }
    });

    it('parses complete ChecklistComponent with mixed toggle and required flags', () => {
      const raw = JSON.stringify({
        type: 'checklist',
        title: 'Launch Checklist',
        items: [
          { id: 'chk-1', text: 'Configure DNS records', checked: true, required: true },
          { id: 'chk-2', text: 'Provision SSL certificates', checked: true, required: true },
          { id: 'chk-3', text: 'Enable CDN caching', checked: false, required: false },
        ],
      });
      const result = parseStreamingPayload(raw);
      assert.equal(result.status, 'complete');
      if (result.data?.type === 'checklist') {
        assert.equal(result.data.title, 'Launch Checklist');
        assert.equal(result.data.items.length, 3);
        assert.equal(result.data.items[0].checked, true);
        assert.equal(result.data.items[2].checked, false);
      }
    });

    it('parses complete AccordionComponent with defaultOpen configuration', () => {
      const raw = JSON.stringify({
        type: 'accordion',
        items: [
          {
            id: 'sec-1',
            title: 'Authentication & Session Flow',
            content: 'Sessions are stored in HTTP-only signed cookies.',
            defaultOpen: true,
          },
          {
            id: 'sec-2',
            title: 'Rate Limiting Strategy',
            content: 'Client IPs are bounded by sliding window token bucket.',
            defaultOpen: false,
          },
        ],
      });
      const result = parseStreamingPayload(raw);
      assert.equal(result.status, 'complete');
      if (result.data?.type === 'accordion') {
        assert.equal(result.data.items.length, 2);
        assert.equal(result.data.items[0].defaultOpen, true);
        assert.equal(result.data.items[1].defaultOpen, false);
      }
    });

    it('parses complete CalloutComponent across all variant types and aliases', () => {
      const variants = ['info', 'note', 'tip', 'warning', 'success'] as const;
      for (const variant of variants) {
        const raw = JSON.stringify({
          type: 'callout',
          variant,
          title: `${variant.toUpperCase()} Notice`,
          content: `This is a test ${variant} callout message.`,
        });
        const res = parseStreamingPayload(raw);
        assert.equal(res.status, 'complete');
        if (res.data?.type === 'callout') {
          assert.equal(res.data.variant, variant);
        }
      }

      // Test alias caution -> warning
      const aliasRaw = JSON.stringify({
        type: 'callout',
        variant: 'caution',
        content: 'Dangerous action ahead.',
      });
      const aliasRes = parseStreamingPayload(aliasRaw);
      assert.equal(aliasRes.status, 'complete');
      if (aliasRes.data?.type === 'callout') {
        assert.equal(aliasRes.data.variant, 'warning');
      }
    });
  });

  // ==========================================================================
  // SUITE 2: Delimiter Auto-Repair Engine
  // ==========================================================================
  describe('Delimiter Auto-Repair Algorithm (repairStreamingJson)', () => {
    it('closes unclosed double quotes inside string values', () => {
      const input = '{"type": "callout", "content": "This is a streaming mess';
      const repaired = repairStreamingJson(input);
      assert.doesNotThrow(() => JSON.parse(repaired));
      const parsed = JSON.parse(repaired);
      assert.equal(parsed.type, 'callout');
      assert.equal(parsed.content, 'This is a streaming mess');
    });

    it('respects escaped double quotes inside strings', () => {
      const input = '{"type": "tabs", "tabs": [{"id": "1", "label": "Say \\"Hello\\" World", "content": "';
      const repaired = repairStreamingJson(input);
      assert.doesNotThrow(() => JSON.parse(repaired));
      const parsed = JSON.parse(repaired);
      assert.equal(parsed.tabs[0].label, 'Say "Hello" World');
    });

    it('strips dangling backslash when cut off right at escape sequence', () => {
      // In JS: '{"content": "Path:\\'
      const input = '{"type": "callout", "content": "C:\\\\Windows\\\\';
      const repaired = repairStreamingJson(input);
      assert.doesNotThrow(() => JSON.parse(repaired));
    });

    it('closes nested objects and arrays in correct reverse stack order', () => {
      const input = '{"type": "comparison", "items": [{"name": "Item A", "details": {"sub": [1, 2';
      const repaired = repairStreamingJson(input);
      assert.doesNotThrow(() => JSON.parse(repaired));
      const parsed = JSON.parse(repaired);
      assert.deepEqual(parsed.items[0].details.sub, [1, 2]);
    });

    it('strips trailing commas before closing delimiters', () => {
      const input = '{"type": "checklist", "items": [{"id": "1", "text": "Task 1",},],}';
      const repaired = repairStreamingJson(input);
      assert.doesNotThrow(() => JSON.parse(repaired));
      const parsed = JSON.parse(repaired);
      assert.equal(parsed.items[0].text, 'Task 1');
    });

    it('handles incomplete property names cut off mid-key', () => {
      const input = '{"type": "callout", "variant": "info", "tit';
      const repaired = repairStreamingJson(input);
      assert.doesNotThrow(() => JSON.parse(repaired));
      const parsed = JSON.parse(repaired);
      assert.equal(parsed.type, 'callout');
      assert.equal(parsed.variant, 'info');
    });

    it('handles dangling colons with null value', () => {
      const input = '{"type": "callout", "title":';
      const repaired = repairStreamingJson(input);
      assert.doesNotThrow(() => JSON.parse(repaired));
      const parsed = JSON.parse(repaired);
      assert.equal(parsed.type, 'callout');
      assert.equal(parsed.title, null);
    });

    it('completes partial boolean and null literals (tr -> true, fa -> false, nu -> null)', () => {
      assert.equal(
        JSON.parse(repairStreamingJson('{"type": "checklist", "items": [{"checked": tr')).items[0]
          .checked,
        true,
      );
      assert.equal(
        JSON.parse(repairStreamingJson('{"type": "checklist", "items": [{"checked": fa')).items[0]
          .checked,
        false,
      );
      assert.equal(JSON.parse(repairStreamingJson('{"type": "callout", "title": nu')).title, null);
    });

    it('repairs truncated decimal numbers', () => {
      const input = '{"type": "metrics", "metrics": [{"label": "P99", "value": 42.';
      const repaired = repairStreamingJson(input);
      assert.doesNotThrow(() => JSON.parse(repaired));
      const parsed = JSON.parse(repaired);
      assert.equal(parsed.metrics[0].value, 42);
    });
  });

  // ==========================================================================
  // SUITE 3: Simulated Streaming Token Accumulation
  // ==========================================================================
  describe('Simulated Streaming Token Accumulation (Step-by-Step Resilience)', () => {
    const testPayloads = [
      {
        name: 'Tabs',
        json: JSON.stringify({
          type: 'tabs',
          activeTab: 'tab-1',
          tabs: [
            {
              id: 'tab-1',
              label: 'General',
              content: 'Primary markdown configuration.\n- Point 1\n- Point 2',
            },
            { id: 'tab-2', label: 'Advanced', content: 'Detailed settings with JSON and tables.' },
          ],
        }),
      },
      {
        name: 'Comparison',
        json: JSON.stringify({
          type: 'comparison',
          title: 'Database Choices',
          items: [
            {
              name: 'PostgreSQL',
              badge: 'Relational',
              highlight: true,
              pros: ['ACID compliance', 'Rich SQL'],
              cons: ['Vertical write scale'],
            },
            {
              name: 'Redis',
              badge: 'Key-Value',
              highlight: false,
              pros: ['Sub-millisecond speed'],
              cons: ['RAM cost'],
            },
          ],
        }),
      },
      {
        name: 'Checklist',
        json: JSON.stringify({
          type: 'checklist',
          title: 'Deploy Guide',
          items: [
            { id: '1', text: 'Run unit test suite', checked: true, required: true },
            { id: '2', text: 'Deploy canary image', checked: false, required: true },
          ],
        }),
      },
      {
        name: 'Accordion',
        json: JSON.stringify({
          type: 'accordion',
          items: [
            {
              id: 'acc-1',
              title: 'Section One',
              content: 'Paragraph description here.',
              defaultOpen: true,
            },
            { id: 'acc-2', title: 'Section Two', content: 'Hidden content until expanded.' },
          ],
        }),
      },
      {
        name: 'Callout',
        json: JSON.stringify({
          type: 'callout',
          variant: 'tip',
          title: 'Optimization',
          content: 'Enable gzip or Brotli compression on HTTP responses.',
        }),
      },
    ];

    for (const testCase of testPayloads) {
      it(`simulates streaming token chunks (every 5 chars) for ${testCase.name} wrapped in code fence`, () => {
        const fullMessage = `Here is the component:\n\`\`\`intelligent-ui\n${testCase.json}\n\`\`\`\nHope this helps!`;

        let accumulated = '';
        for (let i = 0; i < fullMessage.length; i += 5) {
          accumulated += fullMessage.slice(i, i + 5);
          // MUST NEVER THROW
          let res: ReturnType<typeof parseStreamingPayload> | undefined;
          assert.doesNotThrow(() => {
            res = parseStreamingPayload(accumulated);
          });
          assert.ok(res);
          assert.ok(['complete', 'partial', 'error'].includes(res.status));
          assert.equal(typeof res.raw, 'string');
        }

        // Final result on full stream must be complete and valid
        const finalRes = parseStreamingPayload(fullMessage);
        assert.equal(finalRes.status, 'complete');
        assert.ok(finalRes.data);
      });

      it(`simulates streaming token chunks (every 3 chars) on raw JSON for ${testCase.name}`, () => {
        let accumulated = '';
        for (let i = 0; i < testCase.json.length; i += 3) {
          accumulated += testCase.json.slice(i, i + 3);
          const res = parseStreamingPayload(accumulated);
          assert.ok(['complete', 'partial', 'error'].includes(res.status));
        }
        const finalRes = parseStreamingPayload(testCase.json);
        assert.equal(finalRes.status, 'complete');
      });
    }
  });

  // ==========================================================================
  // SUITE 4: Invalid, Corrupted, Non-JSON, and Malformed Payloads
  // ==========================================================================
  describe('Invalid, Corrupted, and Non-JSON Payloads', () => {
    it('returns status: error on empty or whitespace strings', () => {
      assert.equal(parseStreamingPayload('').status, 'error');
      assert.equal(parseStreamingPayload('   \n  \t  ').status, 'error');
      assert.equal(parseStreamingPayload('```intelligent-ui\n```').status, 'error');
    });

    it('returns status: error safely on non-string inputs', () => {
      // @ts-expect-error testing runtime safety
      const resNull = parseStreamingPayload(null);
      assert.equal(resNull.status, 'error');

      // @ts-expect-error testing runtime safety
      const resUndef = parseStreamingPayload(undefined);
      assert.equal(resUndef.status, 'error');

      // @ts-expect-error testing runtime safety
      const resNum = parseStreamingPayload(12345);
      assert.equal(resNum.status, 'error');
    });

    it('returns status: error on plain text, HTML, and binary data', () => {
      const inputs = [
        'Just normal conversational message text.',
        '<div><h3>Not JSON</h3></div>',
        '```ts\nconst x = 1;\n```',
        '\x00\x01\x02\xFF\xFE\xFD',
        '{"random_key": "no component type specified"}',
        '{"type": "nonexistent_component_type"}',
        '{"type": "tabs", "tabs": }}}',
      ];

      for (const input of inputs) {
        let res: ReturnType<typeof parseStreamingPayload> | undefined;
        assert.doesNotThrow(() => {
          res = parseStreamingPayload(input);
        });
        assert.equal(res?.status, 'error');
        assert.ok(typeof res?.error === 'string');
      }
    });

    it('handles multiple code blocks and isolates the intelligent-ui code fence', () => {
      const complexDoc = `
Intro text.

\`\`\`python
print("Hello Python")
\`\`\`

\`\`\`intelligent-ui
{
  "type": "callout",
  "variant": "info",
  "title": "Integrated Notice",
  "content": "Located between code blocks"
}
\`\`\`

\`\`\`json
{"other": "code block"}
\`\`\`
`;
      const res = parseStreamingPayload(complexDoc);
      assert.equal(res.status, 'complete');
      if (res.data?.type === 'callout') {
        assert.equal(res.data.title, 'Integrated Notice');
      }
    });
  });

  // ==========================================================================
  // SUITE 5: Boundary Cases (Unicode, Deep Nesting, Massive Payload)
  // ==========================================================================
  describe('Boundary Cases & Extreme Inputs', () => {
    it('preserves unicode, emojis, and multilingual text', () => {
      const raw = JSON.stringify({
        type: 'callout',
        variant: 'tip',
        title: '国際化サポート 🚀 (Internationalization)',
        content: 'Supports 한국어, 中文, العربية, and emojis: ✨ 💡 ⚡ 🛠️',
      });
      const res = parseStreamingPayload(raw);
      assert.equal(res.status, 'complete');
      if (res.data?.type === 'callout') {
        assert.equal(res.data.title, '国際化サポート 🚀 (Internationalization)');
        assert.match(res.data.content, /한국어/);
      }
    });

    it('handles massive payload (20KB+ markdown body) without performance degradation', () => {
      const largeContent = '# Heading\n' + 'Line of text with markdown **bold**.\n'.repeat(500);
      const raw = JSON.stringify({
        type: 'tabs',
        tabs: [
          { id: 't1', label: 'Big Tab', content: largeContent },
          { id: 't2', label: 'Small Tab', content: 'Normal length' },
        ],
      });
      const res = parseStreamingPayload(raw);
      assert.equal(res.status, 'complete');
      if (res.data?.type === 'tabs') {
        assert.equal(res.data.tabs[0].content.length > 15000, true);
      }
    });

    it('extractJsonPayload safely extracts unclosed streaming fence', () => {
      const streamingFence = '```intelligent-ui\n{"type": "tabs", "tabs": [{"id": "1", "label": "T"';
      const extracted = extractJsonPayload(streamingFence);
      assert.equal(extracted, '{"type": "tabs", "tabs": [{"id": "1", "label": "T"');
    });

    it('validateIntelligentUI validates individual schemas directly', () => {
      const validCallout: IntelligentUIComponent = {
        type: 'callout',
        variant: 'info',
        content: 'Direct validation test',
      };
      assert.equal(validateIntelligentUI(validCallout).success, true);
      assert.equal(validateIntelligentUI({ type: 'invalid' }).success, false);
      assert.equal(validateIntelligentUI('not an object').success, false);
    });

    it('exports all Zod component schemas for external consumers', () => {
      assert.ok(tabsSchema);
      assert.ok(comparisonSchema);
      assert.ok(metricsSchema);
      assert.ok(checklistSchema);
      assert.ok(accordionSchema);
      assert.ok(calloutSchema);
      assert.ok(intelligentUIComponentSchema);
    });
  });
});
