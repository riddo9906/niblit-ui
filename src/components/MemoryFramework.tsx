import { useEffect, useState } from 'react';
import { apiUrl } from '../config/api';

type Status = { enabled: boolean; worker_running?: boolean; embedding_model?: string;
  queue?: { state: string; count: number }[]; errors?: { error: string; count: number }[];
  counts?: { projection: string; active: number; count: number }[]; error?: string };
type Hit = { id: string; content: string; citation: string; confidence: number; verification: string };

export default function MemoryFramework() {
  const [status, setStatus] = useState<Status>();
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [mode, setMode] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = async (signal?: AbortSignal) => {
    try {
      const response = await fetch(apiUrl('/api/memory/framework'), { signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Memory service unavailable');
      setStatus(body); setError('');
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : 'Memory service unavailable'); }
  };
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const timer = setInterval(() => void refresh(controller.signal), 15000);
    return () => { controller.abort(); clearInterval(timer); };
  }, []);
  const search = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch(apiUrl('/api/memory/search'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 5 }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Memory search failed');
      setHits(body.results); setMode(body.mode);
    } catch (e) { setError(e instanceof Error ? e.message : 'Memory search failed'); }
    finally { setBusy(false); }
  };
  const active = status?.counts?.filter(c => c.active).reduce((sum,c) => sum+c.count, 0) ?? 0;
  const pending = status?.queue?.filter(c => ['pending','processing'].includes(c.state)).reduce((sum,c) => sum+c.count, 0) ?? 0;
  return <section className="panel subsystem-panel">
    <div className="section-toolbar"><h2>Evidence memory</h2><button onClick={() => void refresh()}>Refresh</button></div>
    <p>{status?.enabled ? `${active} indexed passages · ${pending} queued · ${status.worker_running ? 'Worker active' : 'Worker stopped'}` : 'Waiting for the Qdrant memory framework'}</p>
    {status?.embedding_model && <p className="muted">Local embeddings: {status.embedding_model}. Imported claims remain unverified until reviewed.</p>}
    {!!status?.errors?.length && <p role="status">Some records are awaiting retry. Original evidence is retained.</p>}
    <form className="toolbar-actions" onSubmit={e => { e.preventDefault(); void search(); }}>
      <input aria-label="Search evidence memory" placeholder="Find knowledge with source citations…" value={query} onChange={e => setQuery(e.target.value)} />
      <button disabled={busy || !query.trim() || !status?.enabled}>{busy ? 'Searching…' : 'Search evidence'}</button>
    </form>
    {error && <p className="error" role="alert">{error}</p>}
    {mode && <p className="muted">{mode === 'hybrid' ? 'Semantic and text search' : 'Text search · vector service unavailable'}</p>}
    <div className="memory-evidence-list">{hits.map(hit => <article key={hit.id}>
      <p>{hit.content}</p><small>{hit.verification} · source confidence {Math.round(hit.confidence*100)}%</small>
      <p className="memory-citation">{hit.citation}</p>
    </article>)}</div>
    {mode && !hits.length && <p>No matching evidence found.</p>}
  </section>;
}
