import { useEffect, useState } from 'react';
import { apiUrl } from '../config/api';

type Run = { id: string; tool: string; status: string; started_at: string; request: unknown; result: unknown; events: { sequence: number; at: string; kind: string; detail: unknown }[] };

export default function LiveToolView() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [kind, setKind] = useState('workspace');
  const [target, setTarget] = useState('.');
  const [purpose, setPurpose] = useState('Inspect this environment and report evidence.');
  const [file, setFile] = useState(false);
  const [guidance, setGuidance] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState('');
  const [session, setSession] = useState('');
  async function request(path: string, body?: unknown) {
    const response = await fetch(apiUrl(path), body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Tool service unavailable');
    return data;
  }
  useEffect(() => {
    let active = true;
    async function refresh() {
      try { const data = await request('/api/tools/runs'); if (active) setRuns(data.runs); }
      catch { /* Older backends expose availability when an action is attempted. */ }
    }
    void refresh(); const timer = window.setInterval(() => void refresh(), 1500);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  const current = runs.find(run => run.id === selected) ?? runs[0];
  async function act(path: string, body: unknown) {
    setBusy(true); setError('');
    try { const data = await request(path, body); if (data.id) setSelected(data.id); const list = await request('/api/tools/runs'); setRuns(list.runs); }
    catch (err) { setError(err instanceof Error ? err.message : 'Tool request failed'); }
    finally { setBusy(false); }
  }
  return <section className="panel" aria-label="Live tool workspace" style={{ padding: 16, marginBottom: 20 }}>
    <h2>Live tool workspace</h2>
    <p>Watch actual actions and evidence. Website inspection reads public pages; workspace inspection uses Niblit’s file rules. Native desktop control is not connected.</p>
    <details><summary>Connect a saved OpenAI agent session</summary><p>Niblit Steward is a separate API agent. Enter an existing session ID to handle up to two pending environment observations. Results and guidance appear below. Returning results lets that paid session continue; this does not start a new session or enable background polling.</p><input aria-label="OpenAI agent session ID" value={session} onChange={e => setSession(e.target.value)} maxLength={160} /><button disabled={busy || !/^[A-Za-z0-9_-]{1,160}$/.test(session)} onClick={() => void act(`/api/steward/sessions/${encodeURIComponent(session)}/handle-pending`, {})}>Handle pending tool calls</button></details>
    <div className="toolbar-actions">
      <select aria-label="Environment type" value={kind} onChange={e => { setKind(e.target.value); setTarget(e.target.value === 'website' ? 'https://example.com' : '.'); }}><option value="workspace">Workspace</option><option value="website">Website</option></select>
      <input aria-label="Environment target" value={target} onChange={e => setTarget(e.target.value)} placeholder="Relative path or public URL" />
      {kind === 'workspace' && <label><input type="checkbox" checked={file} onChange={e => setFile(e.target.checked)} />Read a file</label>}
      <input aria-label="Purpose of observation" value={purpose} onChange={e => setPurpose(e.target.value)} maxLength={2000} />
      <button disabled={busy} onClick={() => void act('/api/tools/runs', { environment_type: kind, action: 'explore', environment_details: { name: target, url: target, additional_context: purpose, object_id: file && kind === 'workspace' ? 'file' : '' } })}>Inspect</button>
    </div>
    {error && <p role="alert">{error}</p>}
    <select aria-label="Tool run" value={current?.id ?? ''} onChange={e => setSelected(e.target.value)}>{runs.length ? runs.map(run => <option key={run.id} value={run.id}>{run.started_at} · {run.status} · {run.id.slice(0, 8)}</option>) : <option value="">No observations yet</option>}</select>
    {current && <>
      <p role="status">{current.tool} · {current.status} · refreshed every 1.5 seconds</p>
      <details><summary>Request and scope</summary><pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(current.request, null, 2)}</pre></details>
      <div aria-label="Tool activity" role="log" style={{ maxHeight: 340, overflow: 'auto' }}>{current.events.map((event, index) => <details key={`${event.sequence}-${index}`} open={event.kind !== 'action.result'}><summary>{event.at} · {event.kind}</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{typeof event.detail === 'string' ? event.detail : JSON.stringify(event.detail, null, 2)}</pre></details>)}</div>
      <div className="toolbar-actions">
        <button disabled={busy || !['queued', 'running'].includes(current.status)} onClick={() => void act(`/api/tools/runs/${current.id}/control`, { action: 'stop' })}>Stop at next boundary</button>
        <input aria-label="Guidance to supervising agent" maxLength={2000} value={guidance} onChange={e => setGuidance(e.target.value)} placeholder="Guide the agent; do not include secrets" />
        <button disabled={busy || !guidance.trim()} onClick={() => void act(`/api/tools/runs/${current.id}/control`, { action: 'guidance', message: guidance })}>Send guidance</button>
        <button disabled={busy} onClick={() => void act(`/api/tools/runs/${current.id}/review`, {})}>Ask Steward to review (uses API)</button>
      </div>
      <p>Guidance and the run summary are shared with Steward when you request a review. Full file/page contents stay local. Stop cannot interrupt an in-flight read, which has a time limit. Last 40 runs are retained until Core restarts.</p>
    </>}
  </section>;
}
