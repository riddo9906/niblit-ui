import { useMemo } from 'react';
import { useEventBus } from '../lib/eventBus';
import { useRuntimeStore } from '../state/runtimeStore';

export default function InferencePage() {
  const { events } = useEventBus();
  const { layerStatus } = useRuntimeStore();

  const recent = useMemo(() => events.filter((event) => event.source === 'inference' || event.type.includes('inference')), [events]);
  const status = layerStatus.inference || 'Unavailable';

  return (
    <div className="grid">
      <section className="panel">
        <h2>Inference layer</h2>
        <div className="metric"><span>Model route</span><strong>{status}</strong></div>
        <div className="metric"><span>Latency</span><strong>{status === 'Unavailable' ? 'Unavailable' : 'From runtime'}</strong></div>
        <div className="metric"><span>Request dedupe</span><strong>Enabled</strong></div>
      </section>
      <section className="panel">
        <h3>Inference activity</h3>
        {recent.length === 0 ? (
          <p className="chat-empty">No inference events yet. Events appear once the runtime streams them.</p>
        ) : (
          <ul className="list">
            {recent.map((event) => (
              <li key={event.id}>{event.type} • {new Date(event.timestamp).toLocaleTimeString()}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
