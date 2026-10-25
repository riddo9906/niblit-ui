import { FormEvent, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiUrl } from '../config/api';
import { usePreferences } from '../lib/preferences';
import {
  CloudChatMessage,
  fetchInferenceModels,
  sendChat,
  responseText,
  streamInferenceChat,
} from '../services/niblitApi';
import { useRuntimeStore } from '../state/runtimeStore';
import { cn } from '../lib/utils';
import { StatusDot, statusKind } from '../components/ui/StatusDot';

interface ChatAttachment {
  name: string;
  content: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  ts: string;
  streaming?: boolean;
  attachments?: ChatAttachment[];
}

type ChatMode = 'runtime' | 'inference';

const examples = [
  'status',
  'health',
  'knowledge stats',
  'help',
];

/** Derive a truthful activity label from live runtime events only. */
function deriveActivity(
  busy: boolean,
  lastEventType?: string,
): { key: 'idle' | 'thinking' | 'memory' | 'tool' | 'active'; label: string } {
  if (busy) {
    return { key: 'thinking', label: 'Thinking…' };
  }
  const type = (lastEventType ?? '').toLowerCase();
  if (type.includes('inference') || type.includes('model')) {
    return { key: 'thinking', label: 'Inference active' };
  }
  if (type.includes('memory')) {
    return { key: 'memory', label: 'Retrieving memory' };
  }
  if (type.includes('tool') || type.includes('execution') || type.includes('command')) {
    return { key: 'tool', label: 'Executing command' };
  }
  if (type) {
    return { key: 'active', label: 'Active' };
  }
  return { key: 'idle', label: 'Idle' };
}

