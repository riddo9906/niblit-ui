import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRuntimeStore } from '../state/runtimeStore';
import { fetchRuntimeStatus, fetchCloudRuntimeStatus, type RuntimeStatus } from '../services/niblitApi';
import { StatusDot, statusKind } from '../components/ui/StatusDot';
import { SectionHeader, EmptyState } from '../components/ui/States';

function ServiceLine({
  label,
  meta,
  status,
  to,
}: {
  label: string;
  meta: string;
  status?: string;
  to?: string;
}) {
  const body = (
    <>
      <StatusDot status={status} />
      <span className="ov-service__name">{label}</span>
      <span className="ov-service__meta">{meta}</span>
      <span className="ov-service__state">{status ?? 'Unavailable'}</span>
    </>
  );
  return to ? (
    <Link to={to} className="ov-service ov-service--link">{body}</Link>
  ) : (
    <div className="ov-service">{body}</div>
  );
}

export default function OverviewPage() {
  const { events, layerStatus } = useRuntimeStore();
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [cloudAvailable, setCloudAvailable] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchRuntimeStatus().then((status) => {
      if (!cancelled) {
        if (status && Object.keys(status).length > 0) {
          setRuntime(status);
        }
        setChecked(true);
      }
    });
    void fetchCloudRuntimeStatus().then((cloudStatus) => {
      if (!cancelled) {
        setCloudAvailable(Boolean(cloudStatus));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const runtimeInfo = runtime?.runtime as
    | { active_provider?: string; runtime_mode?: string }
    | undefined;
  const recent = useMemo(() => events.slice(0, 8), [events]);
  const cloudState = cloudAvailable === null ? 'Checking…' : cloudAvailable ? 'Ready' : 'Unavailable';
  const coreKind = statusKind(layerStatus.cognitive);

  return (
    <div className="overview-page">
      <section className="ov-identity">
        <h1 className="ov-identity__title">Niblit</h1>
        <p className="ov-identity__sub">Local Autonomous Intelligence Operating System</p>
        <StatusDot
          status={layerStatus.cognitive}
          label={coreKind === 'ok' ? 'SYSTEM OPERATIONAL' : `SYSTEM ${String(layerStatus.cognitive || 'UNKNOWN').toUpperCase()}`}
          pulse={coreKind === 'ok'}
        />
      </section>

      <div className="ov-columns">
        <section className="ov-primary">
          <SectionHeader title="Primary Runtime" meta={runtime ? 'live' : checked ? 'unavailable' : 'checking'} />
          <dl className="ov-kv">
            <div className="ov-kv__row"><dt>Status</dt><dd>{String(runtime?.status ?? (checked ? 'unavailable' : 'checking'))}</dd></div>
            <div className="ov-kv__row"><dt>Provider</dt><dd><code>{String(runtimeInfo?.active_provider ?? 'unknown')}</code></dd></div>
            <div className="ov-kv__row"><dt>Mode</dt><dd><code>{String(runtimeInfo?.runtime_mode ?? 'unknown')}</code></dd></div>
            <div className="ov-kv__row"><dt>Core</dt><dd>{layerStatus.cognitive || 'Unavailable'}</dd></div>
          </dl>
          {!runtime && checked && (
            <EmptyState kind="unavailable" icon="×" title="Core API unreachable" hint="Start the Niblit Core service on port 5000." />
          )}
        </section>

        <section className="ov-systems">
          <SectionHeader title="Active Systems" />
          <ServiceLine label="Core" meta="Cognitive runtime · :5000" status={layerStatus.cognitive} to="/cognitive" />
          <ServiceLine label="Cloud" meta="Inference bridge · :8000" status={cloudState} to="/inference" />
          <ServiceLine label="Memory" meta="KnowledgeDB / vector store" status={undefined} to="/memory" />
          <ServiceLine label="Trading" meta="Governed runtime · :8100 · Observe" status={layerStatus.execution} to="/trading" />
          <ServiceLine label="Commands" meta="Core registry control surface" status="Ready" to="/commands" />
        </section>
      </div>

      <div className="ov-columns">
        <section className="ov-primary">
          <SectionHeader title="Recent Activity" meta={`${events.length} events`} />
          {recent.length === 0 ? (
            <EmptyState icon="○" title="No recent activity." hint="Runtime events will stream in here." />
          ) : (
            <ul className="activity-list">
              {recent.map((event) => (
                <li key={event.id} className="activity-item">
                  <span className="activity-item__type">{event.type}</span>
                  <span className="activity-item__time">{new Date(event.timestamp).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ov-systems">
          <SectionHeader title="Trading Governance" />
          <div className="ov-governance">
            <div className="ov-governance__mode">
              <StatusDot kind={statusKind(layerStatus.execution)} label="OBSERVE" />
            </div>
            <p className="ov-governance__note">
              Execution is disabled. Orders remain governed by DecisionValidator and RiskEngine.
              Observe is a governance state, not an error.
            </p>
            <Link to="/trading" className="ov-governance__link">Open trading runtime →</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
