import { useEffect, useMemo } from 'react';
import { useEventBus } from '../lib/eventBus';

export default function InferencePage() {
  const { events, pushEvent } = useEventBus();

  useEffect(() => {
    pushEvent({
      id: `inference-${Date.now()}`,
      type: 'inference.result',
      source: 'inference',
      timestamp: Date.now(),
      payload: { latencyMs: 42, modelId: 'local' },
    });
  }, [pushEvent]);

  const recent = useMemo(() => events.filter((event) => event.source === 'inference' || event.type.includes('inference')), [events]);

  return (
    <div className="grid">
      <section className="panel">
        <h2>Inference layer</h2>
        <div className="metric"><span>Model route</span><strong>Cloud bridge active</strong></div>
        <div className="metric"><span>Latency</span><strong>Low</strong></div>
        <div className="metric"><span>Request dedupe</span><strong>Enabled</strong></div>
      </section>
      <section className="panel">
        <h3>Recent inference events</h3>
        <ul className="list">
          {recent.map((event) => (
            <li key={event.id}>{event.type} • {String(event.payload.modelId ?? 'unknown')}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
