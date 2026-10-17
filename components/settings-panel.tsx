'use client';
import { useState } from 'react';
import {
  Check,
  ChevronRight,
  Monitor,
  Moon,
  Palette,
  SlidersHorizontal,
  Sun,
  UserRound,
  ShieldCheck,
} from 'lucide-react';
import { Dialog } from './dialog';
import { defaultSettings, type Settings } from '@/lib/types';

export function SettingsPanel({
  settings,
  update,
  configured,
  onClose,
}: {
  settings: Settings;
  update: (value: Settings) => void;
  configured: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState('appearance');
  const change = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    update({ ...settings, [key]: value });
  return (
    <Dialog
      title="Settings"
      description="Adjust your workspace. Changes apply immediately."
      onClose={onClose}
      className="settings-dialog"
    >
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {[
            { id: 'appearance', label: 'Appearance', Icon: Palette },
            { id: 'personal', label: 'Personalization', Icon: UserRound },
            { id: 'model', label: 'Model preferences', Icon: SlidersHorizontal },
          ].map(({ id, label, Icon }) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              <Icon size={16} />
              {label}
              <ChevronRight size={13} />
            </button>
          ))}
          <div className="connection-info">
            <ShieldCheck size={18} />
            <strong>{configured ? 'You’re connected' : 'Key not configured'}</strong>
            <span>Your API key stays on the server.</span>
          </div>
        </nav>
        <div className="settings-content">
          {tab === 'appearance' && (
            <>
              <div className="setting-section">
                <h3>Theme</h3>
                <p>Choose an appearance or follow your device.</p>
                <div className="theme-options">
                  {[
                    { value: 'light', label: 'Light', Icon: Sun },
                    { value: 'dark', label: 'Dark', Icon: Moon },
                    { value: 'system', label: 'System', Icon: Monitor },
                  ].map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      className={`theme-option ${value} ${settings.theme === value ? 'selected' : ''}`}
                      onClick={() => change('theme', value as Settings['theme'])}
                      aria-pressed={settings.theme === value}
                    >
                      <div className="theme-preview">
                        <span />
                        <div>
                          <i />
                          <i />
                          <i />
                        </div>
                      </div>
                      <span>
                        <Icon size={14} />
                        {label}
                        {settings.theme === value && <Check size={14} />}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="setting-section">
                <h3>Accent color</h3>
                <p>Used for selected controls and highlights.</p>
                <div className="accent-options">
                  {(['graphite', 'blue', 'sage', 'rose', 'violet'] as const).map((accent) => (
                    <button
                      key={accent}
                      className={`accent-option accent-${accent} ${settings.accent === accent ? 'selected' : ''}`}
                      onClick={() => change('accent', accent)}
                      aria-label={`${accent} accent`}
                      aria-pressed={settings.accent === accent}
                    >
                      <span>{settings.accent === accent && <Check size={17} />}</span>
                      <small>
                        {accent === 'graphite'
                          ? 'Graphite'
                          : accent === 'blue'
                            ? 'Blue'
                            : accent === 'sage'
                              ? 'Sage'
                              : accent === 'rose'
                                ? 'Rose'
                                : 'Lilac'}
                      </small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="setting-section">
                <h3>Typography</h3>
                <div className="font-options">
                  {(['sans', 'serif', 'mono'] as const).map((font) => (
                    <button
                      key={font}
                      className={`${font} ${settings.font === font ? 'active' : ''}`}
                      onClick={() => change('font', font)}
                      aria-pressed={settings.font === font}
                    >
                      <span>Aa</span>
                      {font === 'sans' ? 'Modern' : font === 'serif' ? 'Editorial' : 'Monospace'}
                    </button>
                  ))}
                </div>
                <label className="range-label" htmlFor="text-size">
                  Text size <span>{settings.textSize}px</span>
                </label>
                <input
                  id="text-size"
                  type="range"
                  min="14"
                  max="20"
                  step="1"
                  value={settings.textSize}
                  onChange={(e) => change('textSize', Number(e.target.value))}
                />
              </div>
              <div className="setting-section">
                <h3>Layout</h3>
                <p>Set the spacing and reading width of your conversations.</p>
                <label className="field-label" htmlFor="layout-density">
                  Spacing
                </label>
                <select
                  id="layout-density"
                  className="setting-input"
                  value={settings.density}
                  onChange={(e) => change('density', e.target.value as Settings['density'])}
                >
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </select>
                <label className="field-label layout-width-label" htmlFor="chat-width">
                  Conversation width
                </label>
                <select
                  id="chat-width"
                  className="setting-input"
                  value={settings.chatWidth}
                  onChange={(e) => change('chatWidth', e.target.value as Settings['chatWidth'])}
                >
                  <option value="focused">Focused</option>
                  <option value="wide">Wide</option>
                </select>
                <label className="setting-toggle" htmlFor="show-suggestions">
                  <span>
                    <strong>Prompt suggestions</strong>
                    <small>Show starting points on new chats.</small>
                  </span>
                  <input
                    id="show-suggestions"
                    type="checkbox"
                    role="switch"
                    checked={settings.showSuggestions}
                    onChange={(e) => change('showSuggestions', e.target.checked)}
                  />
                </label>
                <label className="setting-toggle" htmlFor="ascii-animations">
                  <span>
                    <strong>ASCII animations</strong>
                    <small>Intro, response indicator, and attachment motion.</small>
                  </span>
                  <input
                    id="ascii-animations"
                    type="checkbox"
                    role="switch"
                    checked={settings.animations}
                    onChange={(e) => change('animations', e.target.checked)}
                  />
                </label>
              </div>
            </>
          )}
          {tab === 'personal' && (
            <>
              <div className="setting-section">
                <h3>Your name</h3>
                <p>What should we call you?</p>
                <input
                  className="setting-input"
                  placeholder="Your first name"
                  aria-label="Your first name"
                  maxLength={40}
                  value={settings.name}
                  onChange={(e) => change('name', e.target.value)}
                />
              </div>
              <div className="setting-section">
                <h3>Custom instructions</h3>
                <p>
                  Tell Glimpse how you like your responses. These preferences apply to every new
                  reply.
                </p>
                <textarea
                  className="setting-input instructions"
                  aria-label="Custom instructions"
                  placeholder="e.g. Keep answers concise. I’m learning Python, so explain code step by step."
                  maxLength={6000}
                  value={settings.instructions}
                  onChange={(e) => change('instructions', e.target.value)}
                />
              </div>
              <div className="privacy-note">
                <ShieldCheck size={19} />
                <span>
                  Chats and preferences are saved in this browser. Your messages are sent to Hack
                  Club and the selected model to generate replies.
                </span>
              </div>
            </>
          )}
          {tab === 'model' && (
            <>
              <div className="setting-section">
                <h3>Response style</h3>
                <p>
                  Lower creativity gives focused answers. Higher creativity explores more unexpected
                  ideas. Applied when the model supports it.
                </p>
                <label className="range-label" htmlFor="temperature">
                  Creativity <span>{settings.temperature.toFixed(1)}</span>
                </label>
                <input
                  id="temperature"
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => change('temperature', Number(e.target.value))}
                />
                <div className="range-captions">
                  <span>Precise</span>
                  <span>Balanced</span>
                  <span>Creative</span>
                </div>
              </div>
              <div className="setting-section">
                <h3>Response length</h3>
                <p>Set the maximum length of each response.</p>
                <label className="field-label" htmlFor="max-tokens">
                  Maximum output tokens
                </label>
                <select
                  id="max-tokens"
                  className="setting-input"
                  value={settings.maxTokens}
                  onChange={(e) => change('maxTokens', Number(e.target.value))}
                >
                  {[512, 1024, 2048, 4096, 8192, 16384].map((n) => (
                    <option key={n} value={n}>
                      {n.toLocaleString()} tokens
                    </option>
                  ))}
                </select>
              </div>
              <div className="privacy-note">
                <SlidersHorizontal size={19} />
                <span>
                  Different models have different limits. If a model rejects a request, lower the
                  output length or choose another model.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="settings-footer">
        <button className="text-button" onClick={() => update(defaultSettings)}>
          Reset to defaults
        </button>
        <span>Changes saved automatically</span>
        <button className="button-primary" onClick={onClose}>
          Done <Check size={15} />
        </button>
      </div>
    </Dialog>
  );
}
