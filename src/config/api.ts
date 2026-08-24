const trimSlash = (value: string) => value.replace(/\/+$/, '');

export const API_BASE_URL = trimSlash(
  import.meta.env.VITE_NIBLIT_API_URL || 'http://127.0.0.1:5000',
);

/** CLOUD_BASE_URL is always a SERVER ROOT (no /v1 suffix). An OpenAI-style
 * base ending in "/v1" previously produced GET /v1/v1/models -> 404; strip
 * trailing /v1 segments so every cloudUrl() composes exactly one /v1. */
const normalizeCloudRoot = (value: string) => {
  let root = trimSlash(value);
  while (/\/v1$/i.test(root)) {
    root = root.slice(0, -3);
  }
  return root;
};

export const CLOUD_BASE_URL = normalizeCloudRoot(
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
