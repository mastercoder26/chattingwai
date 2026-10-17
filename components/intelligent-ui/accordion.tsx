'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { RichText } from '../markdown';
import type { AccordionComponent, AccordionItem } from './types';

export interface AccordionComponentViewProps {
  items?: AccordionItem[];
  component?: AccordionComponent;
  type?: 'accordion';
}

export function AccordionComponentView(props: AccordionComponentViewProps) {
  const itemsList = useMemo(() => {
    return props.component?.items || props.items || [];
  }, [props.component?.items, props.items]);

  const [toggledMap, setToggledMap] = useState<Record<string, boolean>>({});

  const isItemOpen = useCallback(
    (id: string, defaultOpen?: boolean) => {
      if (toggledMap[id] !== undefined) {
        return toggledMap[id];
      }
      return !!defaultOpen;
    },
    [toggledMap],
  );

  const toggleItem = useCallback(
    (id: string, defaultOpen?: boolean) => {
      setToggledMap((prev) => {
        const current = prev[id] !== undefined ? prev[id] : !!defaultOpen;
        return {
          ...prev,
          [id]: !current,
        };
      });
    },
    [],
  );

  if (itemsList.length === 0) {
    return null;
  }

  return (
    <div className="ui-accordion-group" role="region" aria-label="Accordion Sections">
      {itemsList.map((item, idx) => {
        const itemId = item.id || `section-${idx + 1}`;
        const open = isItemOpen(itemId, item.defaultOpen);

        return (
          <div
            key={itemId}
            className={`ui-accordion ui-accordion-item ${open ? 'open' : ''}`.trim()}
          >
            <button
              type="button"
              className="ui-accordion-trigger"
              id={`accordion-trigger-${itemId}`}
              aria-expanded={open}
              aria-controls={`accordion-panel-${itemId}`}
              onClick={() => toggleItem(itemId, item.defaultOpen)}
            >
              <span className="ui-accordion-title">{item.title}</span>
              <ChevronDown
                size={16}
                className="ui-accordion-chevron"
                style={{
                  transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </button>

            <div
              id={`accordion-panel-${itemId}`}
              className="ui-accordion-content ui-accordion-panel"
              role="region"
              aria-labelledby={`accordion-trigger-${itemId}`}
              hidden={!open}
            >
              <div className="ui-accordion-inner">
                <RichText
                  content={item.content}
                  {...({ nested: true } as Record<string, unknown>)}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const Accordion = AccordionComponentView;
export default AccordionComponentView;
