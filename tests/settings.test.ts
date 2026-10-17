import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsSchema } from '../lib/storage';
import { defaultSettings } from '../lib/types';

test('existing saved preferences gain layout defaults without losing personalization', () => {
  const legacy = {
    theme: 'dark',
    accent: 'sage',
    font: 'serif',
    textSize: 18,
    name: 'Alex',
    instructions: 'Keep replies concise.',
    temperature: 0.4,
    maxTokens: 2048,
  };
  const migrated = settingsSchema.parse(legacy);
  assert.deepEqual(migrated, {
    ...legacy,
    density: 'comfortable',
    chatWidth: 'focused',
    showSuggestions: true,
    animations: true,
  });
});

test('layout and motion preferences survive serialization', () => {
  const customized = {
    ...defaultSettings,
    density: 'compact',
    chatWidth: 'wide',
    showSuggestions: false,
    animations: false,
  };
  assert.deepEqual(settingsSchema.parse(JSON.parse(JSON.stringify(customized))), customized);
});

test('invalid layout and toggle values are rejected at the storage boundary', () => {
  for (const patch of [
    { density: 'tiny' },
    { chatWidth: 'unbounded' },
    { showSuggestions: 'false' },
    { animations: 1 },
  ]) {
    assert.equal(settingsSchema.safeParse({ ...defaultSettings, ...patch }).success, false);
  }
});
