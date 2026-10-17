export type Model = {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  description: string;
  parameters: string[];
  inputModalities?: string[];
};
export type Attachment = { name: string; content: string; type?: 'text' | 'image' };
export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  attachments?: Attachment[];
  interrupted?: boolean;
};
export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  model: string;
};
export type Settings = {
  theme: 'light' | 'dark' | 'system';
  accent: 'graphite' | 'blue' | 'sage' | 'rose' | 'violet';
  density: 'comfortable' | 'compact';
  chatWidth: 'focused' | 'wide';
  showSuggestions: boolean;
  animations: boolean;
  font: 'sans' | 'serif' | 'mono';
  textSize: number;
  name: string;
  instructions: string;
  temperature: number;
  maxTokens: number;
};
export const defaultSettings: Settings = {
  theme: 'light',
  accent: 'graphite',
  density: 'comfortable',
  chatWidth: 'focused',
  showSuggestions: true,
  animations: true,
  font: 'sans',
  textSize: 16,
  name: '',
  instructions: '',
  temperature: 0.7,
  maxTokens: 4096,
};
export const defaultModel = 'openai/gpt-4o-mini';
export const fallbackModels: Model[] = [
  {
    id: defaultModel,
    name: 'GPT-4o mini',
    provider: 'OpenAI',
    inputModalities: ['text', 'image'],
    contextLength: 128000,
    description: 'A fast, versatile model for everyday ideas.',
    parameters: ['temperature', 'max_tokens'],
  },
  {
    id: 'qwen/qwen3-32b',
    name: 'Qwen3 32B',
    provider: 'Qwen',
    inputModalities: ['text'],
    contextLength: 40000,
    description: 'A capable open model for writing and coding.',
    parameters: ['temperature', 'max_tokens'],
  },
];
export function id() {
  return crypto.randomUUID();
}
export function messageContent(message: Message) {
  return (
    message.content +
    (message.attachments
      ?.filter((f) => f.type !== 'image')
      .map((f) => `\n\nAttached file: ${f.name}\n\n${f.content}`)
      .join('') || '')
  );
}
