import { invoke, isTauri } from '@tauri-apps/api/core';

export interface DesktopBinding { core_url: string; cloud_url: string; core_pid: number; instance: string; release: string }
let binding: DesktopBinding | undefined;
export function desktopBinding() { return binding; }
function localOrigin(value: string): string {
  const u = new URL(value);
  if (u.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname)
      || u.username || u.password || u.search || u.hash || u.pathname !== '/') throw Error('Invalid local runtime binding');
  return u.origin;
}
export function installDesktopBinding(value: DesktopBinding) {
  if (!Number.isInteger(value.core_pid) || value.core_pid <= 0 || !/^[a-f0-9]{32}$/.test(value.instance) || !value.release) {
    throw Error('Missing owning Core identity');
  }
  binding = Object.freeze({ ...value, core_url: localOrigin(value.core_url), cloud_url: localOrigin(value.cloud_url) });
  const expected = binding;
  const rawFetch = window.fetch.bind(window);
  let verifiedAt = 0;
  let verifying: Promise<void> | undefined;
  async function verify() {
    if (Date.now() - verifiedAt < 2000) return;
    if (!verifying) verifying = (async () => {
      const r = await rawFetch(expected.core_url + '/health', { signal: AbortSignal.timeout(5000), cache: 'no-store' });
      if (!r.ok) throw Error(`Owning Core health HTTP ${r.status}`);
      const h = await r.json();
      if (h.service !== 'niblit' || !h.core_bound || h.process_id !== expected.core_pid || h.desktop_instance !== expected.instance) {
        throw Error('Core identity mismatch: refusing another process or release. Relaunch through the owning Niblit shortcut.');
      }
      verifiedAt = Date.now();
    })().finally(() => { verifying = undefined; });
    return verifying;
  }
  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    if (![expected.core_url, expected.cloud_url].includes(url.origin)) return rawFetch(input, init);
    try {
      await verify();
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      if (url.origin === expected.core_url) headers.set('X-Niblit-Desktop-Instance', expected.instance);
      const response = await rawFetch(input, { ...init, headers });
      if (response.status === 409) verifiedAt = 0;
      return response;
    } catch (error) {
      verifiedAt = 0;
      window.dispatchEvent(new CustomEvent('niblit-connection-error', { detail: String(error) }));
      throw error;
    }
  };
}
export async function initializeDesktopBinding() {
  if (isTauri()) installDesktopBinding(JSON.parse(await invoke<string>('desktop_binding')));
}
