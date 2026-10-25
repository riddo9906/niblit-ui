import { useEffect, useState } from 'react';

export interface Preferences {
  coreUrl: string; theme: 'dark' | 'light'; density: 'comfortable' | 'compact';
  textScale: number; reduceMotion: boolean; liveUpdates: boolean; refreshSeconds: number;
  eventLimit: number; showRaw: boolean; confirmActions: boolean; sendOnEnter: boolean;
  defaultModel: string; temperature: number; maxTokens: number;
}
export const defaultPreferences: Preferences = {
  coreUrl: import.meta.env.VITE_NIBLIT_API_URL || 'http://127.0.0.1:5000',
  theme: 'dark', density: 'comfortable', textScale: 100, reduceMotion: false,
  liveUpdates: true, refreshSeconds: 10, eventLimit: 200, showRaw: false,
  confirmActions: true, sendOnEnter: true, defaultModel: '', temperature: 0.2, maxTokens: 512,
};
const KEY = 'niblit.preferences.v1';
const clamp = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
export function validateCoreUrl(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      || url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
    throw new Error('Use a local Core address such as http://127.0.0.1:5000, without a path or credentials.');
  }
  return url.origin;
}
export function normalizePreferences(value: Partial<Preferences>): Preferences {
  const p = { ...defaultPreferences, ...value };
  p.coreUrl = validateCoreUrl(p.coreUrl);
  p.theme = value.theme === 'light' ? 'light' : 'dark';
  p.density = value.density === 'compact' ? 'compact' : 'comfortable';
  p.textScale = clamp(value.textScale, 100, 85, 125);
  p.refreshSeconds = Math.round(clamp(value.refreshSeconds, 10, 5, 120));
  p.eventLimit = Math.round(clamp(value.eventLimit, 200, 20, 1000));
  p.temperature = clamp(value.temperature, 0.2, 0, 2);
  p.maxTokens = Math.round(clamp(value.maxTokens, 512, 32, 4096));
  for (const key of ['reduceMotion', 'liveUpdates', 'showRaw', 'confirmActions', 'sendOnEnter'] as const) {
    p[key] = typeof value[key] === 'boolean' ? value[key] : defaultPreferences[key];
  }
  p.defaultModel = typeof value.defaultModel === 'string' ? value.defaultModel.slice(0, 200) : '';
  return p;
}
export function readPreferences(): Preferences {
  try { return normalizePreferences(JSON.parse(localStorage.getItem(KEY) || '{}')); }
  catch { return { ...defaultPreferences }; }
}
export function savePreferences(value: Partial<Preferences>) {
  const p = normalizePreferences(value);
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new Event('niblit-preferences'));
  return p;
}
export function usePreferences() {
  const [preferences, setPreferences] = useState(readPreferences);
  useEffect(() => {
    const update = () => setPreferences(readPreferences());
    window.addEventListener('niblit-preferences', update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener('niblit-preferences', update); window.removeEventListener('storage', update); };
  }, []);
  return preferences;
}
