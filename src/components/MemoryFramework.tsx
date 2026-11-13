import { useEffect, useState } from 'react';
import { apiUrl } from '../config/api';

type Status = { enabled: boolean; worker_running?: boolean; embedding_model?: string;
  queue?: { state: string; count: number }[]; errors?: { error: string; count: number }[];
  counts?: { projection: string; active: number; count: number }[]; error?: string };
type Hit = { id: string; content: string; citation: string; confidence: number; verification: string };

type LearningRequest = { id: string; spec_hash: string; state: string; expires: number;
  spec: { topic: string; justification: string; source_path: string; tools: string[];
    limits: { model_calls: number; max_tokens: number; source_chars: number; wall_seconds: number };
    expected_duration: string }; result?: { state?: string; model_calls?: number; truth_verified?: boolean } };

export default function MemoryFramework() {
  const [status, setStatus] = useState<Status>();
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [mode, setMode] = useState('');
  const [busy, setBusy] = useState(false);
  const [learning, setLearning] = useState<LearningRequest[]>([]);
  const [operatorNonce, setOperatorNonce] = useState('');
  const [learningReady, setLearningReady] = useState(false);
  const [learningError, setLearningError] = useState('');
  const [learningBusy, setLearningBusy] = useState(false);
  const refreshLearning = async (signal?: AbortSignal) => {
    try {
      const response = await fetch(apiUrl('/api/learning/proposals'), { signal });
      if (!response.ok) throw new Error('Learning approval service is unavailable');
      const body = await response.json(); setLearning(body.requests); setOperatorNonce(body.operator_nonce); setLearningReady(body.engine_ready === true); setLearningError('');
    } catch (e) { if (!signal?.aborted) setLearningError(e instanceof Error ? e.message : 'Learning requests unavailable'); }
  };
  const learningAction = async (item?: LearningRequest, decision?: 'approve_once' | 'deny' | 'cancel') => {
    setLearningBusy(true); setLearningError('');
    try {
      const response = await fetch(apiUrl(item ? `/api/learning/proposals/${encodeURIComponent(item.id)}/decision` : '/api/learning/proposals'), {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-niblit-operator-nonce': operatorNonce },
        body: JSON.stringify(item ? { spec_hash: item.spec_hash, decision } : {}),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || 'Learning request failed');
      await refreshLearning();
    } catch (e) { setLearningError(e instanceof Error ? e.message : 'Learning request failed'); }
    finally { setLearningBusy(false); }
  };
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
    void refresh(controller.signal); void refreshLearning(controller.signal);
    const timer = setInterval(() => { void refresh(controller.signal); void refreshLearning(controller.signal); }, 15000);
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
    <section aria-label="Learning approval requests" style={{ marginBottom: 24 }}>
      <div className="section-toolbar"><h2>Learning requests</h2><button disabled={learningBusy || !operatorNonce} onClick={() => void learningAction()}>Prepare a learning proposal</button></div>
      <p>Manual authorization: Niblit can propose research. Each session needs your approval. Background learning stays off at startup.</p>
      {!learningReady && <p role="status">Core learning components are initializing. You can prepare or deny proposals; execution waits for readiness.</p>}
      {learningError && <p role="alert">{learningError}</p>}
      {!learning.length && <p>No learning requests yet.</p>}
      {learning.map(item => <article key={item.id} className="panel" style={{ padding: 16, marginBottom: 12 }}>
        <h3>{item.spec.topic}</h3><p>{item.spec.justification}</p>
        <p>Read: <code>{item.spec.source_path}</code>. One local model call, up to {item.spec.limits.max_tokens} output tokens and {item.spec.limits.source_chars} source characters. Budget: {item.spec.limits.wall_seconds} seconds.</p>
        <p>{item.spec.expected_duration}. No paid calls, model-weight training or trading authority.</p>
        <details><summary>Requested tools and task identity</summary><p>{item.spec.tools.join(', ')}</p><p>Request {item.id} · scope {item.spec_hash.slice(0, 12)}</p></details>
        <p role="status">{item.state} · expires {new Date(item.expires * 1000).toLocaleTimeString()}</p>
        {item.state === 'pending' && <div className="toolbar-actions">
          <button disabled={learningBusy || !operatorNonce || !learningReady} onClick={() => void learningAction(item, 'approve_once')}>Approve once</button>
          <button disabled={learningBusy || !operatorNonce} onClick={() => void learningAction(item, 'deny')}>Deny</button>
        </div>}
        {['approved', 'running'].includes(item.state) && <button disabled={learningBusy || !operatorNonce} onClick={() => void learningAction(item, 'cancel')}>Cancel remaining learning work</button>}
        {item.result && <p>Result: {item.result.state || item.state}. Model calls: {item.result.model_calls ?? 0}. Generated claims {item.result.truth_verified ? 'reviewed' : 'remain unverified'}.</p>}
      </article>)}
    </section>
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
