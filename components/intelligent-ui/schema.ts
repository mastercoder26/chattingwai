import { z } from 'zod';
import type {
  TabsComponent,
  ComparisonComponent,
  MetricsComponent,
  ChecklistComponent,
  AccordionComponent,
  CalloutComponent,
  IntelligentUIComponent,
} from './types';

export const tabItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  content: z.string(),
  icon: z.string().optional(),
});

export const tabsSchema: z.ZodType<TabsComponent> = z.preprocess((val) => {
  if (typeof val !== 'object' || val === null) return val;
  const raw = val as Record<string, unknown>;
  if (raw.type !== 'tabs') return val;

  const rawTabs = Array.isArray(raw.tabs) ? raw.tabs : Array.isArray(raw.items) ? raw.items : [];
  const explicitActiveTab =
    typeof raw.activeTab === 'string'
      ? raw.activeTab
      : typeof raw.defaultTab === 'string'
        ? raw.defaultTab
        : undefined;

  const tabs = rawTabs.map((item, idx) => {
    if (typeof item !== 'object' || item === null) {
      return {
        id: `tab-${idx + 1}`,
        label: `Tab ${idx + 1}`,
        content: typeof item === 'string' ? item : '',
      };
    }
    const rec = item as Record<string, unknown>;
    const id = rec.id ? String(rec.id) : `tab-${idx + 1}`;
    const label = rec.label
      ? String(rec.label)
      : rec.title
        ? String(rec.title)
        : `Tab ${idx + 1}`;
    const content = rec.content !== undefined && rec.content !== null ? String(rec.content) : '';
    const icon = rec.icon ? String(rec.icon) : undefined;
    return {
      id,
      label,
      content,
      ...(icon ? { icon } : {}),
    };
  });

  const activeTab = explicitActiveTab || (tabs.length > 0 ? tabs[0].id : undefined);

  return {
    ...raw,
    type: 'tabs',
    tabs,
    ...(activeTab ? { activeTab } : {}),
  };
}, z.object({
  type: z.literal('tabs'),
  tabs: z.array(tabItemSchema).default([]),
  activeTab: z.string().optional(),
})) as z.ZodType<TabsComponent>;

export const comparisonItemSchema = z.object({
  name: z.string(),
  badge: z.string().optional(),
  highlight: z.boolean().optional(),
  price: z.string().optional(),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  details: z
    .union([
      z.record(z.string(), z.string()),
      z.array(z.object({ key: z.string(), value: z.string() })),
    ])
    .optional(),
});

export const comparisonSchema: z.ZodType<ComparisonComponent> = z.preprocess((val) => {
  if (typeof val !== 'object' || val === null) return val;
  const raw = val as Record<string, unknown>;
  if (raw.type !== 'comparison') return val;

  const rawItems = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.columns)
      ? raw.columns
      : [];
  const title = raw.title ? String(raw.title) : undefined;
  const subtitle = raw.subtitle
    ? String(raw.subtitle)
    : raw.description
      ? String(raw.description)
      : undefined;

  const items = rawItems.map((item, idx) => {
    if (typeof item !== 'object' || item === null) {
      return {
        name: typeof item === 'string' ? item : `Option ${idx + 1}`,
        pros: [],
        cons: [],
      };
    }
    const rec = item as Record<string, unknown>;
    const name = rec.name
      ? String(rec.name)
      : rec.title
        ? String(rec.title)
        : `Option ${idx + 1}`;
    const badge = rec.badge !== undefined && rec.badge !== null ? String(rec.badge) : undefined;
    const highlight =
      typeof rec.highlight === 'boolean'
        ? rec.highlight
        : rec.highlight === 'true' || rec.highlight === 1
          ? true
          : rec.highlight === 'false' || rec.highlight === 0
            ? false
            : undefined;
    const price = rec.price !== undefined && rec.price !== null ? String(rec.price) : undefined;
    const pros = Array.isArray(rec.pros) ? rec.pros.map(String) : [];
    const cons = Array.isArray(rec.cons) ? rec.cons.map(String) : [];

    let details: Record<string, string> | Array<{ key: string; value: string }> | undefined;
    if (Array.isArray(rec.details)) {
      details = rec.details.map((d) => {
        if (typeof d === 'object' && d !== null) {
          const entry = d as Record<string, unknown>;
          return { key: String(entry.key ?? ''), value: String(entry.value ?? '') };
        }
        return { key: '', value: String(d ?? '') };
      });
    } else if (typeof rec.details === 'object' && rec.details !== null) {
      details = Object.fromEntries(
        Object.entries(rec.details).map(([k, v]) => [k, String(v ?? '')]),
      );
    }

    return {
      name,
      ...(badge !== undefined ? { badge } : {}),
      ...(highlight !== undefined ? { highlight } : {}),
      ...(price !== undefined ? { price } : {}),
      pros,
      cons,
      ...(details !== undefined ? { details } : {}),
    };
  });

  return {
    ...raw,
    type: 'comparison',
    ...(title ? { title } : {}),
    ...(subtitle ? { subtitle } : {}),
    items,
  };
}, z.object({
  type: z.literal('comparison'),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  items: z.array(comparisonItemSchema).default([]),
})) as z.ZodType<ComparisonComponent>;