export default function ChatPage() {
  const preferences = usePreferences();
  const [searchParams] = useSearchParams();
  const { events, layerStatus } = useRuntimeStore();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [executedModel, setExecutedModel] = useState<string | null>(null);
  const [executedMeta, setExecutedMeta] = useState<{
    requested?: string | null;
    resolved?: string | null;
    fallback?: boolean | null;
    fallbackReason?: string | null;
    requestId?: string | null;
  } | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>('runtime');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (searchParams.get('prompt')) setInput(searchParams.get('prompt') || ''); if (searchParams.get('mode') === 'inference') setChatMode('inference'); }, [searchParams]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(apiUrl('/api/desktop/conversation'), { signal: controller.signal }).then(response => response.ok ? response.json() : null).then(payload => {
      if (!controller.signal.aborted && Array.isArray(payload?.messages)) {
        const restored: ChatMessage[] = payload.messages.filter((m: CloudChatMessage) => ['user', 'assistant'].includes(m.role)).map((m: CloudChatMessage, index: number) => ({ id: `restored-${index}`, role: m.role, text: responseText(m.content), ts: 'Earlier' }));
        setMessages(current => current.length ? current : restored);
      }
    }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    void fetchInferenceModels().then((items) => {
      const ids = items.map((item) => item.id).filter(Boolean);
      setModels(ids);
      if (ids.length > 0) {
        setSelectedModel(ids.includes(preferences.defaultModel) ? preferences.defaultModel : ids[0]);
      } else {
        setChatMode('runtime');
      }
    });
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function now(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function updateAssistantText(assistantId: string, text: string, streaming = false) {
    setMessages((current) =>
      current.map((message) =>
        message.id === assistantId ? { ...message, text, streaming } : message,
      ),
    );
  }

  async function runRuntimeChat(text: string, assistantId: string, signal: AbortSignal) {
    const context = attachments.map(file => `--- attached: ${file.name} ---\n${file.content}`).join('\n\n');
    const response = await sendChat(context ? `${text}\n\n${context}` : text, signal);
    if (response.error) {
      setError(response.error);
    }
    updateAssistantText(assistantId, response.reply || response.error || '[no response]', false);
  }

  async function runInferenceChat(text: string, assistantId: string, signal: AbortSignal) {
    const history: CloudChatMessage[] = messages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.text,
      }));
    const attachmentContext = attachments
      .map((file) => `--- attached: ${file.name} ---\n${file.content}`)
      .join('\n\n');
    history.push({ role: 'user', content: attachmentContext ? `${attachmentContext}\n\n${text}` : text });

    let accumulated = '';
    await streamInferenceChat(history, selectedModel, (token) => {
      accumulated += token;
      updateAssistantText(assistantId, accumulated, true);
    }, signal, (meta) => {
      setExecutedModel(meta.executed_model ?? null);
      setExecutedMeta({
        requested: meta.requested_model ?? null,
        resolved: meta.resolved_model ?? null,
        fallback: meta.fallback ?? null,
        fallbackReason: meta.fallback_reason ?? null,
        requestId: meta.request_id ?? null,
      });
    });
    updateAssistantText(assistantId, accumulated || '[no response]', false);
  }

  /** Abort an in-flight generation. Partial output is preserved and marked. */
  function stop() {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setMessages((current) =>
      current.map((entry) =>
        entry.streaming
          ? { ...entry, streaming: false, text: entry.text || '[stopped]' }
          : entry,
      ),
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) {
      return;
    }
    setInput('');
    setError('');
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      ts: now(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };
    const assistantId = `a-${Date.now()}`;
    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: 'assistant', text: '', ts: now(), streaming: true },
    ]);
    setAttachments([]);

    try {
      if (chatMode === 'inference' && models.length > 0) {
        await runInferenceChat(text, assistantId, controller.signal);
      } else {
        await runRuntimeChat(text, assistantId, controller.signal);
      }
    } catch (submitError) {
      if ((submitError as Error).name === 'AbortError') {
        updateAssistantText(assistantId, '[stopped]', false);
      } else {
        const message = submitError instanceof Error ? submitError.message : String(submitError);
        setError(message);
        setMessages((current) =>
          current.map((entry) =>
            entry.id === assistantId
              ? { ...entry, text: message, streaming: false, role: 'system' }
              : entry,
          ),
        );
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  async function onAttachFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const loaded: ChatAttachment[] = [];
    for (const file of Array.from(files).slice(0, 4)) {
      try {
        loaded.push({ name: file.name, content: (await file.text()).slice(0, 200_000) });
      } catch {
        setError(`Could not read ${file.name}`);
      }
    }
    setAttachments((current) => [...current, ...loaded].slice(0, 4));
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  }

  function useExample(text: string) {
    setInput(text);
    inputRef.current?.focus();
  }

  const activity = deriveActivity(busy, events[0]?.type);
  const coreKind = statusKind(layerStatus.cognitive);

  return (
    <div className="chat-page">
      <header className="chat-header">
        <div className="chat-header__identity">
          <span className="chat-header__title">Niblit</span>
          <span className="chat-header__mode">
            {chatMode === 'inference'
              ? `Inference · Selected ${selectedModel || 'no model'}`
              : 'Runtime · Core dispatch'}
          </span>
          {executedModel && (
            <span className="chat-header__mode chat-header__mode--meta">
              {executedModel === selectedModel
                ? `Executed ${executedModel}`
                : `Executed ${executedModel || '?'} (fallback${executedMeta?.fallbackReason ? `: ${executedMeta.fallbackReason}` : ''})`}
            </span>
          )}
        </div>
        <div className="chat-header__controls">
          <select className="chat-header__select" aria-label="Conversation mode" value={chatMode}
            disabled={busy} onChange={event => setChatMode(event.target.value as ChatMode)}>
            <option value="runtime">Niblit assistant</option>
            <option value="inference" disabled={!models.length}>Model chat</option>
          </select>
          {models.length > 0 && (
            <select
              className="chat-header__select"
              value={selectedModel}
              onChange={(event) => {
                setSelectedModel(event.target.value);
              }}
              aria-label="Inference model"
            >
              {models.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          )}
          <StatusDot kind={coreKind} label={layerStatus.cognitive} />
          <button type="button" className="chat-tool-btn" disabled={busy || !messages.length}
            title="Clear this view; stored conversation and knowledge remain available."
            onClick={() => { setMessages([]); setError(''); }}>Clear view</button>
        </div>
      </header>

      <div className="runtime-strip" aria-live="polite">
        <span className={cn('runtime-dot', activity.key === 'idle' && 'runtime-dot--idle')} />
        <span>{activity.label}</span>
        {activity.key !== 'idle' && <span className="runtime-strip__pulse" aria-hidden="true" />}
      </div>

      <div className="chat-log" ref={logRef} aria-live="polite">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="chat-empty-title">Ask Niblit, inspect the system, or run a task…</div>
            <div className="chat-empty-subtitle">
              Messages route through Core governance · Ctrl+K opens the command palette
            </div>
            <div className="chat-examples">
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="chat-example-btn"
                  onClick={() => useExample(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <article key={message.id} className={`chat-msg chat-msg--${message.role}`}>
              <header className="chat-msg__header">
                <span className="chat-msg__role">
                  {message.role === 'user' ? 'You' : message.role === 'system' ? 'System' : 'Niblit'}
                </span>
                {message.attachments?.map((file) => (
                  <span key={file.name} className="chat-msg__attachment" title={file.name}>
                    ⎘ {file.name}
                  </span>
                ))}
                <span className="chat-msg__ts">{message.ts}</span>
                {message.role === 'assistant' && message.streaming && (
                  <span className="chat-streaming">
                    <span className="chat-streaming-dot" />
                    streaming…
                  </span>
                )}
              </header>
              <div className="chat-msg__body">
                {message.text.split('**').map((part, i) =>
                  i % 2 === 1 ? (
                    <strong key={i} className="chat-strong">{part}</strong>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
                {message.streaming ? <span className="chat-cursor">▍</span> : null}
              </div>
            </article>
          ))
        )}
      </div>

      {error ? (
        <div className="chat-error" role="alert">
          <span aria-hidden="true">×</span> {error}
        </div>
      ) : null}

      <div className="chat-composer">
        {attachments.length > 0 && (
          <div className="chat-composer__attachments">
            {attachments.map((file) => (
              <button
                key={file.name}
                type="button"
                className="chat-attach-chip"
                title="Click to remove attachment"
                onClick={() => setAttachments((current) => current.filter((item) => item.name !== file.name))}
              >
                ⎘ {file.name} ×
              </button>
            ))}
          </div>
        )}
        <textarea
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (preferences.sendOnEnter && event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void onSubmit(event);
            }
          }}
          placeholder="Ask Niblit, inspect the system, or run a task… (Shift+Enter for newline)"
          disabled={busy}
          rows={2}
        />
        <div className="chat-composer__bar">
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(event) => void onAttachFiles(event.target.files)}
          />
          <button type="button" className="chat-tool-btn" onClick={() => fileRef.current?.click()}>
            + Attach
          </button>
          <span className="chat-tool-hint">Commands ⌘ Ctrl+K</span>
          <div className="chat-composer__actions">
            {busy && (
              <button type="button" className="chat-stop-btn" onClick={stop}>
                ■ Stop
              </button>
            )}
            <button
              type="button"
              className="chat-send-btn"
              onClick={(event) => void onSubmit(event)}
              disabled={!input.trim() || busy}
            >
              Send ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
