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
  const response = await fetch(`${API_BASE_URL}/api/files/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: dirPath }),
  });
  const result = (await response.json()) as { files: FileInfo[]; error?: string };
  if (result.error) {
    throw new Error(result.error);
  }
  return result.files;
}

export async function getFileContent(path: string): Promise<string> {
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
