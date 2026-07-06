import { API_BASE_URL, apiUrl, cloudUrl } from '../config/api';

export interface ChatResponse {
  reply: string;
  error?: string;
}

export interface CloudChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface RuntimeStatus {
  status?: string;
  runtime_mode?: string;
  active_provider?: string;
  threads?: number;
  [key: string]: unknown;
}

export interface ModelInfo {
  id: string;
  object?: string;
}

export async function fetchHealth(): Promise<boolean> {
  try {
    const response = await fetch(apiUrl('/health'), { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

export async function fetchRuntimeStatus(): Promise<RuntimeStatus | null> {
  try {
    const response = await fetch(apiUrl('/api/status'));
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as RuntimeStatus;
  } catch {
    return null;
  }
}

export async function sendChat(text: string): Promise<ChatResponse> {
  const response = await fetch(apiUrl('/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const payload = (await response.json()) as ChatResponse & { error?: string };
  if (!response.ok) {
    return { reply: '', error: payload.error || `HTTP ${response.status}` };
  }
  return { reply: String(payload.reply ?? '') };
}

/** Stream tokens from cloud-server ``POST /v1/chat/completions`` (SSE). */
export async function streamCloudChatCompletion(
  messages: CloudChatMessage[],
  model: string,
  onToken: (token: string) => void,
): Promise<void> {
  const response = await fetch(cloudUrl('/v1/chat/completions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      detail = payload.error?.message || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Cloud chat stream unavailable (no response body)');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) {
        continue;
      }
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') {
        return;
      }
      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) {
          onToken(token);
        }
      } catch {
        /* ignore malformed SSE frames */
      }
    }
  }
}

export async function fetchCloudModels(): Promise<ModelInfo[]> {
  try {
    const response = await fetch(cloudUrl('/v1/models'));
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as { data?: ModelInfo[] };
    return Array.isArray(payload.data) ? payload.data : [];
  } catch {
    return [];
  }
}

export async function fetchCloudRuntimeStatus(): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(cloudUrl('/v1/runtime/status'));
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function openRuntimeWebSocket(
  onFrame: (frame: Record<string, unknown>) => void,
  onError?: (message: string) => void,
): () => void {
  const wsBase = API_BASE_URL.replace(/^http/, 'ws');
  const socket = new WebSocket(`${wsBase}/ws/runtime`);
  let closed = false;

  socket.onmessage = (event) => {
    try {
      const frame = JSON.parse(String(event.data)) as Record<string, unknown>;
      onFrame(frame);
    } catch {
      onError?.('Malformed runtime stream frame');
    }
  };

  socket.onerror = () => onError?.('Runtime WebSocket error');
  socket.onclose = () => {
    if (!closed) {
      onError?.('Runtime WebSocket closed');
    }
  };

  return () => {
    closed = true;
    socket.close();
  };
}
