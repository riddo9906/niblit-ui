import { API_BASE_URL, apiUrl } from '../config/api';
import { readPreferences } from '../lib/preferences';

export interface ChatResponse {
  reply: string;
  error?: string;
  document_sources?: Array<{ name: string; pages_selected: number[] }>;
  usage?: { input_tokens?: number; output_tokens?: number };
  estimated_cost_usd?: number | null;
}

export function responseText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['message', 'reply', 'text', 'content', 'summary']) {
      if (typeof record[key] === 'string') return record[key] as string;
    }
    return JSON.stringify(value);
  }
  return String(value);
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
    if (!response.ok) return false;
    const body = await response.json();
    return body.service === 'niblit';
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

export async function sendChat(text: string, signal?: AbortSignal, model?: string, attachmentIds: string[] = []): Promise<ChatResponse> {
  const response = await fetch(apiUrl('/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, ...(model ? { model, use_model: true } : {}), ...(attachmentIds.length ? { attachment_ids: attachmentIds } : {}) }),
    signal,
  });
  const payload = (await response.json()) as ChatResponse & { error?: string };
  if (!response.ok) {
    return { reply: '', error: responseText(payload.error) || `HTTP ${response.status}` };
  }
  return { reply: responseText(payload.reply), document_sources: payload.document_sources,
    usage: payload.usage, estimated_cost_usd: payload.estimated_cost_usd };
}

/** Stream tokens from cloud-server ``POST /v1/chat/completions`` (SSE). */
export async function streamInferenceChat(
  messages: CloudChatMessage[],
  model: string,
  onToken: (token: string) => void,
  signal?: AbortSignal,
  onModel?: (meta: {
    requested_model?: string | null;
    resolved_model?: string | null;
    executed_model?: string | null;
    fallback?: boolean | null;
    fallback_reason?: string | null;
    request_id?: string | null;
  }) => void,
): Promise<void> {
  const response = await fetch(apiUrl('/v1/inference/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: readPreferences().temperature,
      max_tokens: readPreferences().maxTokens,
    }),
    signal,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const payload = (await response.json()) as {
        error?: { code?: string; message?: string };
      };
      detail = payload.error?.message || payload.error?.code || detail;
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
  let receivedContent = false;

  while (true) {
    const { done, value } = await reader.read();
    buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = done ? '' : lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) {
        continue;
      }
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') {
        if (!receivedContent) throw new Error('The model finished without returning any text.');
        return;
      }
      let parsed: {
        choices?: Array<{ delta?: { content?: string } }>;
        niblit_model?: Record<string, unknown>;
        error?: unknown;
      };
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }
      if (parsed.error) {
        throw new Error(responseText(parsed.error) || 'The inference server reported a streaming error.');
      }
        if (parsed.niblit_model && onModel) {
          onModel({
            requested_model: parsed.niblit_model.requested_model as string | null,
            resolved_model: parsed.niblit_model.resolved_model as string | null,
            executed_model: parsed.niblit_model.executed_model as string | null,
            fallback: parsed.niblit_model.fallback as boolean | null,
            fallback_reason: parsed.niblit_model.fallback_reason as string | null,
            request_id: parsed.niblit_model.request_id as string | null,
          });
        }
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) {
          receivedContent = true;
          onToken(token);
        }
    }
    if (done) break;
  }
  if (!receivedContent) throw new Error('The inference connection closed without returning any text.');
}

export async function fetchInferenceModels(): Promise<ModelInfo[]> {
  try {
    const response = await fetch(apiUrl('/v1/inference/models'));
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
    const response = await fetch(apiUrl('/v1/inference/health'));
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
