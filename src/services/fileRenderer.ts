import { API_BASE_URL } from '../config/api';
import type { FileMetadata as FileMetadataType, RenderResult } from '../types/renderers';

export interface FileMetadata extends FileMetadataType {}

export async function getSupportedTypes(): Promise<Record<string, string[]>> {
  const response = await fetch(`${API_BASE_URL}/api/file/types`);
  const payload = (await response.json()) as { types: Record<string, string[]> };
  return payload.types;
}

export async function renderFile<T = unknown>(path: string): Promise<RenderResult<T>> {
  const response = await fetch(`${API_BASE_URL}/api/file/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  return (await response.json()) as RenderResult<T>;
}

export async function getFilePreview(path: string): Promise<{ metadata?: FileMetadata; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/file/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  const data = (await response.json()) as { metadata?: FileMetadata; error?: string };
  return data;
}