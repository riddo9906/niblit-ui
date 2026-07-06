import { FormEvent, useEffect, useState } from 'react';
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
  streaming?: boolean;
}

type ChatMode = 'runtime' | 'inference';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('local');
  const [chatMode, setChatMode] = useState<ChatMode>('inference');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
    };
    const assistantId = `a-${Date.now()}`;
    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: 'assistant', text: '', streaming: chatMode === 'inference' },
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

  return (
    <div className="panel chat-page">
      <header className="chat-header">
        <div>
          <h2>Chat</h2>
          <p>
            Runtime commands use the Niblit API; inference streams from cloud-server SSE — no
            Python imports in the UI.
          </p>
        </div>
        <div className="chat-controls">
          <label className="model-picker">
            <span>Mode</span>
            <select
              value={chatMode}
              onChange={(event) => setChatMode(event.target.value as ChatMode)}
            >
              <option value="inference" disabled={models.length === 0}>
                Inference (SSE)
              </option>
              <option value="runtime">Runtime command</option>
            </select>
          </label>
          <label className="model-picker">
            <span>Cloud model</span>
            <select
              value={selectedModel}
              onChange={(event) => setSelectedModel(event.target.value)}
              disabled={models.length === 0 || chatMode !== 'inference'}
            >
              {models.length === 0 ? (
                <option value="local">local (cloud API offline)</option>
              ) : (
                models.map((modelId) => (
                  <option key={modelId} value={modelId}>
                    {modelId}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>
      </header>

      {error ? <div className="chat-error">{error}</div> : null}

      <div className="chat-log" aria-live="polite">
        {messages.length === 0 ? (
          <p className="chat-empty">Send a command or question to the Niblit backend.</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`chat-line chat-line-${message.role}`}>
              <strong>{message.role}</strong>
              <pre>
                {message.text}
                {message.streaming ? <span className="chat-cursor">▍</span> : null}
              </pre>
            </div>
          ))
        )}
      </div>

      <form className="chat-form" onSubmit={onSubmit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={chatMode === 'inference' ? 'Ask the cloud model…' : 'Send a runtime command…'}
          disabled={busy}
        />
        <button type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
