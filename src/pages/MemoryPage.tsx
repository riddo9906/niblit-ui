import { useEffect, useState } from 'react';
import { fetchRuntimeStatus, type RuntimeStatus } from '../services/niblitApi';
import { SectionHeader, EmptyState } from '../components/ui/States';

/**
 * Memory — first-class subsystem view.
 * Only reports values the Core API actually exposes (facts_count via
 * /api/status). Anything else is explicitly marked unavailable rather than
 * fabricated.
 */
export default function MemoryPage() {
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchRuntimeStatus().then((status) => {
      if (!cancelled) {
        setRuntime(status && Object.keys(status).length > 0 ? status : null);
        setChecked(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const factsCount = typeof runtime?.facts_count === 'number' ? runtime.facts_count : null;
  const personality = typeof runtime?.personality === 'string' ? runtime.personality : null;

  return (
    <div className="memory-page">
      <SectionHeader title="Memory System" meta={runtime ? 'connected' : checked ? 'unavailable' : 'checking'} />
      <div className="ov-columns">
        <section>
          <SectionHeader title="Connection" />
          {runtime ? (
            <dl className="ov-kv">
              <div className="ov-kv__row"><dt>Backend</dt><dd><code>KnowledgeDB</code></dd></div>
              <div className="ov-kv__row"><dt>Core link</dt><dd>Connected · :5000</dd></div>
              <div className="ov-kv__row"><dt>Facts stored</dt><dd>{factsCount ?? 'Unavailable from current runtime API'}</dd></div>
              <div className="ov-kv__row"><dt>Personality</dt><dd>{personality ?? '—'}</dd></div>
            </dl>
          ) : (
            <EmptyState
              kind={checked ? 'unavailable' : 'loading'}
              icon={checked ? '×' : '◌'}
              title={checked ? 'Memory diagnostics unavailable' : 'Retrieving memory state…'}
              hint={checked ? 'Core API did not report memory information.' : undefined}
            />
          )}
        </section>

        <section>
          <SectionHeader title="Collections & Retrieval" />
          <EmptyState
            kind="unavailable"
            icon="○"
            title="Vector collection statistics unavailable from current runtime API"
            hint="Run “knowledge stats” in Commands for live KnowledgeDB figures."
          />
          <SectionHeader title="Recent Memory Activity" />
          <EmptyState icon="○" title="No recent memory events." />
        </section>
      </div>
    </div>
  );
}
