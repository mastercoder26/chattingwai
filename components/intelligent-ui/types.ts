export interface TabItem {
  id: string;
  label: string;
  content: string;
  icon?: string;
}

export interface TabsComponent {
  type: 'tabs';
  tabs: TabItem[];
  activeTab?: string;
}

export interface ComparisonDetailEntry {
  key: string;
  value: string;
}

export interface ComparisonItem {
  name: string;
  badge?: string;
  highlight?: boolean;
  price?: string;
  pros?: string[];
  cons?: string[];
  details?: Record<string, string> | ComparisonDetailEntry[];
}

export interface ComparisonComponent {
  type: 'comparison';
  title?: string;
  subtitle?: string;
  items: ComparisonItem[];
}

export interface MetricItem {
  label: string;
  value: string | number;
  unit?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
}

export interface MetricsComponent {
  type: 'metrics';
  metrics: MetricItem[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked?: boolean;
  required?: boolean;
}

export interface ChecklistComponent {
  type: 'checklist';
  title?: string;
  items: ChecklistItem[];
}

export interface AccordionItem {
  id: string;
  title: string;
  content: string;
  defaultOpen?: boolean;
}

export interface AccordionComponent {
  type: 'accordion';
  items: AccordionItem[];
}

export type CalloutVariant = 'info' | 'note' | 'tip' | 'warning' | 'success';

export interface CalloutComponent {
  type: 'callout';
  variant: CalloutVariant;
  title?: string;
  content: string;
}

export type IntelligentUIComponent =
  | TabsComponent
  | ComparisonComponent
  | MetricsComponent
  | ChecklistComponent
  | AccordionComponent
  | CalloutComponent;

export type IntelligentUIType = IntelligentUIComponent['type'];

export type ParseStatus = 'complete' | 'partial' | 'error';

export interface ParseResult<T = IntelligentUIComponent> {
  status: ParseStatus;
  data?: T;
  error?: string;
  raw: string;
}
