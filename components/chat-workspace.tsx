'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  Code2,
  Command,
  Copy,
  Download,
  FileText,
  Lightbulb,
  LockKeyhole,
  Menu,
  MessageCircle,
  PanelLeftClose,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  SquarePen,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { BrandMark } from './brand';
import { AsciiIntro, AsciiThinking } from './ascii-motion';
import { Dialog } from './dialog';
import { RichText } from './markdown';
import { ModelPicker } from './model-picker';
import { ModelLogo } from './model-logo';
import { AttachmentProgress, useAttachmentFlight } from './attachment-motion';
import {
  modelContent,
  exportContent,
  prepareImage,
  MAX_ATTACHMENTS,
  MAX_REQUEST_BYTES,
} from '@/lib/attachments';
import { chatSchema } from '@/lib/chat-schema';
import { SettingsPanel } from './settings-panel';
import {
  defaultModel,
  defaultSettings,
  fallbackModels,
  id,
  type Attachment,
  type Conversation,
  type Message,
  type Model,
  type Settings,
} from '@/lib/types';
import { loadWorkspace, saveWorkspace, type WorkspaceSnapshot } from '@/lib/storage';
import type { ChatEvent } from '@/lib/stream';

const suggestions = {
  'For you': [
    {
      title: 'Explore an idea',
      text: 'Brainstorm a new project',
      prompt:
        'Help me brainstorm a creative side project. Ask me a few questions about my interests first.',
      Icon: Pencil,
      color: 'blue',
    },
    {
      title: 'Write something',
      text: 'Get a first draft on the page',
      prompt:
        'Help me write something that sounds like me. Ask me what I’m writing and who it’s for.',
      Icon: Pencil,
      color: 'violet',
    },
    {
      title: 'Think it through',
      text: 'Work through a question',
      prompt:
        'Help me think through a tricky decision. Ask me about the situation, then help me weigh the options.',
      Icon: Lightbulb,
      color: 'sage',
    },
    {
      title: 'Work on code',
      text: 'Build, debug, or learn',
      prompt:
        'Help me build a small, useful tool. Ask me what I want to make and which programming language I use.',
      Icon: Code2,
      color: 'peach',
    },
  ],
  Create: [
    {
      title: 'A fresh perspective',
      text: 'Find an idea you haven’t tried yet',
      prompt:
        'Help me brainstorm ten unusual ideas for a creative project. First ask me about the medium and theme.',
      Icon: Pencil,
      color: 'blue',
    },
    {
      title: 'Tell a good story',
      text: 'Develop a character and plot',
      prompt:
        'Help me develop a short story. Start by asking about the genre and the kind of character I want.',
      Icon: Pencil,
      color: 'violet',
    },
    {
      title: 'Name your next thing',
      text: 'Something memorable starts here',
      prompt:
        'Help me name a new project. Ask about the project and its audience, then suggest names with explanations.',
      Icon: Lightbulb,
      color: 'sage',
    },
    {
      title: 'Make a plan',
      text: 'Give your big idea a first step',
      prompt:
        'Help me turn an idea into a practical plan with milestones. First ask me what I’m trying to achieve.',
      Icon: FileText,
      color: 'peach',
    },
  ],
  Learn: [
    {
      title: 'Explain it simply',
      text: 'Understand the idea behind the idea',
      prompt:
        'Teach me a complex concept using simple language and analogies. Ask what I would like to understand.',
      Icon: Lightbulb,
      color: 'blue',
    },
    {
      title: 'A learning roadmap',
      text: 'Go from curious to confident',
      prompt:
        'Create a personalized learning roadmap. Ask me what I want to learn, my current level, and available time.',
      Icon: BookOpen,
      color: 'violet',
    },
    {
      title: 'Compare the options',
      text: 'See the differences, side by side',
      prompt:
        'Help me compare two things in a clear Markdown table. Ask me what to compare and what matters to me.',
      Icon: FileText,
      color: 'sage',
    },
    {
      title: 'Test what you know',
      text: 'A friendly challenge for your mind',
      prompt:
        'Quiz me on a topic, one question at a time. Ask me for a topic and difficulty first.',
      Icon: BookOpen,
      color: 'peach',
    },
  ],
  Code: [
    {
      title: 'Start building',
      text: 'A working first version, together',
      prompt:
        'Help me build a small app step by step with well-formatted code. Ask me what to build and my preferred stack.',
      Icon: Code2,
      color: 'blue',
    },
    {
      title: 'Find that bug',
      text: 'Less head-scratching. More progress.',
      prompt: 'Help me debug my code. Ask for the code, error message, and expected behavior.',
      Icon: Search,
      color: 'violet',
    },
    {
      title: 'Make it clearer',
      text: 'Code that’s a joy to come back to',
      prompt:
        'Review and improve my code for readability and correctness. Ask me to paste the code first.',
      Icon: Pencil,
      color: 'sage',
    },
    {
      title: 'Learn by doing',
      text: 'One small challenge at a time',
      prompt:
        'Help me practice coding with a small challenge. Ask me which language I use and my experience level.',
      Icon: BookOpen,
      color: 'peach',
    },
  ],
};
type Category = keyof typeof suggestions;
type Toast = { text: string; undo?: () => void };
const guide = `## Getting started with Glimpse\n\nGlimpse is a space to think, write, learn, and build. Type a question below, or start with one of the suggestions on the home screen.\n\n### Make it yours\n\n- **Choose a model** using the model picker beneath your message. The catalog comes directly from Hack Club.\n- **Change the mood** in Settings: light or dark, four accent colors, and your preferred reading font.\n- **Personalize replies** with custom instructions and creativity controls.\n- **Keep the good stuff**: conversations save in this browser, and you can export them as Markdown.\n\n### Formatting\n\nReplies support **bold**, *italics*, links, lists, quotes, mathematical notation, and syntax-highlighted code.\n\n\`\`\`python\ndef hello(name):\n    return f\"Hello, {name}. Let’s make something.\"\n\nprint(hello(\"curious mind\"))\n\`\`\`\n\n| Shortcut | What it does |\n| --- | --- |\n| ⌘ / Ctrl + K | Search your conversations |\n| ⌘ / Ctrl + Shift + O | Start a fresh chat |\n| Enter | Send your message |\n| Shift + Enter | Add a new line |\n\n> Your API key stays on the server. Chats and preferences stay in this browser. When you send a message, its conversation context and attached text are sent to Hack Club and your selected model.\n\n**What would you like to explore?**`;

