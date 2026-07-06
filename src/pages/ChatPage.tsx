import { FormEvent, useEffect, useState } from 'react';
import { fetchCloudModels, sendChat } from '../services/niblitApi';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
}

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('local');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetchCloudModels().then((items) => {
      const ids = items.map((item) => item.id).filter(Boolean);
      setModels(ids);
      if (ids.length > 0) {
        setSelectedModel(ids[0]);
      }
    });
  }, []);

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
    setMessages((current) => [...current, userMessage]);

    try {
      const response = await sendChat(text);
      if (response.error) {
        setError(response.error);
      }
      setMessages((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: response.reply || response.error || '[no response]',
        },
      ]);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : String(submitError);
      setError(message);
      setMessages((current) => [
        ...current,
        { id: `e-${Date.now()}`, role: 'system', text: message },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel chat-page">
      <header className="chat-header">
        <div>
          <h2>Chat</h2>
          <p>Commands route through the Niblit runtime API — no direct Python imports.</p>
        </div>
        <label className="model-picker">
          <span>Cloud model</span>
          <select
            value={selectedModel}
            onChange={(event) => setSelectedModel(event.target.value)}
            disabled={models.length === 0}
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
      </header>

      {error ? <div className="chat-error">{error}</div> : null}

      <div className="chat-log" aria-live="polite">
        {messages.length === 0 ? (
          <p className="chat-empty">Send a command or question to the Niblit backend.</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`chat-line chat-line-${message.role}`}>
              <strong>{message.role}</strong>
              <pre>{message.text}</pre>
            </div>
          ))
        )}
      </div>

      <form className="chat-form" onSubmit={onSubmit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask Niblit…"
          disabled={busy}
        />
        <button type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
