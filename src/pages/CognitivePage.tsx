import { useEffect, useMemo } from 'react';
import { useEventBus } from '../lib/eventBus';

export default function CognitivePage() {
  const { events, pushEvent } = useEventBus();

  useEffect(() => {
    pushEvent({
      id: `cognitive-${Date.now()}`,
      type: 'decision.updated',
      source: 'cognitive',
      timestamp: Date.now(),
      payload: { decision: 'Approve', confidence: 0.84 },
    });
  }, [pushEvent]);

  const recent = useMemo(() => events.filter((event) => event.source === 'cognitive' || event.type.includes('decision')), [events]);

  return (
    <div className="grid">
      <section className="panel">
        <h2>Cognitive core</h2>
        <div className="metric"><span>Memory</span><strong>Healthy</strong></div>
        <div className="metric"><span>Governance</span><strong>Aligned</strong></div>
        <div className="metric"><span>Decision approval</span><strong>Enabled</strong></div>
      </section>
      <section className="panel">
        <h3>Recent cognitive events</h3>
        <ul className="list">
          {recent.map((event) => {
            const decision = typeof event.payload.decision === 'string' ? event.payload.decision : 'signal';

            return <li key={event.id}>{event.type} • {decision}</li>;
          })}
        </ul>
      </section>
    </div>
  );
}
