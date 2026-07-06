import { API_BASE_URL, apiUrl, cloudUrl } from '../config/api';

export interface ChatResponse {
  reply: string;
  error?: string;
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
