import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  CloudChatMessage,
  fetchCloudModels,
  sendChat,
  streamCloudChatCompletion,
} from '../services/niblitApi';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  ts: string;
  streaming?: boolean;
}

type ChatMode = 'runtime' | 'inference';

const examples = [
  'Create a FastAPI backend',
  'Explain this function',
  'Refactor this class',
  'Generate tests',
];

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('local');
  const [chatMode, setChatMode] = useState<ChatMode>('inference');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void fetchCloudModels().then((items) => {
      const ids = items.map((item) => item.id).filter(Boolean);
      setModels(ids);
      if (ids.length > 0) {
        setSelectedModel(ids[0]);
        setChatMode('inference');
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

  async function runRuntimeChat(text: string, assistantId: string) {
    const response = await sendChat(text);
    if (response.error) {
      setError(response.error);
    }
    updateAssistantText(assistantId, response.reply || response.error || '[no response]', false);
  }

  async function runInferenceChat(text: string, assistantId: string) {
    const history: CloudChatMessage[] = messages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.text,
      }));
    history.push({ role: 'user', content: text });

    let accumulated = '';
    await streamCloudChatCompletion(history, selectedModel, (token) => {
      accumulated += token;
      updateAssistantText(assistantId, accumulated, true);
    });
    updateAssistantText(assistantId, accumulated || '[no response]', false);
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
    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      ts: now(),
    };
    const assistantId = `a-${Date.now()}`;
    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: 'assistant', text: '', ts: now(), streaming: chatMode === 'inference' },
    ]);

    try {
      if (chatMode === 'inference' && models.length > 0) {
        await runInferenceChat(text, assistantId);
      } else {
        await runRuntimeChat(text, assistantId);
      }
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : String(submitError);
      setError(message);
      setMessages((current) =>
        current.map((entry) =>
          entry.id === assistantId
            ? { ...entry, text: message, streaming: false, role: 'system' }
            : entry,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  function useExample(text: string) {
    setInput(text);
    inputRef.current?.focus();
  }

  return (
    <div className="chat-page">
      <div className="chat-log" ref={logRef} aria-live="polite">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="chat-empty-title">Ask Niblit...</div>
            <div className="chat-empty-subtitle">
              Your local coding assistant — 100% offline via llama.cpp
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
            <div
              key={message.id}
              className={`chat-bubble chat-bubble-${message.role}`}
            >
              <div className="chat-bubble-header">
                <span className="chat-role">
                  {message.role === 'user' ? 'You' : 'LocalCoder'}
                </span>
                <span className="chat-ts">{message.ts}</span>
                {message.role === 'assistant' && message.streaming && (
                  <span className="chat-streaming">
                    <span className="chat-streaming-dot" />
                    streaming…
                  </span>
                )}
              </div>
              <div className="chat-bubble-content">
                {message.text.split('**').map((part, i) =>
                  i % 2 === 1 ? (
                    <strong key={i} className="chat-strong">
                      {part}
                    </strong>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
                {message.streaming ? <span className="chat-cursor">▍</span> : null}
              </div>
            </div>
          ))
        )}
      </div>

      {error ? <div className="chat-error">{error}</div> : null}

      <div className="chat-input-area">
        <div className="chat-input-container">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void onSubmit(event);
              }
            }}
            placeholder="Ask Niblit — explain, fix, generate, refactor… (Shift+Enter for newline)"
            disabled={busy}
            rows={1}
          />
          <button
            type="button"
            className="chat-send-btn"
            onClick={(event) => void onSubmit(event)}
            disabled={!input.trim() || busy}
          >
            {busy ? 'Sending…' : 'Send'}
          </button>
        </div>
        <div className="chat-input-footer">
          <span className="chat-input-hint">
            llama-server • POST /v1/chat/completions • stream
          </span>
        </div>
      </div>
    </div>
  );
}
