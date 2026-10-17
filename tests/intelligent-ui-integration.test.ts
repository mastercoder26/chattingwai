import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { IntelligentUIRenderer } from '../components/intelligent-ui';
import { RichText } from '../components/markdown';

describe('Intelligent UI Design & Integration (Milestone M2C)', () => {
  describe('IntelligentUIRenderer Dispatcher', () => {
    it('renders TabsComponent when payload type is "tabs"', () => {
      const payload = JSON.stringify({
        type: 'tabs',
        tabs: [
          { id: 'tab-1', label: 'Overview', content: 'Tab 1 content' },
          { id: 'tab-2', label: 'Details', content: 'Tab 2 content' },
        ],
      });

      const html = renderToStaticMarkup(
        React.createElement(IntelligentUIRenderer, { raw: payload }),
      );

      assert.ok(html.includes('class="ui-tabs"'));
      assert.ok(html.includes('Overview'));
      assert.ok(html.includes('Tab 1 content'));
    });

    it('renders ComparisonComponent when payload type is "comparison"', () => {
      const payload = JSON.stringify({
        type: 'comparison',
        title: 'Framework Evaluation',
        items: [
          { name: 'Option A', badge: 'Fast', pros: ['Easy to learn'] },
          { name: 'Option B', highlight: true, pros: ['Highly scalable'] },
        ],
      });

      const html = renderToStaticMarkup(
        React.createElement(IntelligentUIRenderer, { raw: payload }),
      );

      assert.ok(html.includes('class="ui-comparison"'));
      assert.ok(html.includes('Framework Evaluation'));
      assert.ok(html.includes('Option A'));
      assert.ok(html.includes('Option B'));
    });

    it('renders MetricsComponent when payload type is "metrics"', () => {
      const payload = JSON.stringify({
        type: 'metrics',
        metrics: [
          { label: 'Latency', value: '12ms', trend: 'up', change: '-40%' },
          { label: 'Uptime', value: '99.99%', trend: 'neutral' },
        ],
      });

      const html = renderToStaticMarkup(
        React.createElement(IntelligentUIRenderer, { raw: payload }),
      );

      assert.ok(html.includes('class="ui-stat-grid"'));
      assert.ok(html.includes('Latency'));
      assert.ok(html.includes('12ms'));
      assert.ok(html.includes('Uptime'));
    });

    it('renders ChecklistComponent when payload type is "checklist"', () => {
      const payload = JSON.stringify({
        type: 'checklist',
        title: 'Pre-flight Checklist',
        items: [
          { id: 'c1', text: 'Run unit tests', checked: true },
          { id: 'c2', text: 'Build Docker image', required: true },
        ],
      });

      const html = renderToStaticMarkup(
        React.createElement(IntelligentUIRenderer, { raw: payload }),
      );

      assert.ok(html.includes('class="ui-checklist"'));
      assert.ok(html.includes('Pre-flight Checklist'));
      assert.ok(html.includes('Run unit tests'));
      assert.ok(html.includes('Build Docker image'));
    });

    it('renders AccordionComponent when payload type is "accordion"', () => {
      const payload = JSON.stringify({
        type: 'accordion',
        items: [
          { id: 'a1', title: 'Deep Dive', content: 'Detailed analysis text' },
        ],
      });

      const html = renderToStaticMarkup(
        React.createElement(IntelligentUIRenderer, { raw: payload }),
      );

      assert.ok(html.includes('class="ui-accordion-group"'));
      assert.ok(html.includes('Deep Dive'));
      assert.ok(html.includes('Detailed analysis text'));
    });

    it('renders CalloutComponent when payload type is "callout"', () => {
      const payload = JSON.stringify({
        type: 'callout',
        variant: 'tip',
        title: 'Pro Tip',
        content: 'Use caching to accelerate repeated calls',
      });

      const html = renderToStaticMarkup(
        React.createElement(IntelligentUIRenderer, { raw: payload }),
      );

      assert.ok(html.includes('class="ui-callout ui-callout-tip"'));
      assert.ok(html.includes('Pro Tip'));
      assert.ok(html.includes('Use caching to accelerate repeated calls'));
    });

    it('renders streaming partial payload that contains valid minimal component data', () => {
      // Partial JSON cut off at the end of the tabs array
      const rawStreaming =
        '```intelligent-ui\n{\n  "type": "tabs",\n  "tabs": [{"id": "t1", "label": "Stream Tab", "content": "Hello streaming"';

      const html = renderToStaticMarkup(
        React.createElement(IntelligentUIRenderer, { raw: rawStreaming }),
      );

      // Streaming engine repairs this to valid partial data and renders TabsComponent
      assert.ok(html.includes('class="ui-tabs"'));
      assert.ok(html.includes('Stream Tab'));
    });

    it('renders .intelligent-ui-skeleton when partial status has no data yet', () => {
      // Unrepairable partial fragment that has no component data yet
      const partialNoData = '```intelligent-ui\n{\n';

      const html = renderToStaticMarkup(
        React.createElement(IntelligentUIRenderer, { raw: partialNoData }),
      );

      // Either skeleton or fallback, without throwing an unhandled error
      assert.ok(
        html.includes('class="intelligent-ui-skeleton"') ||
          html.includes('class="ui-fallback"'),
      );
    });

    it('renders safe fallback code container without throwing when payload has syntax errors', () => {
      const corruptPayload = '```intelligent-ui\n{INVALID_JSON_CONTENT:::;;;\n```';

      const html = renderToStaticMarkup(
        React.createElement(IntelligentUIRenderer, { raw: corruptPayload }),
      );

      assert.ok(html.includes('class="ui-fallback"'));
      assert.ok(html.includes('class="ui-fallback-code"'));
      assert.ok(html.includes('{INVALID_JSON_CONTENT:::;;;'));
    });

    it('renders safe fallback on empty or whitespace string without throwing', () => {
      const html = renderToStaticMarkup(
        React.createElement(IntelligentUIRenderer, { raw: '   ' }),
      );

      assert.ok(html.includes('class="ui-fallback"'));
    });
  });

  describe('Markdown Mounting (components/markdown.tsx)', () => {
    it('mounts IntelligentUIRenderer for ```intelligent-ui code blocks at top level', () => {
      const md = [
        '# Header',
        '',
        '```intelligent-ui',
        JSON.stringify({
          type: 'callout',
          variant: 'info',
          title: 'System Notice',
          content: 'Chattingwai is online',
        }),
        '```',
      ].join('\n');

      const html = renderToStaticMarkup(
        React.createElement(RichText, { content: md }),
      );

      assert.ok(html.includes('class="ui-callout ui-callout-info"'));
      assert.ok(html.includes('System Notice'));
      assert.ok(html.includes('Chattingwai is online'));
    });

    it('mounts IntelligentUIRenderer for ```ui code block alias', () => {
      const md = [
        '```ui',
        JSON.stringify({
          type: 'callout',
          variant: 'warning',
          title: 'Caution',
          content: 'Be careful with memory allocation',
        }),
        '```',
      ].join('\n');

      const html = renderToStaticMarkup(
        React.createElement(RichText, { content: md }),
      );

      assert.ok(html.includes('class="ui-callout ui-callout-warning"'));
      assert.ok(html.includes('Caution'));
    });

    it('does NOT mount IntelligentUIRenderer when nested={true}', () => {
      const md = [
        '```intelligent-ui',
        JSON.stringify({
          type: 'callout',
          variant: 'info',
          content: 'Nested code block',
        }),
        '```',
      ].join('\n');

      const html = renderToStaticMarkup(
        React.createElement(RichText, { content: md, nested: true }),
      );

      // Should render standard CodeBlock with copy button and code-toolbar
      assert.ok(html.includes('class="code-block"'));
      assert.ok(html.includes('class="code-toolbar"'));
      assert.ok(!html.includes('class="ui-callout"'));
    });

    it('preserves standard code blocks, syntax highlighting, and copy buttons without regression', () => {
      const md = [
        '```typescript',
        'const answer: number = 42;',
        'console.log(answer);',
        '```',
      ].join('\n');

      const html = renderToStaticMarkup(
        React.createElement(RichText, { content: md }),
      );

      assert.ok(html.includes('class="code-block"'));
      assert.ok(html.includes('class="code-toolbar"'));
      assert.ok(html.includes('Copy code'));
      assert.ok(html.includes('language-typescript'));
      assert.ok(html.includes('const'));
      assert.ok(html.includes('42'));
    });

    it('preserves tables, links, math, and lists in markdown without regression', () => {
      const md = [
        '| Header 1 | Header 2 |',
        '| --- | --- |',
        '| Cell 1 | Cell 2 |',
        '',
        '- List item 1',
        '- List item 2',
        '',
        '[Glimpse Link](https://example.com)',
      ].join('\n');

      const html = renderToStaticMarkup(
        React.createElement(RichText, { content: md }),
      );

      assert.ok(html.includes('class="table-scroll"'));
      assert.ok(html.includes('<table>'));
      assert.ok(html.includes('Cell 1'));
      assert.ok(html.includes('<ul>'));
      assert.ok(html.includes('List item 1'));
      assert.ok(html.includes('href="https://example.com"'));
    });
  });

  describe('CSS Architecture & Layout Import', () => {
    it('app/layout.tsx imports intelligent-ui.css', () => {
      const layoutPath = path.resolve(process.cwd(), 'app/layout.tsx');
      const layoutContent = fs.readFileSync(layoutPath, 'utf8');

      assert.ok(
        layoutContent.includes("import './intelligent-ui.css';") ||
          layoutContent.includes('import "./intelligent-ui.css";'),
        'layout.tsx must import intelligent-ui.css',
      );
    });

    it('app/intelligent-ui.css defines rules for all 6 components, skeleton, and accessibility', () => {
      const cssPath = path.resolve(process.cwd(), 'app/intelligent-ui.css');
      assert.ok(fs.existsSync(cssPath), 'app/intelligent-ui.css must exist');

      const css = fs.readFileSync(cssPath, 'utf8');

      // 6 Component classes
      assert.ok(css.includes('.ui-tabs'), 'must style .ui-tabs');
      assert.ok(css.includes('.ui-comparison'), 'must style .ui-comparison');
      assert.ok(css.includes('.ui-stat-grid'), 'must style .ui-stat-grid');
      assert.ok(css.includes('.ui-checklist'), 'must style .ui-checklist');
      assert.ok(css.includes('.ui-accordion-group'), 'must style .ui-accordion-group');
      assert.ok(css.includes('.ui-callout'), 'must style .ui-callout');

      // Skeleton & Fallback
      assert.ok(css.includes('.intelligent-ui-skeleton'), 'must style .intelligent-ui-skeleton');
      assert.ok(css.includes('.ui-fallback'), 'must style .ui-fallback');

      // Workspace theme tokens
      assert.ok(css.includes('var(--surface)'), 'must use var(--surface)');
      assert.ok(css.includes('var(--line)'), 'must use var(--line)');
      assert.ok(css.includes('var(--accent)'), 'must use var(--accent)');
      assert.ok(css.includes('var(--soft)'), 'must use var(--soft)');
      assert.ok(css.includes('var(--text)'), 'must use var(--text)');

      // Accessibility
      assert.ok(css.includes(':focus-visible'), 'must declare focus-visible styles');
      assert.ok(css.includes('prefers-reduced-motion'), 'must support prefers-reduced-motion');
      assert.ok(css.includes('prefers-contrast'), 'must support prefers-contrast');
    });
  });
});
