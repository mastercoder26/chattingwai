'use client';

import React, { Component, type ReactNode } from 'react';
import { parseStreamingPayload } from './parser';
import { TabsComponentView } from './tabs';
import { ComparisonComponentView } from './comparison';
import { MetricsComponentView } from './metrics';
import { ChecklistComponentView } from './checklist';
import { AccordionComponentView } from './accordion';
import { CalloutComponentView } from './callout';
import type { IntelligentUIComponent } from './types';

export interface IntelligentUIRendererProps {
  raw: string;
  className?: string;
}

interface ErrorBoundaryProps {
  fallback: (error: Error) => ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class SafeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(): void {
    // Graceful error capture, prevents unhandled crashes in message bubble
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

/**
 * Fallback code container when parsing or rendering cannot recover a valid component.
 */
function FallbackContainer({ raw, error }: { raw: string; error?: string }) {
  return (
    <div className="ui-fallback" role="region" aria-label="UI Component Fallback">
      <div className="ui-fallback-header">
        <span>Intelligent UI</span>
        {error && <span className="ui-fallback-error">{error}</span>}
      </div>
      <pre className="ui-fallback-code">
        <code>{raw}</code>
      </pre>
    </div>
  );
}

/**
 * Skeleton placeholder rendered during partial streaming before minimal structural data is available.
 */
function SkeletonPlaceholder() {
  return (
    <div
      className="intelligent-ui-skeleton"
      role="status"
      aria-label="Loading UI component"
      aria-busy="true"
    >
      <div className="intelligent-ui-skeleton-bar short" />
      <div className="intelligent-ui-skeleton-bar full" />
      <div className="intelligent-ui-skeleton-bar medium" />
    </div>
  );
}

/**
 * Renders an Intelligent UI component from parsed streaming or complete payload data.
 */
function ComponentDispatcher({ data }: { data: IntelligentUIComponent }) {
  switch (data.type) {
    case 'tabs':
      return (
        <TabsComponentView
          component={data}
          tabs={data.tabs}
          activeTab={data.activeTab}
        />
      );
    case 'comparison':
      return (
        <ComparisonComponentView
          component={data}
          title={data.title}
          subtitle={data.subtitle}
          items={data.items}
        />
      );
    case 'metrics':
      return <MetricsComponentView component={data} metrics={data.metrics} />;
    case 'checklist':
      return (
        <ChecklistComponentView
          component={data}
          title={data.title}
          items={data.items}
        />
      );
    case 'accordion':
      return <AccordionComponentView component={data} items={data.items} />;
    case 'callout':
      return (
        <CalloutComponentView
          component={data}
          variant={data.variant}
          title={data.title}
          content={data.content}
        />
      );
    default:
      return null;
  }
}

/**
 * Main dispatcher component that parses streaming or complete code block text
 * and safely renders the corresponding Intelligent UI component or a graceful fallback.
 */
export function IntelligentUIRenderer({ raw, className }: IntelligentUIRendererProps) {
  let parsed;
  try {
    parsed = parseStreamingPayload(raw);
  } catch (err) {
    return (
      <FallbackContainer
        raw={raw}
        error={err instanceof Error ? err.message : 'Parser failure'}
      />
    );
  }

  // 1. Unrecoverable parsing error
  if (parsed.status === 'error') {
    return <FallbackContainer raw={raw} error={parsed.error} />;
  }

  // 2. Partial parsing without sufficient structural data yet
  if (parsed.status === 'partial' && !parsed.data) {
    return <SkeletonPlaceholder />;
  }

  // 3. Complete or partial with valid structural data
  if (parsed.data) {
    return (
      <SafeErrorBoundary
        fallback={(renderError) => (
          <FallbackContainer
            raw={raw}
            error={`Render failure: ${renderError.message}`}
          />
        )}
      >
        <div className={`intelligent-ui-root ${className || ''}`.trim()}>
          <ComponentDispatcher data={parsed.data} />
        </div>
      </SafeErrorBoundary>
    );
  }

  // 4. Default graceful fallback
  return <FallbackContainer raw={raw} error="No data available" />;
}

export {
  TabsComponentView,
  ComparisonComponentView,
  MetricsComponentView,
  ChecklistComponentView,
  AccordionComponentView,
  CalloutComponentView,
  parseStreamingPayload,
};

export * from './types';
export default IntelligentUIRenderer;
