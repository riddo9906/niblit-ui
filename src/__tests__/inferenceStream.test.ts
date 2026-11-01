import {afterEach, describe, expect, it, vi} from 'vitest';
import {streamInferenceChat} from '../services/niblitApi';

afterEach(() => vi.unstubAllGlobals());
function respond(chunks: string[]) {
  const encoder = new TextEncoder();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream({
    start(controller) { chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk))); controller.close(); },
  }), {headers: {'Content-Type': 'text/event-stream'}})));
}

describe('inference SSE transport', () => {
  it('renders the final frame even without a trailing newline', async () => {
    respond(['data: {"choices":[{"delta":{"content":"READY"}}]}']);
    const tokens: string[] = [];
    await streamInferenceChat([{role:'user',content:'hello'}], 'local', t => tokens.push(t));
    expect(tokens.join('')).toBe('READY');
  });
  it('preserves tokens split across network chunks', async () => {
    respond(['data: {"choices":[{"delta":{"con', 'tent":"READY"}}]}\n\ndata: [DONE]\n\n']);
    const tokens: string[] = [];
    await streamInferenceChat([], 'local', t => tokens.push(t));
    expect(tokens.join('')).toBe('READY');
  });
  it('shows a structured upstream error instead of a blank response', async () => {
    respond(['data: {"error":{"message":"model allocation failed"}}\n\n']);
    await expect(streamInferenceChat([], 'local', () => {})).rejects.toThrow('model allocation failed');
  });
  it('rejects a completed stream with no answer', async () => {
    respond(['data: [DONE]\n\n']);
    await expect(streamInferenceChat([], 'local', () => {})).rejects.toThrow('without returning any text');
  });
});
