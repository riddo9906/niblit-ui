import { useEffect, useMemo } from 'react';
import { useEventBus } from '../lib/eventBus';

export default function ExecutionPage() {
  const { events, pushEvent } = useEventBus();

  useEffect(() => {
    pushEvent({
      id: `execution-${Date.now()}`,
      type: 'execution.updated',
      source: 'execution',
      timestamp: Date.now(),
      payload: { orderStatus: 'filled', pnl: 1.32 },
    });
  }, [pushEvent]);

  const recent = useMemo(() => events.filter((event) => event.source === 'execution' || event.type.includes('execution')), [events]);

  return (
    <div className="grid">
      <section className="panel">
        <h2>Execution layer</h2>
        <div className="metric"><span>Market feed</span><strong>Connected</strong></div>
        <div className="metric"><span>Order routing</span><strong>Governed</strong></div>
        <div className="metric"><span>Latency</span><strong>Stable</strong></div>
      </section>
      <section className="panel">
        <h3>Recent execution events</h3>
        <ul className="list">
          {recent.map((event) => (
            <li key={event.id}>{event.type} • {String(event.payload.orderStatus ?? 'unknown')}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
