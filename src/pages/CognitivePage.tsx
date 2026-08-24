import { useMemo } from 'react';
import { useEventBus } from '../lib/eventBus';
import { useRuntimeStore } from '../state/runtimeStore';

export default function CognitivePage() {
  const { events } = useEventBus();
  const { layerStatus } = useRuntimeStore();

  const recent = useMemo(() => events.filter((event) => event.source === 'cognitive' || event.type.includes('decision')), [events]);
  const status = layerStatus.cognitive || 'Unavailable';

  return (
    <div className="grid">
      <section className="panel">
        <h2>Cognitive core</h2>
        <div className="metric"><span>Runtime</span><strong>{status}</strong></div>
        <div className="metric"><span>Governance</span><strong>Managed by core</strong></div>
        <div className="metric"><span>Decision approval</span><strong>{status === 'Unavailable' ? 'Unavailable' : 'Enabled'}</strong></div>
      </section>
      <section className="panel">
        <h3>Cognitive activity</h3>
        {recent.length === 0 ? (
          <p className="chat-empty">No cognitive events yet. Events appear once the runtime streams them.</p>
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
