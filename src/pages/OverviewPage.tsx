import { useEffect, useMemo, useState } from 'react';
import { useEventBus, type BaseEvent, createRuntimeEvent } from '../lib/eventBus';
import { useRuntimeStore } from '../state/runtimeStore';
import { fetchRuntimeStatus, fetchCloudRuntimeStatus } from '../services/niblitApi';

export default function OverviewPage() {
  const { events, pushEvent } = useEventBus();
  const { layerStatus } = useRuntimeStore();
  const [tick, setTick] = useState(0);
  const [cloudAvailable, setCloudAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    void fetchRuntimeStatus().then((status) => {
      if (status && Object.keys(status).length > 0) {
        pushEvent(
          createRuntimeEvent({
            type: 'runtime.status',
            source: 'system',
            payload: { runtime: status },
          })
        );
      }
    });
    void fetchCloudRuntimeStatus().then((cloudStatus) => {
      setCloudAvailable(Boolean(cloudStatus));
      if (cloudStatus) {
        pushEvent(
          createRuntimeEvent({
            type: 'cloud.status',
            source: 'system',
            payload: { cloud: cloudStatus },
          })
        );
      }
    });
    const id = window.setInterval(() => {
      setTick((value) => value + 1);
      pushEvent({
        id: `evt-${Date.now()}`,
        type: 'system.heartbeat',
        source: 'system',
        timestamp: Date.now(),
        payload: { tick },
      });
    }, 3000);
    return () => window.clearInterval(id);
  }, [pushEvent]);

  const recent = useMemo(() => events.slice(0, 8), [events]);
  const coreStatus = layerStatus.cognitive || 'Unavailable';
  const cloudStatus = cloudAvailable === null ? 'Checking…' : cloudAvailable ? 'Ready' : 'Unavailable';
  const executionStatus = layerStatus.execution || 'Unavailable';

  return (
    <div className="content">
      <section className="hero">
        <div className="panel">
          <h2>Niblit — Local Autonomous Intelligence Runtime</h2>
          <p className="text-muted-foreground">
            Your local AI operating system — 100% offline-first, with cloud bridging
            when available.
          </p>
        </div>
      </section>

      {/* Runtime Overview */}
      <section className="panel" style={{ marginTop: '-16px' }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {/* CORE */}
          <div className="panel">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">CORE</h3>
            <div className="flex items-center gap-2">
              <span className="runtime-dot runtime-dot--idle" />
              <span className="text-xs text-foreground">{coreStatus}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Cognitive core</p>
          </div>

          {/* CLOUD */}
          <div className="panel">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">CLOUD</h3>
            <div className="flex items-center gap-2">
              <span className="runtime-dot" />
              <span className="text-xs text-foreground">{cloudStatus}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Cloud runtime (:8000)</p>
          </div>

          {/* MEMORY */}
          <div className="panel">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">MEMORY</h3>
            <div className="flex items-center gap-2">
              <span className="runtime-dot runtime-dot--idle" />
              <span className="text-xs text-foreground">Qdrant</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Vector store</p>
          </div>

          {/* TRADING */}
          <div className="panel">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">TRADING</h3>
            <div className="flex items-center gap-2">
              <span className="runtime-dot" />
              <span className="text-xs text-foreground">{executionStatus}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Runtime (:8100)</p>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="panel" style={{ marginTop: '16px' }}>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Recent Activity</h3>
        <div className="status-pill text-xs mb-2">Live event loop • {recent.length} recent events</div>
        <ul className="text-xs text-muted-foreground">
          {recent.map((event: BaseEvent) => (
            <li key={event.id}>{event.type} • {new Date(event.timestamp).toLocaleTimeString()}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
