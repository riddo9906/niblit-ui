import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '../config/api';
import { usePreferences } from '../lib/preferences';

export function SnapshotValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="muted">Not reported</span>;
  if (typeof value !== 'object') return <span>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</span>;
  const entries = Array.isArray(value) ? value.map((v, i) => [String(i + 1), v] as const) : Object.entries(value);
  if (!entries.length) return <span className="muted">No records reported</span>;
  return <dl className="snapshot-list">{entries.slice(0, 100).map(([key, item]) => <div key={key}>
    <dt>{key.replace(/_/g, ' ')}</dt><dd>{item && typeof item === 'object'
      ? <details><summary>Inspect {Array.isArray(item) ? `${item.length} items` : 'details'}</summary><SnapshotValue value={item} /></details>
      : <SnapshotValue value={item} />}</dd>
  </div>)}</dl>;
}

export default function SubsystemPanel({ section, title, queryable = false, compact = false }: {
  section: string; title: string; queryable?: boolean; compact?: boolean;
}) {
  const prefs = usePreferences();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [filter, setFilter] = useState('');
  const [paused, setPaused] = useState(false);
  const [raw, setRaw] = useState(prefs.showRaw);
  const [notice, setNotice] = useState('');
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl(`/api/desktop/${section}?limit=30&query=${encodeURIComponent(submitted)}`), { signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `Core returned ${response.status}`);
      if (!signal?.aborted) { setData(payload); setError(''); }
    } catch (e) {
      if (!signal?.aborted) setError(e instanceof Error ? e.message : 'Core did not respond');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [section, submitted]);
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const timer = prefs.liveUpdates && !paused ? window.setInterval(() => void refresh(controller.signal), prefs.refreshSeconds * 1000) : null;
    return () => { controller.abort(); if (timer) clearInterval(timer); };
  }, [refresh, prefs.refreshSeconds, prefs.liveUpdates, paused]);
  const entries = Object.entries(data || {}).filter(([key, value]) => !['section', 'checked_at'].includes(key)
    && (!filter || `${key} ${JSON.stringify(value)}`.toLowerCase().includes(filter.toLowerCase())));
  return <section className={`panel subsystem-panel ${compact ? 'subsystem-panel--compact' : ''}`}>
    <div className="section-toolbar"><div><h2>{title}</h2><small>{data?.checked_at ? `Checked ${new Date(String(data.checked_at)).toLocaleTimeString()}` : 'Waiting for Core'}</small></div>
      <div className="toolbar-actions"><button onClick={() => void refresh()} disabled={loading}>{loading ? 'Checking…' : 'Refresh'}</button>
        <button onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? 'Resume updates' : 'Pause updates'}</button></div></div>
    {!compact && <div className="toolbar-actions"><input aria-label="Filter diagnostic fields" placeholder="Filter details…" value={filter} onChange={e => setFilter(e.target.value)} />
      <button onClick={() => setRaw(!raw)} aria-pressed={raw}>Raw details</button>
      <button disabled={!data} onClick={() => { void navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => setNotice('Snapshot copied'), () => setNotice('Clipboard unavailable')); }}>Copy snapshot</button>
      <Link to="/commands">Open commands</Link></div>}
    {queryable && <form className="toolbar-actions" onSubmit={e => { e.preventDefault(); setSubmitted(query); }}>
      <input aria-label="Search stored memory" placeholder="Find a fact, topic, or interaction…" value={query} onChange={e => setQuery(e.target.value)} /><button type="submit">Search memory</button>
      {submitted && <button type="button" onClick={() => { setQuery(''); setSubmitted(''); }}>Clear search</button>}</form>}
    {error && <p className="error" role="alert">{error}{data ? ' — previously checked data is shown below.' : ''}</p>}
    {notice && <p role="status">{notice}</p>}
    {raw ? <pre className="snapshot-raw">{JSON.stringify(data, null, 2)}</pre>
      : <div className="snapshot-grid">{entries.map(([key, value]) => <article key={key}><h3>{key.replace(/_/g, ' ')}</h3><SnapshotValue value={value} /></article>)}</div>}
    {!data && !loading && !error && <p>No runtime data reported.</p>}
  </section>;
}
