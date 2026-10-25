import { useState } from 'react';
import { API_BASE_URL } from '../config/api';
import { defaultPreferences, readPreferences, savePreferences, validateCoreUrl, type Preferences } from '../lib/preferences';
import SubsystemPanel from '../components/SubsystemPanel';

export default function SettingsPage() {
  const [draft, setDraft] = useState(readPreferences);
  const [message, setMessage] = useState('');
  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => setDraft(p => ({ ...p, [key]: value }));
  const toggle = (key: 'liveUpdates' | 'reduceMotion' | 'showRaw' | 'confirmActions' | 'sendOnEnter', label: string) =>
    <label className="setting-toggle"><input type="checkbox" checked={draft[key]} onChange={e => set(key, e.target.checked)} />{label}</label>;
  return <div className="settings-page"><h1>Settings</h1><p>Preferences stay on this device. Backend readiness and permissions still come from Core.</p>
    <form onSubmit={e => { e.preventDefault(); try { const next = savePreferences(draft); setDraft(next); setMessage('Settings saved'); if (next.coreUrl !== API_BASE_URL) window.location.reload(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save preferences'); } }}>
      <div className="settings-grid"><fieldset><legend>Appearance</legend>
        <label>Theme<select value={draft.theme} onChange={e => set('theme', e.target.value as Preferences['theme'])}><option value="dark">Dark</option><option value="light">Light</option></select></label>
        <label>Density<select value={draft.density} onChange={e => set('density', e.target.value as Preferences['density'])}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label>
        <label>Interface scale: {draft.textScale}%<input type="range" min="85" max="125" step="5" value={draft.textScale} onChange={e => set('textScale', Number(e.target.value))} /></label>
        {toggle('reduceMotion', 'Reduce animations')}{toggle('showRaw', 'Open raw diagnostics by default')}
      </fieldset><fieldset><legend>Live runtime views</legend>
        {toggle('liveUpdates', 'Automatically update runtime views')}
        <label>Refresh interval (seconds)<input type="number" min="5" max="120" value={draft.refreshSeconds} onChange={e => set('refreshSeconds', Number(e.target.value))} /></label>
        <label>Recent activity limit<input type="number" min="20" max="1000" value={draft.eventLimit} onChange={e => set('eventLimit', Number(e.target.value))} /></label>
        <label>Core address<input required type="url" value={draft.coreUrl} onChange={e => set('coreUrl', e.target.value)} /></label>
        <button type="button" onClick={() => { void (async () => { try { setMessage('Testing Core connection…'); const response = await fetch(`${validateCoreUrl(draft.coreUrl)}/health`, { signal: AbortSignal.timeout(5000) }); const body = await response.json(); setMessage(response.ok && body.service === 'niblit' ? 'Connected to Niblit Core. Save to use this address.' : 'This address is not the Niblit Core API. Use the Core port, normally 5000.'); } catch { setMessage('Core is unreachable from this window. Check the address, startup log, and desktop-origin permissions.'); } })(); }}>Test connection</button>
        <small>Changing the address reconnects the interface. Cloud and Lean remain behind Core.</small>
      </fieldset><fieldset><legend>Conversation and model</legend>
        <label>Preferred model ID<input placeholder="Use runtime default" value={draft.defaultModel} onChange={e => set('defaultModel', e.target.value)} /></label>
        <label>Temperature<input type="number" min="0" max="2" step="0.1" value={draft.temperature} onChange={e => set('temperature', Number(e.target.value))} /></label>
        <label>Maximum response tokens<input type="number" min="32" max="4096" value={draft.maxTokens} onChange={e => set('maxTokens', Number(e.target.value))} /></label>
        {toggle('sendOnEnter', 'Enter sends a message; Shift+Enter adds a line')}
        <small>Generation preferences apply to model chat. Runtime chat follows Core policy.</small>
      </fieldset><fieldset><legend>Actions and permissions</legend>
        {toggle('confirmActions', 'Confirm commands that can change state')}
        <p>Confirmation does not grant backend authorization. Trading stays under Lean validation and Core policy.</p>
        <p>Credentials are not stored in these preferences. Workspace, memory location, and service ports are reported below.</p>
      </fieldset></div>
      <div className="toolbar-actions"><button type="submit">Save settings</button><button type="button" onClick={() => { setDraft({ ...defaultPreferences }); setMessage('Defaults selected. Save to apply.'); }}>Restore defaults</button><span role="status">{message}</span></div>
    </form><SubsystemPanel section="settings" title="Active runtime configuration" /></div>;
}
