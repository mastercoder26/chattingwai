'use client';
import { useMemo, useState } from 'react';
import { Check, Search, ListFilter } from 'lucide-react';
import { Dialog } from './dialog';
import { ModelLogo } from './model-logo';
import type { Model } from '@/lib/types';

const popular = [
  'openai/gpt-4o-mini',
  'anthropic/claude-sonnet-4.6',
  'google/gemini-2.5-flash',
  'qwen/qwen3-32b',
  'deepseek/deepseek-chat-v3-0324',
];
export function ModelPicker({
  models,
  selected,
  live,
  onSelect,
  onClose,
  requiresVision = false,
}: {
  requiresVision?: boolean;
  models: Model[];
  selected: string;
  live: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('recommended');
  const recommended = useMemo(() => {
    const chosen = popular
      .map((id) => models.find((m) => m.id === id))
      .filter((m): m is Model => Boolean(m));
    const picked = models.find((m) => m.id === selected);
    if (picked && !chosen.some((m) => m.id === selected)) chosen.unshift(picked);
    return chosen.length >= 3 ? chosen : models.slice(0, 8);
  }, [models, selected]);
  const visible = (query || tab === 'all' || requiresVision ? models : recommended).filter(
    (m) =>
      (!requiresVision || m.inputModalities?.includes('image')) &&
      `${m.name} ${m.provider} ${m.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Dialog
      title="Choose a model"
      description={
        requiresVision
          ? 'These models can read the images in this conversation.'
          : 'Switch models at any time. Your conversation stays in place.'
      }
      onClose={onClose}
      className="model-dialog"
    >
      <div className="search-field">
        <Search size={17} />
        <input
          autoFocus
          placeholder="Search models or providers…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search models"
        />
        <kbd>ESC</kbd>
      </div>
      <div className="model-tabs">
        <button
          className={tab === 'recommended' ? 'active' : ''}
          onClick={() => setTab('recommended')}
        >
          <ListFilter size={14} /> Recommended
        </button>
        <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
          All models <span>{models.length}</span>
        </button>
      </div>
      <div className="model-list">
        {visible.map((model) => (
          <button
            key={model.id}
            className={`model-option ${model.id === selected ? 'selected' : ''}`}
            onClick={() => {
              onSelect(model.id);
              onClose();
            }}
          >
            <span className={`provider-icon provider-${model.provider.toLowerCase()}`}>
              <ModelLogo modelId={model.id} provider={model.provider} />
            </span>
            <span className="model-info">
              <strong>{model.name}</strong>
              <span>
                {model.provider} <i>·</i>{' '}
                {model.inputModalities?.includes('image') && (
                  <span className="vision-label">Vision · </span>
                )}
                {model.contextLength
                  ? `${Math.round(model.contextLength / 1000)}k context`
                  : 'Context varies'}
              </span>
            </span>
            {selected === model.id ? (
              <Check className="model-check" size={18} />
            ) : (
              <span className="choose-model">Select</span>
            )}
          </button>
        ))}
        {!visible.length && <div className="empty-search">No models found. Try another name.</div>}
      </div>
      <div className="dialog-foot">
        <span className={`status-dot ${live ? '' : 'offline'}`} />
        {live ? 'Live model catalog from Hack Club' : 'Catalog offline · showing fallback models'}
      </div>
    </Dialog>
  );
}
