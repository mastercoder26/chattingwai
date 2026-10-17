import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { TabsComponentView } from '../components/intelligent-ui/tabs';
import { ComparisonComponentView } from '../components/intelligent-ui/comparison';
import { AccordionComponentView } from '../components/intelligent-ui/accordion';
import type { TabItem, ComparisonItem, AccordionItem } from '../components/intelligent-ui/types';

describe('Layout UI Components (Milestone M2A)', () => {
  describe('TabsComponentView', () => {
    it('renders segmented tab list, tab triggers, active tab panel, and ARIA attributes', () => {
      const tabs: TabItem[] = [
        { id: 'tab-1', label: 'Overview', content: 'Overview description text' },
        { id: 'tab-2', label: 'Implementation', content: 'Implementation details' },
        { id: 'tab-3', label: 'Benchmarks', content: 'Benchmark metrics' },
      ];

      const html = renderToStaticMarkup(
        React.createElement(TabsComponentView, {
          tabs,
          activeTab: 'tab-1',
        }),
      );

      // Container & region
      assert.ok(html.includes('class="ui-tabs"'));
      assert.ok(html.includes('role="region"'));
      assert.ok(html.includes('aria-label="Tabbed Views"'));

      // Tab list
      assert.ok(html.includes('class="ui-tabs-bar ui-tab-list"'));
      assert.ok(html.includes('role="tablist"'));
      assert.ok(html.includes('aria-orientation="horizontal"'));

      // First tab is active
      assert.ok(html.includes('id="ui-tab-tab-1"'));
      assert.ok(html.includes('aria-selected="true"'));
      assert.ok(html.includes('aria-controls="ui-tab-panel-tab-1"'));
      assert.ok(html.includes('tabindex="0"'));
      assert.ok(html.includes('class="ui-tab-trigger ui-tab-button active"'));
      assert.ok(html.includes('Overview'));

      // Second tab is inactive
      assert.ok(html.includes('id="ui-tab-tab-2"'));
      assert.ok(html.includes('aria-selected="false"'));
      assert.ok(html.includes('tabindex="-1"'));
      assert.ok(html.includes('class="ui-tab-trigger ui-tab-button "'));
      assert.ok(html.includes('Implementation'));

      // Active panel
      assert.ok(html.includes('class="ui-tab-panel"'));
      assert.ok(html.includes('role="tabpanel"'));
      assert.ok(html.includes('id="ui-tab-panel-tab-1"'));
      assert.ok(html.includes('aria-labelledby="ui-tab-tab-1"'));
      assert.ok(html.includes('Overview description text'));
    });

    it('honors explicit activeTab prop selecting second tab', () => {
      const tabs: TabItem[] = [
        { id: 'tab-a', label: 'Alpha', content: 'Alpha content' },
        { id: 'tab-b', label: 'Beta', content: 'Beta content' },
      ];

      const html = renderToStaticMarkup(
        React.createElement(TabsComponentView, {
          tabs,
          activeTab: 'tab-b',
        }),
      );

      assert.ok(html.includes('id="ui-tab-tab-b"'));
      assert.ok(html.includes('aria-selected="true"'));
      assert.ok(html.includes('id="ui-tab-panel-tab-b"'));
      assert.ok(html.includes('Beta content'));
      assert.ok(!html.includes('Alpha content'));
    });

    it('renders icon when tab specifies icon', () => {
      const tabs: TabItem[] = [
        { id: 't1', label: 'Code View', content: 'code', icon: 'code' },
        { id: 't2', label: 'Terminal', content: 'terminal', icon: 'terminal' },
      ];

      const html = renderToStaticMarkup(
        React.createElement(TabsComponentView, { tabs }),
      );

      assert.ok(html.includes('ui-tab-icon'));
    });

    it('handles empty tabs array gracefully without crashing', () => {
      const html = renderToStaticMarkup(
        React.createElement(TabsComponentView, { tabs: [] }),
      );
      assert.equal(html, '');
    });

    it('supports wrapped component prop contract', () => {
      const html = renderToStaticMarkup(
        React.createElement(TabsComponentView, {
          component: {
            type: 'tabs',
            tabs: [{ id: 'c1', label: 'Custom', content: 'Custom payload content' }],
          },
        }),
      );

      assert.ok(html.includes('class="ui-tabs"'));
      assert.ok(html.includes('Custom payload content'));
    });
  });

  describe('ComparisonComponentView', () => {
    it('renders comparison container, header, responsive grid, and cards', () => {
      const items: ComparisonItem[] = [
        {
          name: 'PostgreSQL',
          badge: 'Standard',
          price: 'Free / Open Source',
          pros: ['ACID compliance', 'Rich extensions (pgvector)'],
          cons: ['Vertical scaling limits'],
          details: { Architecture: 'Monolithic', License: 'Open Source' },
        },
        {
          name: 'CockroachDB',
          badge: 'Distributed',
          highlight: true,
          price: 'Usage-based',
          pros: ['Global distribution', 'Automatic sharding'],
          cons: ['Higher query latency'],
          details: [
            { key: 'Architecture', value: 'Distributed' },
            { key: 'License', value: 'BSL' },
          ],
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(ComparisonComponentView, {
          title: 'Database Architecture Evaluation',
          subtitle: 'Comparing single-node vs distributed SQL systems',
          items,
        }),
      );

      // Outer container & header
      assert.ok(html.includes('class="ui-comparison"'));
      assert.ok(html.includes('role="region"'));
      assert.ok(html.includes('Database Architecture Evaluation'));
      assert.ok(html.includes('ui-comparison-main-title'));
      assert.ok(html.includes('Comparing single-node vs distributed SQL systems'));

      // Grid with 2 columns
      assert.ok(html.includes('class="ui-comparison-grid columns-2"'));

      // Card 1: Standard
      assert.ok(html.includes('PostgreSQL'));
      assert.ok(html.includes('Free / Open Source'));
      assert.ok(html.includes('class="ui-comparison-badge"'));
      assert.ok(html.includes('Standard'));
      assert.ok(html.includes('ACID compliance'));
      assert.ok(html.includes('Vertical scaling limits'));
      assert.ok(html.includes('Architecture'));
      assert.ok(html.includes('Monolithic'));

      // Card 2: Highlighted
      assert.ok(html.includes('CockroachDB'));
      assert.ok(html.includes('ui-comparison-highlight recommended highlight'));
      assert.ok(html.includes('class="ui-comparison-badge highlight"'));
      assert.ok(html.includes('Distributed'));
      assert.ok(html.includes('Global distribution'));
      assert.ok(html.includes('Higher query latency'));
      assert.ok(html.includes('BSL'));
    });

    it('renders 3-column layout class when 3 items are provided', () => {
      const items: ComparisonItem[] = [
        { name: 'Option A' },
        { name: 'Option B' },
        { name: 'Option C' },
      ];

      const html = renderToStaticMarkup(
        React.createElement(ComparisonComponentView, { items }),
      );

      assert.ok(html.includes('columns-3'));
    });

    it('handles empty items array gracefully', () => {
      const html = renderToStaticMarkup(
        React.createElement(ComparisonComponentView, { items: [] }),
      );
      assert.equal(html, '');
    });

    it('supports wrapped component prop contract', () => {
      const html = renderToStaticMarkup(
        React.createElement(ComparisonComponentView, {
          component: {
            type: 'comparison',
            title: 'Wrapped Comparison',
            items: [{ name: 'Solo Option', badge: 'Single' }],
          },
        }),
      );

      assert.ok(html.includes('Wrapped Comparison'));
      assert.ok(html.includes('Solo Option'));
    });
  });

  describe('AccordionComponentView', () => {
    it('renders accordion group, items, triggers, rotating chevrons, and panels', () => {
      const items: AccordionItem[] = [
        {
          id: 'acc-1',
          title: 'How does streaming parsing work?',
          content: 'Streaming parsing uses a delimiter repair stack.',
          defaultOpen: true,
        },
        {
          id: 'acc-2',
          title: 'Is client state isolated?',
          content: 'Yes, checkboxes and tabs stay local to React.',
          defaultOpen: false,
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(AccordionComponentView, {
          items,
        }),
      );

      // Group container
      assert.ok(html.includes('class="ui-accordion-group"'));
      assert.ok(html.includes('role="region"'));
      assert.ok(html.includes('aria-label="Accordion Sections"'));

      // Item 1: Open by default
      assert.ok(html.includes('ui-accordion ui-accordion-item open'));
      assert.ok(html.includes('id="accordion-trigger-acc-1"'));
      assert.ok(html.includes('aria-expanded="true"'));
      assert.ok(html.includes('aria-controls="accordion-panel-acc-1"'));
      assert.ok(html.includes('How does streaming parsing work?'));
      assert.ok(html.includes('ui-accordion-chevron'));
      assert.ok(html.includes('id="accordion-panel-acc-1"'));
      assert.ok(html.includes('aria-labelledby="accordion-trigger-acc-1"'));
      assert.ok(html.includes('Streaming parsing uses a delimiter repair stack.'));

      // Item 2: Closed by default
      assert.ok(html.includes('id="accordion-trigger-acc-2"'));
      assert.ok(html.includes('aria-expanded="false"'));
      assert.ok(html.includes('id="accordion-panel-acc-2"'));
      assert.ok(html.includes('hidden=""'));
    });

    it('handles empty items array gracefully', () => {
      const html = renderToStaticMarkup(
        React.createElement(AccordionComponentView, { items: [] }),
      );
      assert.equal(html, '');
    });

    it('supports wrapped component prop contract', () => {
      const html = renderToStaticMarkup(
        React.createElement(AccordionComponentView, {
          component: {
            type: 'accordion',
            items: [
              {
                id: 'sec-1',
                title: 'Section One',
                content: 'Section One Content',
                defaultOpen: true,
              },
            ],
          },
        }),
      );

      assert.ok(html.includes('Section One'));
      assert.ok(html.includes('Section One Content'));
    });
  });
});
