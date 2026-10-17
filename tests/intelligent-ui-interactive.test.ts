import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ChecklistComponentView } from '../components/intelligent-ui/checklist';
import { MetricsComponentView } from '../components/intelligent-ui/metrics';
import { CalloutComponentView } from '../components/intelligent-ui/callout';
import type { ChecklistItem, MetricItem, CalloutVariant } from '../components/intelligent-ui/types';

describe('Interactive UI Components (Milestone M2B)', () => {
  describe('ChecklistComponentView', () => {
    it('renders checklist container, title, completion counter, and progress bar', () => {
      const items: ChecklistItem[] = [
        { id: 'item-1', text: 'Step 1: Setup database', checked: true },
        { id: 'item-2', text: 'Step 2: Run migrations', checked: false },
        { id: 'item-3', text: 'Step 3: Seed demo data', checked: false },
      ];

      const html = renderToStaticMarkup(
        React.createElement(ChecklistComponentView, {
          title: 'Database Setup',
          items,
        }),
      );

      assert.ok(html.includes('class="ui-checklist"'));
      assert.ok(html.includes('Database Setup'));
      assert.ok(html.includes('ui-checklist-title'));
      assert.ok(html.includes('Completed: 1 / 3 (33%)'));
      assert.ok(html.includes('class="ui-checklist-progress"'));
      assert.ok(html.includes('class="ui-checklist-progress-bar"'));
      assert.ok(html.includes('style="width:33%"'));
    });

    it('renders checked items with check icon, checked class, and done strikethrough', () => {
      const items: ChecklistItem[] = [
        { id: 'item-1', text: 'Completed task', checked: true },
        { id: 'item-2', text: 'Pending task', checked: false },
      ];

      const html = renderToStaticMarkup(
        React.createElement(ChecklistComponentView, {
          items,
        }),
      );

      // Checkbox buttons
      assert.ok(html.includes('class="ui-checklist-box checked"'));
      assert.ok(html.includes('aria-checked="true"'));
      assert.ok(html.includes('class="ui-checklist-text done"'));

      // Pending checkbox button
      assert.ok(html.includes('class="ui-checklist-box"'));
      assert.ok(html.includes('aria-checked="false"'));
      assert.ok(html.includes('class="ui-checklist-text"'));
    });

    it('renders required badge when item.required is true', () => {
      const items: ChecklistItem[] = [
        { id: 'c1', text: 'Accept Terms of Service', checked: false, required: true },
        { id: 'c2', text: 'Optional feedback survey', checked: false, required: false },
      ];

      const html = renderToStaticMarkup(
        React.createElement(ChecklistComponentView, {
          items,
        }),
      );

      assert.ok(html.includes('ui-checklist-required'));
      assert.ok(html.includes('Required'));
    });

    it('handles empty items array gracefully without crashing', () => {
      const html = renderToStaticMarkup(
        React.createElement(ChecklistComponentView, {
          items: [],
        }),
      );

      assert.ok(html.includes('class="ui-checklist"'));
      assert.ok(html.includes('Completed: 0 / 0 (0%)'));
      assert.ok(html.includes('style="width:0%"'));
    });

    it('supports wrapped data prop contract', () => {
      const html = renderToStaticMarkup(
        React.createElement(ChecklistComponentView, {
          data: {
            type: 'checklist',
            title: 'Wrapped Props Test',
            items: [{ id: '1', text: 'Test item', checked: true }],
          },
        }),
      );

      assert.ok(html.includes('Wrapped Props Test'));
      assert.ok(html.includes('Completed: 1 / 1 (100%)'));
      assert.ok(html.includes('style="width:100%"'));
    });
  });

  describe('MetricsComponentView', () => {
    it('renders stat grid with labels, values, and units', () => {
      const metrics: MetricItem[] = [
        { label: 'Throughput', value: '14,200', unit: 'req/s' },
        { label: 'Uptime', value: 99.99, unit: '%' },
      ];

      const html = renderToStaticMarkup(
        React.createElement(MetricsComponentView, {
          metrics,
        }),
      );

      assert.ok(html.includes('class="ui-stat-grid"'));
      assert.ok(html.includes('class="ui-stat-card"'));
      assert.ok(html.includes('Throughput'));
      assert.ok(html.includes('14,200'));
      assert.ok(html.includes('req/s'));
      assert.ok(html.includes('class="ui-stat-unit"'));
      assert.ok(html.includes('Uptime'));
      assert.ok(html.includes('99.99'));
    });

    it('renders trend badges for up, down, and neutral directions with delta change strings', () => {
      const metrics: MetricItem[] = [
        { label: 'Latency', value: '18ms', trend: 'down', change: '-42% vs baseline' },
        { label: 'Signups', value: '1,250', trend: 'up', change: '+18.4%' },
        { label: 'Memory', value: '4.2GB', trend: 'neutral', change: 'no delta' },
      ];

      const html = renderToStaticMarkup(
        React.createElement(MetricsComponentView, {
          metrics,
        }),
      );

      // Trend indicators and delta classes
      assert.ok(html.includes('ui-stat-trend'));
      assert.ok(html.includes('ui-stat-delta'));
      assert.ok(html.includes('negative down'));
      assert.ok(html.includes('-42% vs baseline'));
      assert.ok(html.includes('positive up'));
      assert.ok(html.includes('+18.4%'));
      assert.ok(html.includes('neutral'));
      assert.ok(html.includes('no delta'));
    });

    it('renders description captions when provided', () => {
      const metrics: MetricItem[] = [
        {
          label: 'Error Rate',
          value: '0.001%',
          description: 'Calculated over trailing 24 hours',
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(MetricsComponentView, {
          metrics,
        }),
      );

      assert.ok(html.includes('ui-stat-description'));
      assert.ok(html.includes('ui-stat-caption'));
      assert.ok(html.includes('Calculated over trailing 24 hours'));
    });

    it('handles empty metrics array gracefully', () => {
      const html = renderToStaticMarkup(
        React.createElement(MetricsComponentView, {
          metrics: [],
        }),
      );

      assert.ok(html.includes('class="ui-stat-grid"'));
      assert.ok(!html.includes('class="ui-stat-card"'));
    });
  });

  describe('CalloutComponentView', () => {
    const variants: CalloutVariant[] = ['info', 'note', 'tip', 'warning', 'success'];

    variants.forEach((variant) => {
      it(`renders callout with variant: ${variant}`, () => {
        const html = renderToStaticMarkup(
          React.createElement(CalloutComponentView, {
            variant,
            title: `${variant.toUpperCase()} Title`,
            content: `This is a **${variant}** callout message.`,
          }),
        );

        assert.ok(html.includes(`ui-callout ui-callout-${variant}`));
        assert.ok(html.includes('class="ui-callout-icon"'));
        assert.ok(html.includes('class="ui-callout-body"'));
        assert.ok(html.includes('class="ui-callout-title"'));
        assert.ok(html.includes(`${variant.toUpperCase()} Title`));
        assert.ok(html.includes('class="ui-callout-content"'));
      });
    });

    it('renders callout without title gracefully', () => {
      const html = renderToStaticMarkup(
        React.createElement(CalloutComponentView, {
          variant: 'note',
          content: 'Just a plain note without title.',
        }),
      );

      assert.ok(html.includes('ui-callout ui-callout-note'));
      assert.ok(!html.includes('ui-callout-title'));
      assert.ok(html.includes('ui-callout-content'));
    });

    it('normalizes unrecognized variant to info', () => {
      const html = renderToStaticMarkup(
        React.createElement(CalloutComponentView, {
          variant: 'unknown-variant' as unknown as CalloutVariant,
          content: 'Fallback test',
        }),
      );

      assert.ok(html.includes('ui-callout ui-callout-info'));
    });

    it('renders warning variant with alert role', () => {
      const html = renderToStaticMarkup(
        React.createElement(CalloutComponentView, {
          variant: 'warning',
          title: 'Careful',
          content: 'Breaking change ahead',
        }),
      );

      assert.ok(html.includes('role="alert"'));
    });
  });
});