export const metricItemSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  unit: z.string().optional(),
  change: z.string().optional(),
  trend: z.enum(['up', 'down', 'neutral']).optional(),
  description: z.string().optional(),
});

export const metricsSchema: z.ZodType<MetricsComponent> = z.preprocess((val) => {
  if (typeof val !== 'object' || val === null) return val;
  const raw = val as Record<string, unknown>;
  if (raw.type !== 'metrics' && raw.type !== 'stat') return val;

  const rawMetrics = Array.isArray(raw.metrics)
    ? raw.metrics
    : Array.isArray(raw.items)
      ? raw.items
      : Array.isArray(raw.stats)
        ? raw.stats
        : [];

  const metrics = rawMetrics.map((item, idx) => {
    if (typeof item !== 'object' || item === null) {
      return {
        label: `Metric ${idx + 1}`,
        value: typeof item === 'number' || typeof item === 'string' ? item : '',
      };
    }
    const rec = item as Record<string, unknown>;
    const label = rec.label
      ? String(rec.label)
      : rec.name
        ? String(rec.name)
        : rec.title
          ? String(rec.title)
          : `Metric ${idx + 1}`;

    let value: string | number = '';
    if (typeof rec.value === 'number') {
      value = String(rec.value);
    } else if (typeof rec.value === 'string') {
      value = rec.value;
    } else if (rec.value !== undefined && rec.value !== null) {
      value = String(rec.value);
    }

    const unit = rec.unit !== undefined && rec.unit !== null ? String(rec.unit) : undefined;
    const change = rec.change !== undefined && rec.change !== null ? String(rec.change) : undefined;

    let trend: 'up' | 'down' | 'neutral' | undefined;
    if (typeof rec.trend === 'string') {
      const t = rec.trend.toLowerCase().trim();
      if (t === 'up' || t === 'down' || t === 'neutral') trend = t;
    }

    const description =
      rec.description !== undefined && rec.description !== null
        ? String(rec.description)
        : undefined;

    return {
      label,
      value,
      ...(unit !== undefined ? { unit } : {}),
      ...(change !== undefined ? { change } : {}),
      ...(trend !== undefined ? { trend } : {}),
      ...(description !== undefined ? { description } : {}),
    };
  });

  return {
    ...raw,
    type: 'metrics',
    metrics,
  };
}, z.object({
  type: z.literal('metrics'),
  metrics: z.array(metricItemSchema).default([]),
})) as z.ZodType<MetricsComponent>;

export const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  checked: z.boolean().default(false),
  required: z.boolean().optional(),
});

export const checklistSchema: z.ZodType<ChecklistComponent> = z.preprocess((val) => {
  if (typeof val !== 'object' || val === null) return val;
  const raw = val as Record<string, unknown>;
  if (raw.type !== 'checklist') return val;

  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const title = raw.title ? String(raw.title) : undefined;

  const items = rawItems.map((item, idx) => {
    if (typeof item !== 'object' || item === null) {
      return {
        id: `item-${idx + 1}`,
        text: typeof item === 'string' ? item : `Item ${idx + 1}`,
        checked: false,
      };
    }
    const rec = item as Record<string, unknown>;
    const id = rec.id ? String(rec.id) : `item-${idx + 1}`;
    const text = rec.text
      ? String(rec.text)
      : rec.label
        ? String(rec.label)
        : rec.title
          ? String(rec.title)
          : `Item ${idx + 1}`;
    const checked =
      typeof rec.checked === 'boolean'
        ? rec.checked
        : rec.checked === 'true' || rec.checked === 1
          ? true
          : false;
    const required =
      typeof rec.required === 'boolean'
        ? rec.required
        : rec.required === 'true' || rec.required === 1
          ? true
          : undefined;

    return {
      id,
      text,
      checked,
      ...(required !== undefined ? { required } : {}),
    };
  });

  return {
    ...raw,
    type: 'checklist',
    ...(title ? { title } : {}),
    items,
  };
}, z.object({
  type: z.literal('checklist'),
  title: z.string().optional(),
  items: z.array(checklistItemSchema).default([]),
})) as z.ZodType<ChecklistComponent>;

