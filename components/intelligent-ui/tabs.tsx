'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  Code,
  FileText,
  Terminal,
  Settings,
  Info,
  Check,
  Table,
  Layers,
  Cpu,
  Database,
  Globe,
  Server,
  Zap,
  Layout,
} from 'lucide-react';
import { RichText } from '../markdown';
import type { TabItem, TabsComponent } from './types';

export interface TabsComponentViewProps {
  tabs?: TabItem[];
  activeTab?: string;
  component?: TabsComponent;
  type?: 'tabs';
}

function renderTabIcon(icon?: string) {
  if (!icon) return null;
  const normalized = icon.trim().toLowerCase();
  const iconProps = { size: 14, className: 'ui-tab-icon' };

  switch (normalized) {
    case 'code':
      return <Code {...iconProps} />;
    case 'file':
    case 'filetext':
    case 'doc':
      return <FileText {...iconProps} />;
    case 'terminal':
    case 'console':
    case 'cli':
      return <Terminal {...iconProps} />;
    case 'settings':
    case 'gear':
    case 'config':
      return <Settings {...iconProps} />;
    case 'info':
      return <Info {...iconProps} />;
    case 'check':
      return <Check {...iconProps} />;
    case 'table':
      return <Table {...iconProps} />;
    case 'layers':
      return <Layers {...iconProps} />;
    case 'cpu':
      return <Cpu {...iconProps} />;
    case 'database':
    case 'db':
      return <Database {...iconProps} />;
    case 'globe':
    case 'web':
    case 'api':
      return <Globe {...iconProps} />;
    case 'server':
      return <Server {...iconProps} />;
    case 'zap':
    case 'fast':
    case 'bolt':
      return <Zap {...iconProps} />;
    default:
      if (normalized.length <= 4) {
        return <span className="ui-tab-icon ui-tab-icon-raw">{icon}</span>;
      }
      return <Layout {...iconProps} />;
  }
}

export function TabsComponentView(props: TabsComponentViewProps) {
  const tabsList = useMemo(
    () => props.component?.tabs || props.tabs || [],
    [props.component?.tabs, props.tabs],
  );

  const initialTabId =
    props.component?.activeTab ||
    props.activeTab ||
    (tabsList.length > 0 ? tabsList[0].id : '');

  const [selectedTab, setSelectedTab] = useState<string>(initialTabId);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Resolve current active tab cleanly without cascading effect setState
  const currentTab = useMemo(() => {
    if (selectedTab && tabsList.some((t) => t.id === selectedTab)) {
      return selectedTab;
    }
    const propActive = props.component?.activeTab || props.activeTab;
    if (propActive && tabsList.some((t) => t.id === propActive)) {
      return propActive;
    }
    return tabsList.length > 0 ? tabsList[0].id : '';
  }, [selectedTab, tabsList, props.component?.activeTab, props.activeTab]);

  const activeTabItem = useMemo(
    () => tabsList.find((t) => t.id === currentTab) || (tabsList.length > 0 ? tabsList[0] : null),
    [tabsList, currentTab],
  );

  const selectTab = useCallback((id: string, shouldFocus = false) => {
    setSelectedTab(id);
    if (shouldFocus) {
      const el = tabRefs.current[id];
      if (el) {
        el.focus();
      }
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const count = tabsList.length;
      if (count === 0) return;

      let nextIndex = -1;
      if (e.key === 'ArrowRight') {
        nextIndex = (index + 1) % count;
      } else if (e.key === 'ArrowLeft') {
        nextIndex = (index - 1 + count) % count;
      } else if (e.key === 'Home') {
        nextIndex = 0;
      } else if (e.key === 'End') {
        nextIndex = count - 1;
      }

      if (nextIndex >= 0) {
        e.preventDefault();
        const nextTab = tabsList[nextIndex];
        if (nextTab) {
          selectTab(nextTab.id, true);
        }
      }
    },
    [tabsList, selectTab],
  );

  if (tabsList.length === 0) {
    return null;
  }

  return (
    <div className="ui-tabs" role="region" aria-label="Tabbed Views">
      <div className="ui-tabs-bar ui-tab-list" role="tablist" aria-orientation="horizontal">
        {tabsList.map((tab, idx) => {
          const isSelected = activeTabItem ? tab.id === activeTabItem.id : idx === 0;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`ui-tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`ui-tab-panel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              className={`ui-tab-trigger ui-tab-button ${isSelected ? 'active' : ''}`}
              onClick={() => selectTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
            >
              {renderTabIcon(tab.icon)}
              <span className="ui-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTabItem && (
        <div
          key={activeTabItem.id}
          className="ui-tab-panel"
          role="tabpanel"
          id={`ui-tab-panel-${activeTabItem.id}`}
          aria-labelledby={`ui-tab-${activeTabItem.id}`}
          tabIndex={0}
        >
          <RichText
            content={activeTabItem.content}
            {...({ nested: true } as Record<string, unknown>)}
          />
        </div>
      )}
    </div>
  );
}

export const Tabs = TabsComponentView;
export default TabsComponentView;
