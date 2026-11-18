import { afterEach, beforeEach, expect, it, vi } from 'vitest';
beforeEach(() => { const values = new Map<string, string>(); vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), clear: () => values.clear() }); vi.stubGlobal('window', new EventTarget()); vi.resetModules(); });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); localStorage.clear(); vi.unstubAllGlobals(); });
it('preserves legacy presentation settings without inheriting its Core connection', async () => {
  vi.stubEnv('VITE_NIBLIT_RELEASE_PROFILE', 'desktop-v2-acceptance');
  vi.stubEnv('VITE_NIBLIT_API_URL', 'http://127.0.0.1:5100');
  const legacy = JSON.stringify({ coreUrl: 'http://127.0.0.1:5000', theme: 'light' });
  localStorage.setItem('niblit.preferences.v1', legacy);
  const preferences = await import('../lib/preferences');
  expect(preferences.readPreferences().coreUrl).toBe('http://127.0.0.1:5100');
  expect(preferences.readPreferences().theme).toBe('light');
  preferences.savePreferences(preferences.readPreferences());
  expect(localStorage.getItem('niblit.preferences.v1')).toBe(legacy);
  expect(localStorage.getItem('niblit.preferences.v1:desktop-v2-acceptance')).not.toBeNull();
});
it('retains the existing preferences key when no release profile is selected', async () => {
  vi.stubEnv('VITE_NIBLIT_RELEASE_PROFILE', '');
  localStorage.setItem('niblit.preferences.v1', JSON.stringify({ coreUrl: 'http://127.0.0.1:5000', theme: 'light' }));
  const preferences = await import('../lib/preferences');
  expect(preferences.readPreferences().theme).toBe('light');
});

