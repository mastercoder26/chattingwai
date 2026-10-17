import { z } from 'zod';
import { attachmentSchema } from './attachments';
import { defaultSettings, type Settings, type Conversation } from './types';
export type WorkspaceSnapshot = {
  settings: Settings;
  conversations: Conversation[];
  activeId: string | null;
  model: string;
};
export function saveWorkspace(snapshot: WorkspaceSnapshot) {
  localStorage.setItem('glimpse:chats', JSON.stringify(snapshot.conversations));
  localStorage.setItem('glimpse:settings', JSON.stringify(snapshot.settings));
  localStorage.setItem('glimpse:model', snapshot.model);
  if (snapshot.activeId) localStorage.setItem('glimpse:active', snapshot.activeId);
  else localStorage.removeItem('glimpse:active');
}
export const settingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  accent: z.enum(['graphite', 'blue', 'sage', 'rose', 'violet']),
  density: z.enum(['comfortable', 'compact']).default('comfortable'),
  chatWidth: z.enum(['focused', 'wide']).default('focused'),
  showSuggestions: z.boolean().default(true),
  animations: z.boolean().default(true),
  font: z.enum(['sans', 'serif', 'mono']),
  textSize: z.number().min(14).max(20),
  name: z.string().max(40),
  instructions: z.string().max(6000),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(256).max(16384),
});
export const conversationsSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string().max(200),
    updatedAt: z.number(),
    model: z.string(),
    messages: z.array(
      z.object({
        id: z.string(),
        role: z.enum(['user', 'assistant']),
        content: z.string(),
        model: z.string().optional(),
        interrupted: z.boolean().optional(),
        attachments: z.array(attachmentSchema).max(4).optional(),
      }),
    ),
  }),
);
export function loadWorkspace() {
  try {
    const settings = settingsSchema.safeParse(
      JSON.parse(localStorage.getItem('glimpse:settings') || 'null'),
    );
    const conversations = conversationsSchema.safeParse(
      JSON.parse(localStorage.getItem('glimpse:chats') || '[]'),
    );
    return {
      settings: settings.success ? settings.data : defaultSettings,
      conversations: conversations.success ? conversations.data : [],
      activeId: localStorage.getItem('glimpse:active') || null,
      model: localStorage.getItem('glimpse:model') || 'openai/gpt-4o-mini',
    };
  } catch {
    return {
      settings: defaultSettings,
      conversations: [],
      activeId: null,
      model: 'openai/gpt-4o-mini',
    };
  }
}