export function computeScrollPinning(
  scrollHeight: number,
  scrollTop: number,
  clientHeight: number,
  threshold = 60,
) {
  const distanceToBottom = scrollHeight - scrollTop - clientHeight;
  const isAtBottom = distanceToBottom <= threshold;
  return {
    distanceToBottom,
    isAtBottom,
    showScroll: distanceToBottom > threshold,
  };
}

export function ChatWorkspace() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [models, setModels] = useState<Model[]>(fallbackModels);
  const [catalogLive, setCatalogLive] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modal, setModal] = useState<'settings' | 'models' | 'search' | 'rename' | null>(null);
  const [search, setSearch] = useState('');
  const [rename, setRename] = useState('');
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [preparing, setPreparing] = useState<{ id: string; name: string }[]>([]);
  const [previewImage, setPreviewImage] = useState<Attachment | null>(null);
  const processingFiles = useRef(false);
  const attachmentEpoch = useRef(0);
  const flight = useAttachmentFlight(settings.animations);
  const [category, setCategory] = useState<Category>('For you');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [systemDark, setSystemDark] = useState(false);
  const [showScroll, setShowScroll] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const storageError = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSnapshot = useRef<WorkspaceSnapshot | null>(null);
  const active = conversations.find((c) => c.id === activeId);
  const model = models.find((m) => m.id === selectedModel);
  const requiresVision =
    attachments.some((a) => a.type === 'image') ||
    Boolean(active?.messages.some((m) => m.attachments?.some((a) => a.type === 'image')));
  const visionBlocked = requiresVision && !model?.inputModalities?.includes('image');
  const modelName = model?.name || selectedModel.split('/').pop() || 'Choose a model';
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && systemDark);

  useEffect(() => {
    const saved = loadWorkspace();
    // Browser persistence and media queries are read after hydration.
    /* eslint-disable react-hooks/set-state-in-effect */
    setSettings(saved.settings);
    setConversations(saved.conversations);
    setActiveId(saved.activeId);
    setSelectedModel(saved.model);
    if (window.innerWidth < 900) setSidebarOpen(false);
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(query.matches);
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const change = () => setSystemDark(query.matches);
    query.addEventListener('change', change);
    let cancelled = false;
    const epoch = attachmentEpoch;
    fetch('/api/models')
      .then((r) => {
        if (r.status === 401) {
          window.location.replace('/login');
          throw new Error('Session expired');
        }
        if (!r.ok) throw new Error('Could not load models');
        return r.json();
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data.models)) {
          setModels(data.models);
          setCatalogLive(data.live);
          setConfigured(data.configured);
        }
      })
      .catch(() => {
        if (!cancelled) setCatalogLive(false);
      });
    return () => {
      cancelled = true;
      query.removeEventListener('change', change);
      epoch.current++;
      controller.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    // Throttle saves while tokens stream, retaining the latest snapshot between writes.
    saveSnapshot.current = { conversations, settings, model: selectedModel, activeId };
    if (saveTimer.current) return;
    saveTimer.current = setTimeout(() => {
      try {
        if (saveSnapshot.current) saveWorkspace(saveSnapshot.current);
      } catch {
        if (!storageError.current) {
          setToast({
            text: 'Browser storage is full or unavailable. Export your chat to keep a copy.',
          });
          storageError.current = true;
        }
      } finally {
        saveTimer.current = null;
      }
    }, 250);
  }, [conversations, settings, selectedModel, activeId, loaded]);

  useEffect(() => {
    const flush = () => {
      try {
        if (saveSnapshot.current) saveWorkspace(saveSnapshot.current);
      } catch {
        /* The normal save already reports unavailable storage. */
      }
    };
    window.addEventListener('pagehide', flush);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      flush();
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (textarea.current) {
      textarea.current.style.height = 'auto';
      textarea.current.style.height = `${Math.min(textarea.current.scrollHeight, 180)}px`;
    }
  }, [draft]);
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'instant') => {
    if (bottom.current) {
      bottom.current.scrollIntoView({ behavior, block: 'end' });
    } else if (scrollArea.current) {
      scrollArea.current.scrollTo({
        top: scrollArea.current.scrollHeight,
        behavior,
      });
    }
  }, []);

  const handleScroll = useCallback(() => {
    const area = scrollArea.current;
    if (!area) return;
    const { isAtBottom, showScroll: shouldShow } = computeScrollPinning(
      area.scrollHeight,
      area.scrollTop,
      area.clientHeight,
      60,
    );
    isAtBottomRef.current = isAtBottom;
    setShowScroll((prev) => (prev !== shouldShow ? shouldShow : prev));
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom(streaming ? 'instant' : 'smooth');
    }
  }, [active?.messages, streaming, scrollToBottom]);

  const stop = useCallback(() => {
    controller.current?.abort();
  }, []);
  const newChat = useCallback(() => {
    stop();
    setActiveId(null);
    setDraft('');
    attachmentEpoch.current++;
    processingFiles.current = false;
    setPreparing([]);
    setAttachments([]);
    setError(null);
    isAtBottomRef.current = true;
    setShowScroll(false);
    if (window.innerWidth < 900) setSidebarOpen(false);
    setTimeout(() => textarea.current?.focus(), 50);
  }, [stop]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearch('');
        setModal((current) => (current === 'search' ? null : 'search'));
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        newChat();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [newChat]);

  function selectChat(chat: Conversation) {
    stop();
    setActiveId(chat.id);
    setSelectedModel(chat.model);
    setDraft('');
    attachmentEpoch.current++;
    processingFiles.current = false;
    setPreparing([]);
    setAttachments([]);
    setError(null);
    setModal(null);
    isAtBottomRef.current = true;
    setShowScroll(false);
    if (window.innerWidth < 900) setSidebarOpen(false);
  }
  function chooseModel(value: string) {
    setSelectedModel(value);
    if (activeId)
      setConversations((chats) =>
        chats.map((c) => (c.id === activeId ? { ...c, model: value } : c)),
      );
  }
  function removeChat(chat: Conversation) {
    if (activeId === chat.id) newChat();
    setConversations((chats) => chats.filter((c) => c.id !== chat.id));
    setToast({
      text: 'Conversation deleted',
      undo: () => {
        setConversations((chats) => [chat, ...chats.filter((c) => c.id !== chat.id)]);
        setToast({ text: 'Conversation restored' });
      },
    });
  }
  function openGuide() {
    const existing = conversations.find((c) => c.messages[0]?.content === guide);
    if (existing) {
      selectChat(existing);
      return;
    }
    const chat: Conversation = {
      id: id(),
      title: 'Getting started',
      model: selectedModel,
      // eslint-disable-next-line react-hooks/purity -- The guide is created only by this click handler.
      updatedAt: Date.now(),
      messages: [{ id: id(), role: 'assistant', content: guide, model: 'Glimpse guide' }],
    };
    setConversations((chats) => [chat, ...chats]);
    selectChat(chat);
  }
  async function copyMessage(message: Message) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(message.id);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setToast({ text: 'Clipboard unavailable. You can select and copy the text manually.' });
    }
  }
  function exportChat() {
    if (!active) return;
    const text =
      `# ${active.title}\n\n` +
      active.messages
        .map(
          (m) => `## ${m.role === 'user' ? 'You' : m.model || 'Glimpse'}\n\n${exportContent(m)}\n`,
        )
        .join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${active.title.replace(/[^a-z0-9 -]/gi, '').slice(0, 60) || 'conversation'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ text: 'Conversation exported as Markdown' });
  }
  async function attachFiles(files: File[]) {
    if (processingFiles.current) {
      setToast({ text: 'Please wait for the current files to finish preparing.' });
      return;
    }
    const available = MAX_ATTACHMENTS - attachments.length;
    if (files.length > available)
      setToast({ text: 'Attach up to four images or text files per message.' });
    const pending = files.slice(0, available).map((file) => ({ file, id: id(), name: file.name }));
    if (!pending.length) return;
    const epoch = attachmentEpoch.current;
    processingFiles.current = true;
    setPreparing(pending.map(({ id, name }) => ({ id, name })));
    let textLength = attachments
      .filter((a) => a.type !== 'image')
      .reduce((n, a) => n + a.content.length, 0);
    try {
      for (const { file, id: pendingId } of pending) {
        try {
          let attachment: Attachment;
          if (file.type.startsWith('image/')) attachment = await prepareImage(file);
          else {
            if (
              !/\.(txt|md|csv|json|js|jsx|ts|tsx|py|html|css|yaml|yml|xml|sql|sh|rs|go)$/i.test(
                file.name,
              )
            )
              throw new Error('Choose a PNG, JPEG, WebP, text, or source-code file.');
            if (file.size > 80_000) throw new Error('Text files must be under 80 KB each.');
            const content = await file.text();
            if (textLength + content.length > 80_000)
              throw new Error('Attached text must total less than 80,000 characters.');
            textLength += content.length;
            attachment = { type: 'text', name: file.name.slice(0, 250), content };
          }
          if (attachmentEpoch.current !== epoch) return;
          setAttachments((current) => [...current, attachment]);
        } catch (error) {
          if (attachmentEpoch.current !== epoch) return;
          setToast({
            text: error instanceof Error ? error.message : `Could not read ${file.name}.`,
          });
        }
        setPreparing((current) => current.filter((item) => item.id !== pendingId));
      }
    } finally {
      if (attachmentEpoch.current === epoch) {
        processingFiles.current = false;
        setPreparing([]);
      }
    }
  }

  async function send(override?: Message[]) {
    if (
      controller.current ||
      processingFiles.current ||
      (!override && !draft.trim() && !attachments.length)
    )
      return;
    if (visionBlocked) {
      setModal('models');
      return;
    }
    const user: Message = {
      id: id(),
      role: 'user',
      content:
        draft.trim() ||
        (attachments.some((a) => a.type === 'image')
          ? 'What’s in these images?'
          : 'Help me understand the attached files.'),
      attachments: attachments.length ? attachments : undefined,
    };
    const history = override || [...(active?.messages || []), user];
    const payload = {
      model: selectedModel,
      messages: history
        .filter((m) => m.content.trim() || m.attachments?.length)
        .map((m) => ({ role: m.role, content: modelContent(m) })),
      instructions: settings.instructions,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
    };
    const validated = chatSchema.safeParse(payload);
    if (!validated.success) {
      setToast({ text: validated.error.issues[0].message });
      return;
    }
    const body = JSON.stringify(validated.data);
    if (new TextEncoder().encode(body).length > MAX_REQUEST_BYTES) {
      setToast({ text: 'This conversation is too large. Start a new chat to continue.' });
      return;
    }
    if (!override) flight.launch(user.id);
    const pending: Message = { id: id(), role: 'assistant', content: '', model: modelName };
    const chatId = active?.id || id();
    const chat: Conversation = {
      id: chatId,
      title: active?.title || user.content.slice(0, 52),
      messages: [...history, pending],
      updatedAt: Date.now(),
      model: selectedModel,
    };
    setConversations((chats) => [chat, ...chats.filter((c) => c.id !== chatId)]);
    setActiveId(chatId);
    setDraft('');
    attachmentEpoch.current++;
    processingFiles.current = false;
    setPreparing([]);
    setAttachments([]);
    setStreaming(true);
    setError(null);
    isAtBottomRef.current = true;
    setShowScroll(false);
    scrollToBottom('smooth');
    const abort = new AbortController();
    controller.current = abort;
    let received = '';
    let completed = false;
    let streamError: string | undefined;
    const update = (content: string, interrupted = false) =>
      setConversations((chats) =>
        chats.map((c) =>
          c.id === chatId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === pending.id ? { ...m, content, interrupted } : m,
                ),
              }
            : c,
        ),
      );
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abort.signal,
        body,
      });
      if (response.status === 401) {
        window.location.replace('/login');
        return;
      }
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'The model could not reply. Please try again.');
      }
      if (!response.body) throw new Error('No response received. Please try again.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const consume = (line: string) => {
        if (!line.trim()) return;
        const event: ChatEvent = JSON.parse(line);
        if (event.type === 'delta') {
          received += event.text;
          update(received);
        }
        if (event.type === 'error') streamError = event.message;
        if (event.type === 'done') {
          completed = true;
          if (event.reason === 'length')
            setToast({
              text: 'Reply reached the output limit. Ask “continue” or increase the limit in settings.',
            });
        }
      };
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          lines.forEach(consume);
        }
        buffer += decoder.decode();
        if (buffer.trim()) consume(buffer);
      } finally {
        reader.releaseLock();
      }
      if (streamError) throw new Error(streamError);
      if (!completed) throw new Error('The reply was interrupted. You can retry below.');
      if (!received)
        throw new Error('The model returned an empty reply. Try again or choose another model.');
    } catch (e) {
      if (!abort.signal.aborted)
        setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      if (received) update(received, true);
      else
        setConversations((chats) =>
          chats.map((c) =>
            c.id === chatId ? { ...c, messages: c.messages.filter((m) => m.id !== pending.id) } : c,
          ),
        );
    } finally {
      controller.current = null;
      setStreaming(false);
      setTimeout(() => textarea.current?.focus(), 50);
    }
  }
  function retry() {
    if (!active) return;
    const lastUser = active.messages.findLastIndex((m) => m.role === 'user');
    if (lastUser >= 0) void send(active.messages.slice(0, lastUser + 1));
  }
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  const searchResults = sorted.filter((c) =>
    `${c.title} ${c.messages.map((m) => m.content).join(' ')}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const style = { '--message-size': `${settings.textSize}px` } as CSSProperties;

  return (
    <div
      className={`workspace ${dark ? 'dark' : 'light'} accent-${settings.accent} font-${settings.font} density-${settings.density} width-${settings.chatWidth} ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}
      style={style}
    >
      {sidebarOpen && (
        <button
          className="sidebar-scrim"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}
      <aside className="sidebar" aria-label="Chat sidebar">
        <div className="sidebar-brand">
          <button className="brand-button" onClick={newChat} aria-label="Glimpse home">
            <BrandMark size={27} />
            <span>Glimpse</span>
          </button>
          <button
            className="icon-button collapse-sidebar"
            onClick={() => setSidebarOpen(false)}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={17} />
          </button>
        </div>
        <button className="new-chat" onClick={newChat}>
          <SquarePen size={18} strokeWidth={1.7} />
          <span>New chat</span>
          <span className="new-chat-shortcut">⌘ ⇧ O</span>
        </button>
        <button
          className="sidebar-search"
          onClick={() => {
            setSearch('');
            setModal('search');
          }}
        >
          <Search size={17} />
          <span>Search chats</span>
          <kbd>⌘ K</kbd>
        </button>
        <button className="sidebar-search" onClick={() => setModal('models')}>
          <SlidersHorizontal size={17} strokeWidth={1.7} />
          <span>Models</span>
        </button>
        <div className="history">
          <div className="section-label">
            Recent chats <span>{conversations.length ? conversations.length : ''}</span>
          </div>
          {sorted.length ? (
            <div className="history-list">
              {sorted.map((chat) => (
                <div
                  className={`history-item ${activeId === chat.id ? 'active' : ''}`}
                  key={chat.id}
                >
                  <button className="history-open" onClick={() => selectChat(chat)}>
                    <MessageCircle size={15} />
                    <span>{chat.title}</span>
                  </button>
                  <button
                    className="history-delete icon-button"
                    onClick={() => removeChat(chat)}
                    aria-label={`Delete ${chat.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="history-empty">
              <MessageCircle size={22} strokeWidth={1.4} />
              <p>No conversations yet</p>
              <span>Your chats will appear here.</span>
            </div>
          )}
        </div>
        <div className="sidebar-bottom">
          <button className="sidebar-guide" onClick={openGuide}>
            <BookOpen size={17} strokeWidth={1.7} /> Getting started
          </button>
          <button className="sidebar-guide" onClick={() => setModal('settings')}>
            <Settings2 size={17} strokeWidth={1.7} /> Settings & preferences
          </button>
          <div className="workspace-profile">
            <div className="avatar">{settings.name ? settings.name[0].toUpperCase() : 'Y'}</div>
            <div>
              <strong>{settings.name || 'Your workspace'}</strong>
              <span>Saved on this device</span>
            </div>
            <button
              className="icon-button"
              onClick={() => setModal('settings')}
              aria-label="Open settings"
            >
              <Settings2 size={17} />
            </button>
          </div>
        </div>
      </aside>

      <main className={`main ${active ? 'has-chat' : ''}`}>
        <header className="topbar">
          <div className="topbar-left">
            {!sidebarOpen && (
              <button
                className="icon-button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu size={20} />
              </button>
            )}
            <span className="breadcrumb">{active ? 'Chat' : 'New chat'}</span>
            {active && (
              <>
                <span className="breadcrumb-slash">/</span>
                <button
                  className="chat-title"
                  onClick={() => {
                    setRename(active.title);
                    setModal('rename');
                  }}
                  title="Rename conversation"
                >
                  {active.title}
                  <Pencil size={12} />
                </button>
              </>
            )}
          </div>
          <div className="topbar-right">
            {active && (
              <button
                className="icon-button"
                onClick={exportChat}
                aria-label="Export conversation"
                title="Export as Markdown"
              >
                <Download size={17} />
              </button>
            )}
            <button
              className="icon-button"
              aria-label="Lock workspace"
              title="Lock workspace"
              onClick={async () => {
                controller.current?.abort();
                try {
                  const response = await fetch('/api/auth/logout', { method: 'POST' });
                  if (!response.ok) throw new Error('Could not lock workspace');
                  window.location.replace('/login');
                } catch {
                  setToast({ text: 'Could not lock your workspace. Please try again.' });
                }
              }}
            >
              <LockKeyhole size={17} />
            </button>
            <span className="workspace-badge">
              <span className={`status-dot ${configured ? '' : 'offline'}`} />
              {configured ? 'Personal workspace' : 'Offline workspace'}
            </span>
            <button
              className="appearance-button icon-button"
              onClick={() => setModal('settings')}
              aria-label="Customize appearance"
              title="Customize appearance"
            >
              <Settings2 size={17} />
            </button>
          </div>
        </header>

        <div
          className="main-scroll"
          ref={scrollArea}
          onScroll={handleScroll}
          onWheel={(e) => {
            if (e.deltaY < -2) {
              isAtBottomRef.current = false;
            }
          }}
        >
          {!active ? (
            <div className="welcome content-width">
              <section className="hero">
                <AsciiIntro animated={settings.animations} />
                <h1>
                  {settings.name
                    ? `What’s on your mind, ${settings.name}?`
                    : 'What can I help with?'}
                </h1>
              </section>
              <Composer
                draft={draft}
                setDraft={setDraft}
                textarea={textarea}
                attachments={attachments}
                removeAttachment={(index) => setAttachments((a) => a.filter((_, i) => i !== index))}
                modelName={modelName}
                modelId={selectedModel}
                preparing={preparing}
                onFiles={(files) => void attachFiles(files)}
                visionBlocked={visionBlocked}
                animations={settings.animations}
                streaming={streaming}
                onSend={() => void send()}
                onStop={stop}
                onModels={() => setModal('models')}
                onAttach={() => fileInput.current?.click()}
              />
              {settings.showSuggestions && (
                <section className="inspiration">
                  <div className="inspiration-heading">
                    <span>Try a starting point</span>
                    <div className="category-tabs" aria-label="Prompt categories">
                      {(Object.keys(suggestions) as Category[]).map((c) => (
                        <button
                          className={category === c ? 'active' : ''}
                          key={c}
                          onClick={() => setCategory(c)}
                          aria-pressed={category === c}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="suggestion-grid" key={category}>
                    {suggestions[category].map(({ title, text, prompt, Icon, color }) => (
                      <button
                        className="suggestion-card"
                        key={title}
                        onClick={() => {
                          setDraft(prompt);
                          textarea.current?.focus();
                        }}
                      >
                        <span className={`suggestion-icon ${color}`}>
                          <Icon size={19} strokeWidth={1.7} />
                        </span>
                        <strong>{title}</strong>
                        <span className="suggestion-description">{text}</span>
                        <ArrowRight className="suggestion-arrow" size={15} />
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <div className="welcome-note">
                <ShieldCheck size={14} />
                <span>Chats are saved in this browser.</span>
                <span className="note-dot">·</span>
                <button onClick={openGuide}>
                  How it works <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ) : (
            <div className="conversation content-width" aria-label="Conversation messages">
              {active.messages.map((message, index) => (
                <article
                  className={`message ${message.role} ${!message.content && streaming ? 'thinking' : ''}`}
                  key={message.id}
                  data-message-id={message.id}
                >
                  <div className="message-avatar">
                    {message.role === 'assistant' ? (
                      <BrandMark size={20} />
                    ) : settings.name ? (
                      settings.name[0].toUpperCase()
                    ) : (
                      'Y'
                    )}
                  </div>
                  <div className="message-body">
                    <div className="message-heading">
                      <strong>
                        {message.role === 'user' ? settings.name || 'You' : 'Glimpse'}
                      </strong>
                      {message.role === 'assistant' && <span>{message.model}</span>}
                      {message.interrupted && <span className="interrupted">Stopped</span>}
                    </div>
                    {message.role === 'assistant' ? (
                      message.content ? (
                        <RichText content={message.content} />
                      ) : (
                        <AsciiThinking animated={settings.animations} />
                      )
                    ) : (
                      <div className="user-content">{message.content}</div>
                    )}
                    {message.attachments?.length ? (
                      <div className="message-attachments">
                        {message.attachments.map((f, i) =>
                          f.type === 'image' ? (
                            <button
                              className="message-image"
                              key={i}
                              onClick={() => setPreviewImage(f)}
                              aria-label={`View ${f.name}`}
                            >
                              {/* User-selected local data URL; preserve the image without a remote optimizer. */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={f.content}
                                alt={f.name}
                                data-attachment-image
                                data-attachment-index={i}
                              />
                            </button>
                          ) : (
                            <span key={i}>
                              <FileText size={14} />
                              {f.name}
                            </span>
                          ),
                        )}
                      </div>
                    ) : null}
                    {message.content && (
                      <div className="message-actions">
                        <button
                          className="icon-button"
                          onClick={() => void copyMessage(message)}
                          aria-label={`Copy ${message.role === 'user' ? 'message' : 'response'}`}
                          title="Copy Markdown"
                        >
                          {copied === message.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                        {message.role === 'user' && (
                          <button
                            className="icon-button"
                            onClick={() => {
                              setEditing(message);
                              setEditText(message.content);
                            }}
                            disabled={streaming}
                            aria-label="Edit message"
                            title="Edit and resend"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {message.role === 'user' &&
                          index === active.messages.length - 1 &&
                          !streaming && (
                            <button
                              className="icon-button"
                              onClick={retry}
                              aria-label="Retry response"
                              title="Try this message again"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                        {message.role === 'assistant' &&
                          index === active.messages.length - 1 &&
                          active.messages.some((m) => m.role === 'user') && (
                            <button
                              className="icon-button"
                              onClick={retry}
                              disabled={streaming}
                              aria-label="Regenerate response"
                              title="Try a new response"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                </article>
              ))}
              {error && (
                <div className="chat-error" role="alert">
                  <span>{error}</span>
                  <button onClick={retry} disabled={streaming}>
                    <RotateCcw size={14} /> Try again
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => setError(null)}
                    aria-label="Dismiss error"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
              <div ref={bottom} className="conversation-bottom" />
            </div>
          )}
        </div>

        {active && (
          <div className="composer-dock">
            {showScroll && (
              <button
                className="scroll-bottom"
                onClick={() => {
                  isAtBottomRef.current = true;
                  setShowScroll(false);
                  scrollToBottom('smooth');
                }}
                aria-label="Scroll to latest message"
              >
                <ArrowDown size={17} />
              </button>
            )}
            <div className="content-width">
              <Composer
                draft={draft}
                setDraft={setDraft}
                textarea={textarea}
                attachments={attachments}
                removeAttachment={(index) => setAttachments((a) => a.filter((_, i) => i !== index))}
                modelName={modelName}
                modelId={selectedModel}
                preparing={preparing}
                onFiles={(files) => void attachFiles(files)}
                visionBlocked={visionBlocked}
                animations={settings.animations}
                streaming={streaming}
                onSend={() => void send()}
                onStop={stop}
                onModels={() => setModal('models')}
                onAttach={() => fileInput.current?.click()}
              />
              <p className="composer-disclaimer">
                Glimpse can make mistakes. Check important information.
              </p>
            </div>
          </div>
        )}
        {!active && (
          <footer className="main-footer">
            <span>Glimpse</span>
            <div>
              <kbd>
                <Command size={10} /> K
              </kbd>{' '}
              to find a conversation
              <span className="footer-divider" />
              <kbd>↵</kbd> to send
            </div>
            <BrandMark size={16} />
          </footer>
        )}
        <input
          ref={fileInput}
          type="file"
          hidden
          multiple
          accept="image/png,image/jpeg,image/webp,.txt,.md,.csv,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.yaml,.yml,.xml,.sql,.sh,.rs,.go"
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            event.target.value = '';
            void attachFiles(files);
          }}
          aria-label="Attach images or text files"
        />
      </main>

      {previewImage && (
        <Dialog
          title={previewImage.name}
          className="image-preview-dialog"
          onClose={() => setPreviewImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="image-full-preview" src={previewImage.content} alt={previewImage.name} />
        </Dialog>
      )}
      {modal === 'models' && (
        <ModelPicker
          models={models}
          requiresVision={requiresVision}
          selected={selectedModel}
          live={catalogLive}
          onSelect={chooseModel}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'settings' && (
        <SettingsPanel
          settings={settings}
          update={setSettings}
          configured={configured}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'search' && (
        <Dialog
          title="Search chats"
          description="Search by title or message."
          onClose={() => setModal(null)}
          className="search-dialog"
        >
          <div className="search-field">
            <Search size={18} />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your conversations…"
              aria-label="Search conversations"
            />
            <kbd>ESC</kbd>
          </div>
          <div className="search-results">
            {searchResults.length ? (
              searchResults.map((chat) => (
                <button key={chat.id} onClick={() => selectChat(chat)}>
                  <MessageCircle size={17} />
                  <div>
                    <strong>{chat.title}</strong>
                    <span>
                      {chat.messages.find((m) => m.role === 'user')?.content.slice(0, 90) ||
                        'Your introduction to Glimpse'}
                    </span>
                  </div>
                  <ArrowRight size={15} />
                </button>
              ))
            ) : (
              <div className="empty-search">
                <Search size={27} />
                <strong>
                  {conversations.length ? 'No matching conversations' : 'A fresh start'}
                </strong>
                <p>
                  {conversations.length
                    ? 'Try another word or phrase.'
                    : 'Your conversations will be searchable here.'}
                </p>
              </div>
            )}
          </div>
        </Dialog>
      )}
      {modal === 'rename' && active && (
        <Dialog title="Rename chat" onClose={() => setModal(null)} className="small-dialog">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (rename.trim()) {
                setConversations((chats) =>
                  chats.map((c) => (c.id === active.id ? { ...c, title: rename.trim() } : c)),
                );
                setModal(null);
              }
            }}
          >
            <input
              className="setting-input"
              autoFocus
              aria-label="Conversation name"
              maxLength={100}
              value={rename}
              onChange={(e) => setRename(e.target.value)}
            />
            <div className="form-actions">
              <button type="button" className="text-button" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="button-primary" disabled={!rename.trim()}>
                Save name <Check size={15} />
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {editing && active && (
        <Dialog
          title="A fresh way to say it."
          description="Sending an edit replaces the replies after this message."
          onClose={() => setEditing(null)}
          className="small-dialog"
        >
          <textarea
            className="setting-input edit-textarea"
            autoFocus
            aria-label="Edit message text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
          />
          <div className="form-actions">
            <button className="text-button" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button
              className="button-primary"
              disabled={!editText.trim() || streaming}
              onClick={() => {
                const index = active.messages.findIndex((m) => m.id === editing.id);
                const history = [
                  ...active.messages.slice(0, index),
                  { ...editing, content: editText.trim() },
                ];
                setEditing(null);
                void send(history);
              }}
            >
              Save & send <ArrowUp size={15} />
            </button>
          </div>
        </Dialog>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          <span>{toast.text}</span>
          {toast.undo && <button onClick={toast.undo}>Undo</button>}
          <button
            className="icon-button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function Composer({
  draft,
  setDraft,
  textarea,
  attachments,
  removeAttachment,
  modelName,
  modelId,
  preparing,
  onFiles,
  visionBlocked,
  animations,
  streaming,
  onSend,
  onStop,
  onModels,
  onAttach,
}: {
  draft: string;
  setDraft: (value: string) => void;
  textarea: React.RefObject<HTMLTextAreaElement | null>;
  attachments: Attachment[];
  removeAttachment: (index: number) => void;
  modelName: string;
  modelId: string;
  preparing: { id: string; name: string }[];
  onFiles: (files: File[]) => void;
  visionBlocked: boolean;
  animations: boolean;
  streaming: boolean;
  onSend: () => void;
  onStop: () => void;
  onModels: () => void;
  onAttach: () => void;
}) {
  return (
    <div
      className={`composer ${animations ? '' : 'attachments-static'}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) e.preventDefault();
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files.length) {
          e.preventDefault();
          onFiles(Array.from(e.dataTransfer.files));
        }
      }}
    >
      <div className="composer-input">
        <textarea
          ref={textarea}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files).filter((file) =>
              file.type.startsWith('image/'),
            );
            if (!files.length) return;
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            if (text) {
              const { selectionStart, selectionEnd } = e.currentTarget;
              setDraft(
                (draft.slice(0, selectionStart) + text + draft.slice(selectionEnd)).slice(
                  0,
                  80_000,
                ),
              );
            }
            onFiles(files);
          }}
          maxLength={80_000}
          placeholder="Ask anything"
          aria-label="Message Glimpse"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (!streaming) onSend();
            }
          }}
        />
      </div>
      {(attachments.length > 0 || preparing.length > 0) && (
        <div className="attached-files">
          {attachments.map((file, i) =>
            file.type === 'image' ? (
              <div className="attachment-preview" key={`${i}-${file.name}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.content}
                  alt={file.name}
                  data-attachment-image
                  data-attachment-index={i}
                />
                <span className="attachment-ready">
                  <Check size={11} /> Ready
                </span>
                <button
                  className="attachment-remove"
                  onClick={() => removeAttachment(i)}
                  aria-label={`Remove ${file.name}`}
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <span key={`${i}-${file.name}`}>
                <FileText size={14} />
                {file.name}
                <button onClick={() => removeAttachment(i)} aria-label={`Remove ${file.name}`}>
                  <X size={12} />
                </button>
              </span>
            ),
          )}
          {preparing.map((file) => (
            <AttachmentProgress key={file.id} name={file.name} />
          ))}
        </div>
      )}
      {visionBlocked && (
        <button className="vision-notice" onClick={onModels}>
          Choose a vision model to send images <ArrowRight size={13} />
        </button>
      )}
      <div className="composer-controls">
        <div className="composer-tools">
          <button
            className="model-trigger"
            onClick={onModels}
            disabled={streaming}
            aria-label={`Choose model, current ${modelName}`}
          >
            <ModelLogo modelId={modelId} size={17} />
            <span>{modelName}</span>
            <ChevronDown size={13} />
          </button>
          <span className="tool-divider" />
          <button
            className="attach-button icon-button"
            onClick={onAttach}
            aria-label="Attach images or files"
            title="Upload an image or text file, or paste an image"
          >
            <Plus size={20} strokeWidth={1.7} />
          </button>
        </div>
        <div className="composer-send">
          <span>Shift + Enter for a new line</span>
          {streaming ? (
            <button className="send-button" onClick={onStop} aria-label="Stop response">
              <Square size={15} fill="currentColor" />
            </button>
          ) : (
            <button
              className="send-button"
              onClick={onSend}
              disabled={
                preparing.length > 0 || visionBlocked || (!draft.trim() && !attachments.length)
              }
              aria-label="Send message"
            >
              <ArrowUp size={19} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
