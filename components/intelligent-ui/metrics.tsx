'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MetricsComponent, MetricItem } from './types';

export interface MetricsProps {
  metrics?: MetricItem[];
}

export type MetricsComponentProps =
  | MetricsComponent
  | { data?: MetricsComponent; component?: MetricsComponent }
  | MetricsProps;

export function MetricsComponentView(props: MetricsComponentProps) {
  const data: Partial<MetricsComponent> =
    'data' in props && props.data
      ? props.data
      : 'component' in props && props.component
        ? props.component
        : (props as Partial<MetricsComponent>);

  const metrics = Array.isArray(data.metrics) ? data.metrics : [];

  return (
    <div className="ui-stat-grid" role="group" aria-label="Key Metrics">
      {metrics.map((item, idx) => {
        const hasTrendOrChange = !!item.trend || !!item.change;
        const trendClass =
          item.trend === 'up'
            ? 'positive up'
            : item.trend === 'down'
              ? 'negative down'
              : 'neutral';

        return (
          <div className="ui-stat-card" key={idx}>
            <span className="ui-stat-label">{item.label}</span>

            <div className="ui-stat-value-container">
              <span className="ui-stat-value">{item.value}</span>
              {item.unit && <span className="ui-stat-unit">{item.unit}</span>}
            </div>

            {hasTrendOrChange && (
              <div className={`ui-stat-trend ui-stat-delta ${trendClass}`}>
                {item.trend === 'up' && (
                  <TrendingUp size={13} className="ui-stat-icon" aria-hidden="true" />
                )}
                {item.trend === 'down' && (
                  <TrendingDown size={13} className="ui-stat-icon" aria-hidden="true" />
                )}
                {item.trend === 'neutral' && (
                  <Minus size={13} className="ui-stat-icon" aria-hidden="true" />
                )}
                {item.change && <span className="ui-stat-change">{item.change}</span>}
              </div>
            )}

            {item.description && (
              <span className="ui-stat-description ui-stat-caption">{item.description}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const Metrics = MetricsComponentView;
export const MetricsView = MetricsComponentView;
export default MetricsComponentView;
