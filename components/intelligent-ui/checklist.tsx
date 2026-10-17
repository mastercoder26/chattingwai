'use client';

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import type { ChecklistComponent, ChecklistItem } from './types';

export interface ChecklistProps {
  title?: string;
  items?: ChecklistItem[];
}

export type ChecklistComponentProps =
  | ChecklistComponent
  | { data?: ChecklistComponent; component?: ChecklistComponent }
  | ChecklistProps;

export function ChecklistComponentView(props: ChecklistComponentProps) {
  const data: Partial<ChecklistComponent> =
    'data' in props && props.data
      ? props.data
      : 'component' in props && props.component
        ? props.component
        : (props as Partial<ChecklistComponent>);

  const title = data.title;
  const items = Array.isArray(data.items) ? data.items : [];

  // Track explicit user overrides for checkboxes locally in React
  const [userToggled, setUserToggled] = useState<Record<string, boolean>>({});

  const toggleItem = (item: ChecklistItem, e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const current = userToggled[item.id] !== undefined ? userToggled[item.id] : !!item.checked;
    setUserToggled((prev) => ({
      ...prev,
      [item.id]: !current,
    }));
  };

  const handleKeyDown = (item: ChecklistItem, e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      toggleItem(item, e);
    }
  };

  const totalCount = items.length;
  const completedCount = items.filter((item) =>
    userToggled[item.id] !== undefined ? userToggled[item.id] : !!item.checked,
  ).length;
  const ratio = totalCount > 0 ? completedCount / totalCount : 0;
  const percent = Math.round(ratio * 100);

  return (
    <div
      className="ui-checklist"
      role="group"
      aria-label={title ? `${title} (Checklist)` : 'Interactive Checklist'}
    >
      <div className="ui-checklist-header">
        {title && <span className="ui-checklist-title">{title}</span>}
        <span className="ui-checklist-count" aria-live="polite">
          Completed: {completedCount} / {totalCount} ({percent}%)
        </span>
      </div>

      <div
        className="ui-checklist-progress"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Checklist completion"
      >
        <div
          className="ui-checklist-progress-bar"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="ui-checklist-items" role="list">
        {items.map((item) => {
          const isChecked =
            userToggled[item.id] !== undefined ? userToggled[item.id] : !!item.checked;
          return (
            <li className="ui-checklist-item" key={item.id}>
              <button
                type="button"
                className={`ui-checklist-box${isChecked ? ' checked' : ''}`}
                role="checkbox"
                aria-checked={isChecked}
                tabIndex={0}
                onClick={(e) => toggleItem(item, e)}
                onKeyDown={(e) => handleKeyDown(item, e)}
                aria-label={`Toggle ${item.text}`}
              >
                {isChecked && (
                  <Check
                    size={12}
                    strokeWidth={2.5}
                    className="ui-checklist-check-icon"
                    aria-hidden="true"
                  />
                )}
              </button>

              <span
                className={`ui-checklist-text${isChecked ? ' done' : ''}`}
                onClick={(e) => toggleItem(item, e)}
                style={{ cursor: 'pointer' }}
              >
                {item.text}
              </span>

              {item.required && (
                <span
                  className="ui-checklist-badge ui-checklist-required"
                  title="Required task"
                >
                  Required
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export const Checklist = ChecklistComponentView;
export const ChecklistView = ChecklistComponentView;
export default ChecklistComponentView;