export const accordionItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  defaultOpen: z.boolean().default(false),
});

export const accordionSchema: z.ZodType<AccordionComponent> = z.preprocess((val) => {
  if (typeof val !== 'object' || val === null) return val;
  const raw = val as Record<string, unknown>;
  if (raw.type !== 'accordion') return val;

  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const items = rawItems.map((item, idx) => {
    if (typeof item !== 'object' || item === null) {
      return {
        id: `section-${idx + 1}`,
        title: typeof item === 'string' ? item : `Section ${idx + 1}`,
        content: '',
        defaultOpen: false,
      };
    }
    const rec = item as Record<string, unknown>;
    const id = rec.id ? String(rec.id) : `section-${idx + 1}`;
    const title = rec.title
      ? String(rec.title)
      : rec.label
        ? String(rec.label)
        : rec.header
          ? String(rec.header)
          : `Section ${idx + 1}`;
    const content = rec.content !== undefined && rec.content !== null ? String(rec.content) : '';
    const defaultOpen =
      typeof rec.defaultOpen === 'boolean'
        ? rec.defaultOpen
        : rec.defaultOpen === 'true' || rec.defaultOpen === 1
          ? true
          : false;

    return {
      id,
      title,
      content,
      defaultOpen,
    };
  });

  return {
    ...raw,
    type: 'accordion',
    items,
  };
}, z.object({
  type: z.literal('accordion'),
  items: z.array(accordionItemSchema).default([]),
})) as z.ZodType<AccordionComponent>;

export const calloutSchema: z.ZodType<CalloutComponent> = z.preprocess((val) => {
  if (typeof val !== 'object' || val === null) return val;
  const raw = val as Record<string, unknown>;
  if (raw.type !== 'callout') return val;

  const variantAliases: Record<string, 'info' | 'note' | 'tip' | 'warning' | 'success'> = {
    caution: 'warning',
    alert: 'warning',
    danger: 'warning',
    help: 'info',
  };

  let variant: 'info' | 'note' | 'tip' | 'warning' | 'success' = 'info';
  if (typeof raw.variant === 'string') {
    const v = raw.variant.toLowerCase().trim();
    if (variantAliases[v]) {
      variant = variantAliases[v];
    } else if (['info', 'note', 'tip', 'warning', 'success'].includes(v)) {
      variant = v as 'info' | 'note' | 'tip' | 'warning' | 'success';
    }
  }

  const title = raw.title ? String(raw.title) : undefined;
  const content = raw.content !== undefined && raw.content !== null ? String(raw.content) : '';

  return {
    ...raw,
    type: 'callout',
    variant,
    ...(title ? { title } : {}),
    content,
  };
}, z.object({
  type: z.literal('callout'),
  variant: z.enum(['info', 'note', 'tip', 'warning', 'success']),
  title: z.string().optional(),
  content: z.string().default(''),
})) as z.ZodType<CalloutComponent>;

export const intelligentUIComponentSchema: z.ZodType<IntelligentUIComponent> = z.union([
  tabsSchema,
  comparisonSchema,
  metricsSchema,
  checklistSchema,
  accordionSchema,
  calloutSchema,
]);

export function validateIntelligentUI(
  data: unknown,
): { success: true; data: IntelligentUIComponent } | { success: false; error: string } {
  if (typeof data !== 'object' || data === null) {
    return { success: false, error: 'Component payload must be an object' };
  }

  const rec = data as Record<string, unknown>;
  const type = rec.type;

  let result;
  switch (type) {
    case 'tabs':
      result = tabsSchema.safeParse(data);
      break;
    case 'comparison':
      result = comparisonSchema.safeParse(data);
      break;
    case 'metrics':
    case 'stat':
      result = metricsSchema.safeParse(data);
      break;
    case 'checklist':
      result = checklistSchema.safeParse(data);
      break;
    case 'accordion':
      result = accordionSchema.safeParse(data);
      break;
    case 'callout':
      result = calloutSchema.safeParse(data);
      break;
    default:
      return {
        success: false,
        error: `Unknown or missing component type: ${typeof type === 'string' ? type : 'undefined'}`,
      };
  }

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: result.error.issues.map((i) => `${i.path.join('.') || 'root'}: ${i.message}`).join('; '),
  };
}
