'use client';

import React from 'react';
import { Info, FileText, Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react';
import { RichText } from '../markdown';
import type { CalloutComponent, CalloutVariant } from './types';

export interface CalloutProps {
  variant?: CalloutVariant;
  title?: string;
  content?: string;
}

export type CalloutComponentProps =
  | CalloutComponent
  | { data?: CalloutComponent; component?: CalloutComponent }
  | CalloutProps;

function getCalloutIcon(variant: CalloutVariant) {
  switch (variant) {
    case 'note':
      return <FileText size={16} strokeWidth={2} aria-hidden="true" />;
    case 'tip':
      return <Lightbulb size={16} strokeWidth={2} aria-hidden="true" />;
    case 'warning':
      return <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />;
    case 'success':
      return <CheckCircle size={16} strokeWidth={2} aria-hidden="true" />;
    case 'info':
    default:
      return <Info size={16} strokeWidth={2} aria-hidden="true" />;
  }
}

const RichTextComponent = RichText as React.ComponentType<{ content: string; nested?: boolean }>;

export function CalloutComponentView(props: CalloutComponentProps) {
  const data: Partial<CalloutComponent> =
    'data' in props && props.data
      ? props.data
      : 'component' in props && props.component
        ? props.component
        : (props as Partial<CalloutComponent>);

  const rawVariant = data.variant;
  const validVariants: CalloutVariant[] = ['info', 'note', 'tip', 'warning', 'success'];
  const variant: CalloutVariant =
    rawVariant && validVariants.includes(rawVariant as CalloutVariant)
      ? (rawVariant as CalloutVariant)
      : 'info';

  const title = data.title;
  const content = data.content || '';

  return (
    <div
      className={`ui-callout ui-callout-${variant}`}
      role={variant === 'warning' ? 'alert' : 'status'}
      aria-label={title ? `${title} (${variant})` : `${variant} callout`}
    >
      <div className="ui-callout-icon">{getCalloutIcon(variant)}</div>

      <div className="ui-callout-body">
        {title && <strong className="ui-callout-title">{title}</strong>}
        <div className="ui-callout-content">
          <RichTextComponent content={content} nested={true} />
        </div>
      </div>
    </div>
  );
}

export const Callout = CalloutComponentView;
export const CalloutView = CalloutComponentView;
export default CalloutComponentView;
