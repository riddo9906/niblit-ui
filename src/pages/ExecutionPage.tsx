import { useMemo } from 'react';
import { useEventBus } from '../lib/eventBus';
import { useRuntimeStore } from '../state/runtimeStore';

export default function ExecutionPage() {
  const { events } = useEventBus();
  const { layerStatus } = useRuntimeStore();

  const recent = useMemo(() => events.filter((event) => event.source === 'execution' || event.type.includes('execution')), [events]);
  const status = layerStatus.execution || 'Unavailable';

  return (
    <div className="grid">
      <section className="panel">
        <h2>Execution layer</h2>
        <div className="metric"><span>Runtime</span><strong>{status}</strong></div>
        <div className="metric"><span>Order routing</span><strong>Governed</strong></div>
        <div className="metric"><span>Latency</span><strong>{status === 'Unavailable' ? 'Unavailable' : 'From runtime'}</strong></div>
      </section>
      <section className="panel">
        <h3>Execution activity</h3>
        {recent.length === 0 ? (
          <p className="chat-empty">No execution events yet. Events appear once the runtime streams them.</p>
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
