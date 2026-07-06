import { NavLink, type To } from 'react-router-dom';
import { useRuntimeStore } from '../state/runtimeStore';
import type { LayerName } from '../types/runtime';

const navigation: Array<{ to: To; label: string }> = [
  { to: '/', label: 'Overview' },
  { to: '/chat', label: 'Chat' },
  { to: '/cognitive', label: 'Cognitive' },
  { to: '/inference', label: 'Inference' },
  { to: '/execution', label: 'Execution' },
];

const layerTitles: Record<LayerName, string> = {
  cognitive: 'Cognitive core',
  inference: 'Inference bridge',
  execution: 'Execution loop',
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { activeLayer, heartbeat, layerStatus } = useRuntimeStore();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Niblit 3-Layer Control Center</h1>
          <p>Real-time cognitive, inference, and execution routing.</p>
        </div>
        <nav className="nav-links">
          {navigation.map((item) => (
            <NavLink key={String(item.to)} to={item.to} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <section className="panel shell-summary">
        <div>
          <strong>Active layer</strong>
          <div>{layerTitles[activeLayer]}</div>
        </div>
        <div>
          <strong>Heartbeat</strong>
          <div>{heartbeat}</div>
        </div>
        <div>
          <strong>Layer states</strong>
          <div>{Object.entries(layerStatus).map(([layer, value]) => `${layer}: ${value}`).join(' • ')}</div>
        </div>
      </section>

      <main className="content">{children}</main>
    </div>
  );
}
