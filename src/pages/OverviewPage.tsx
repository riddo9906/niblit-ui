import { useEffect, useMemo, useState } from 'react';
import { useEventBus, type BaseEvent } from '../lib/eventBus';

const layers = [
  { name: 'Cognitive', description: 'Governance, memory, decision approval.', accent: '#38bdf8' },
  { name: 'Inference', description: 'Cloud runtime, model routing, latency.', accent: '#818cf8' },
  { name: 'Execution', description: 'Market events, orders, portfolio state.', accent: '#f59e0b' },
];

export default function OverviewPage() {
  const { events, pushEvent } = useEventBus();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((value) => value + 1);
      pushEvent({
        id: `evt-${Date.now()}`,
        type: 'system.heartbeat',
        source: 'system',
        timestamp: Date.now(),
        payload: { tick },
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [pushEvent, tick]);

  const recent = useMemo(() => events.slice(0, 8), [events]);

  return (
    <div className="content">
      <section className="hero">
        <div className="panel">
          <h2>Three-layer architecture</h2>
          <p>The UI maps the cognitive core, inference layer, and execution layer into a single real-time control surface.</p>
          <div className="grid">
            {layers.map((layer) => (
              <div className="panel" key={layer.name}>
                <h3 style={{ color: layer.accent }}>{layer.name}</h3>
                <p>{layer.description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h3>Runtime feed</h3>
          <div className="status-pill">Live event loop • {recent.length} recent events</div>
          <ul className="list">
            {recent.map((event: BaseEvent) => (
              <li key={event.id}>{event.type} • {new Date(event.timestamp).toLocaleTimeString()}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
