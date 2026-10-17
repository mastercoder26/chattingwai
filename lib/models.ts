import { fallbackModels, type Model } from './types';
export const API_BASE = 'https://ai.hackclub.com/proxy/v1';
let cache: { models: Model[]; at: number } | undefined;
export async function getModels(): Promise<{ models: Model[]; live: boolean }> {
  if (cache && Date.now() - cache.at < 300_000) return { models: cache.models, live: true };
  try {
    const response = await fetch(`${API_BASE}/models`, {
      signal: AbortSignal.timeout(12_000),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Model catalog unavailable');
    const data = await response.json();
    const models: Model[] = data.data
      .filter(
        (m: {
          id: string;
          architecture?: { output_modalities?: string[]; input_modalities?: string[] };
        }) =>
          m.architecture?.output_modalities?.length === 1 &&
          m.architecture.output_modalities.includes('text') &&
          m.architecture?.input_modalities?.includes('text') &&
          !m.id.includes(':batch'),
      )
      .map(
        (m: {
          id: string;
          name: string;
          context_length?: number;
          description?: string;
          supported_parameters?: string[];
          architecture?: { input_modalities?: string[] };
        }) => ({
          id: m.id,
          name: m.name.replace(/^[^:]+:\s*/, ''),
          provider: m.id.split('/')[0],
          contextLength: m.context_length || 0,
          description: (m.description || '').slice(0, 180),
          parameters: m.supported_parameters || [],
          inputModalities: m.architecture?.input_modalities || ['text'],
        }),
      );
    if (!models.length) throw new Error('Empty model catalog');
    cache = { models, at: Date.now() };
    return { models, live: true };
  } catch {
    return { models: cache?.models || fallbackModels, live: false };
  }
}
