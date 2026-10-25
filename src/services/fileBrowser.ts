import { API_BASE_URL } from '../config/api';

export interface FileInfo {
  name: string;
  path: string;
  extension: string;
  size: number;
  is_dir: boolean;
  modified: string;
}

export async function listFiles(dirPath: string = '.'): Promise<FileInfo[]> {
  const response = await fetch(`${API_BASE_URL}/api/commands/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: 'workspace_list', arguments: { path: dirPath }, request_id: crypto.randomUUID() }),
  });
  const result = await response.json();
  if (!response.ok || result.status !== 'success' || result.result?.error) throw new Error(result.error || result.result?.error || 'Workspace listing failed');
  return (result.result?.entries || []).map((entry: Record<string, unknown>) => ({
    name: String(entry.name), path: String(entry.path), extension: String(entry.extension || ''),
    size: Number(entry.size || 0), is_dir: entry.type === 'dir', modified: String(entry.modified_at || ''),
  }));
}

export async function resolveWorkspaceFile(path: string): Promise<string> {
  const relative = path.replace(/\\/g, '/');
  if (relative.startsWith('/') || /^[A-Za-z]:/.test(relative) || relative.split('/').includes('..')) throw new Error('Choose a file inside the configured workspace.');
  const response = await fetch(`${API_BASE_URL}/api/desktop/settings`);
  const configuration = await response.json();
  const root = configuration.runtime_configuration?.workspace_root;
  if (!response.ok || typeof root !== 'string' || !root) throw new Error('Core did not report its workspace root.');
  return `${root.replace(/\\/g, '/').replace(/\/$/, '')}/${relative}`;
}

export async function getFileContent(path: string): Promise<string> {
  path = await resolveWorkspaceFile(path);
  const response = await fetch(`${API_BASE_URL}/api/file/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  const result = (await response.json()) as { success?: boolean; content?: string; error?: string };
  if (result.error) {
    throw new Error(result.error);
  }
  return result.content || '';
}
