'use client';

import React, { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import type { ComparisonComponent, ComparisonItem } from './types';

export interface ComparisonComponentViewProps {
  title?: string;
  subtitle?: string;
  items?: ComparisonItem[];
  columns?: ComparisonItem[];
  component?: ComparisonComponent;
  type?: 'comparison';
}

function getDetailEntries(
  details?: ComparisonItem['details'],
): Array<{ key: string; value: string }> {
  if (!details) return [];
  if (Array.isArray(details)) {
    return details.map((d) => ({
      key: String(d.key ?? ''),
      value: String(d.value ?? ''),
    }));
  }
  if (typeof details === 'object') {
    return Object.entries(details).map(([key, value]) => ({
      key,
      value: String(value ?? ''),
    }));
  }
  return [];
}

export function ComparisonComponentView(props: ComparisonComponentViewProps) {
  const title = props.component?.title || props.title;
  const subtitle = props.component?.subtitle || props.subtitle;
  const items = useMemo(() => {
    return props.component?.items || props.items || props.columns || [];
  }, [props.component?.items, props.items, props.columns]);

  if (items.length === 0 && !title) {
    return null;
  }

  const gridClass =
    items.length === 2
      ? 'columns-2'
      : items.length === 3
        ? 'columns-3'
        : items.length >= 4
          ? 'columns-4'
          : '';

  return (
    <div className="ui-comparison" role="region" aria-label={title || 'Comparison'}>
      {(title || subtitle) && (
        <div className="ui-comparison-header ui-comparison-main-header">
          {title && <h3 className="ui-comparison-title ui-comparison-main-title">{title}</h3>}
          {subtitle && <p className="ui-comparison-subtitle">{subtitle}</p>}
        </div>
      )}

      <div className={`ui-comparison-grid ${gridClass}`.trim()}>
        {items.map((item, idx) => {
          const detailEntries = getDetailEntries(item.details);
          const hasPros = item.pros && item.pros.length > 0;
          const hasCons = item.cons && item.cons.length > 0;
          const hasDetails = detailEntries.length > 0;

          return (
            <div
              key={idx}
              className={`ui-comparison-card ui-comparison-column ${
                item.highlight ? 'ui-comparison-highlight recommended highlight' : ''
              }`.trim()}
            >
              <div className="ui-comparison-header ui-comparison-card-header">
                <div className="ui-comparison-title-wrap">
                  <span className="ui-comparison-name ui-comparison-title">{item.name}</span>
                  {item.price && (
                    <span className="ui-comparison-price">{item.price}</span>
                  )}
                </div>
                {item.badge && (
                  <span
                    className={`ui-comparison-badge ${
                      item.highlight ? 'highlight' : ''
                    }`.trim()}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              <div className="ui-comparison-body">
                {hasPros && (
                  <div className="ui-comparison-section ui-comparison-pros-section">
                    <span className="ui-comparison-section-label">Pros</span>
                    <ul className="ui-comparison-pros">
                      {item.pros?.map((pro, pIdx) => (
                        <li key={pIdx} className="ui-comparison-pro-item">
                          <Check size={14} className="ui-comparison-pro-icon" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {hasCons && (
                  <div className="ui-comparison-section ui-comparison-cons-section">
                    <span className="ui-comparison-section-label">Cons</span>
                    <ul className="ui-comparison-cons">
                      {item.cons?.map((con, cIdx) => (
                        <li key={cIdx} className="ui-comparison-con-item">
                          <X size={14} className="ui-comparison-con-icon" />
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {hasDetails && (
                  <div className="ui-comparison-section ui-comparison-details-section">
                    <span className="ui-comparison-section-label">Details</span>
                    <table className="ui-comparison-details">
                      <tbody>
                        {detailEntries.map((entry, dIdx) => (
                          <tr key={dIdx} className="ui-comparison-detail-row">
                            <td className="ui-comparison-detail-key">{entry.key}</td>
                            <td className="ui-comparison-detail-value">{entry.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const Comparison = ComparisonComponentView;
export default ComparisonComponentView;
