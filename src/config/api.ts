const trimSlash = (value: string) => value.replace(/\/+$/, '');

export const API_BASE_URL = trimSlash(
  import.meta.env.VITE_NIBLIT_API_URL || 'http://127.0.0.1:8080',
);

export const CLOUD_BASE_URL = trimSlash(
  import.meta.env.VITE_NIBLIT_CLOUD_URL || 'http://127.0.0.1:8000',
);

export const USE_DEMO_CONNECTOR = import.meta.env.VITE_NIBLIT_USE_DEMO === '1';

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

export function cloudUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${CLOUD_BASE_URL}${normalized}`;
}
