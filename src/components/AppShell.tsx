import { type ReactNode, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useRuntimeStore } from '../state/runtimeStore';
import type { LayerName } from '../types/runtime';
import { StatusDot, statusKind } from './ui/StatusDot';
import { EmptyState } from './ui/States';
import CommandPalette from './commands/CommandPalette';

/** Small inline monochrome markers (currentColor tinted). No external icon dep. */
function NavIcon({ icon }: { icon: string }) {
  const paths: Record<string, string> = {
    overview: 'M3 3h4v4H3zM10 3h3v3h-3zM3 10h4v4H3zM10 10h5v4h-5z',
    chat: 'M3 2h10v9H5l-2 2V2z',
    brain: 'M8 2a3 3 0 0 1 3 3v3a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z',
    wave: 'M2 11l2-2 2 2 3-3 3 3v3H2z',
    memory: 'M3 4h10v2H3zM5 7h8v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7z',
    folder: 'M3 4h10v1H3zm2 3l1-2h4l1 2h2v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7z',
    exec: 'M5 3l6 5-6 5z',
    trade: 'M3 9l3-3 2 2 3-3 3 3h2v3H3z',
    cmd: 'M5 5l6 6M11 5l-6 6',
  };
  return (
    <svg viewBox="0 0 16 16" className="navicon" aria-hidden="true">
      <path d={paths[icon] ?? paths.overview} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

interface NavItem { to: string; label: string; sub: string; icon: string; end?: boolean; }

const navGroups: Array<{ id: string; label: string; items: NavItem[] }> = [
  {
    id: 'intelligence',
    label: 'Intelligence',
    items: [
      { to: '/chat', label: 'Chat', sub: 'Cognitive workspace', icon: 'chat' },
      { to: '/cognitive', label: 'Cognitive', sub: 'Core & governance', icon: 'brain' },
      { to: '/inference', label: 'Inference', sub: 'Model bridge', icon: 'wave' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { to: '/', label: 'Overview', sub: 'Runtime home', icon: 'overview', end: true },
      { to: '/memory', label: 'Memory', sub: 'Vector store', icon: 'memory' },
      { to: '/files', label: 'Files', sub: 'Niblit workspace', icon: 'folder' },
    ],
  },
  {
    id: 'autonomy',
    label: 'Autonomy',
    items: [
      { to: '/execution', label: 'Execution', sub: 'Guarded actions', icon: 'exec' },
      { to: '/trading', label: 'Trading', sub: 'Governed runtime', icon: 'trade' },
      { to: '/commands', label: 'Commands', sub: 'Core control surface', icon: 'cmd' },
    ],
  },
];

const layers: Array<{ key: LayerName; label: string }> = [
  { key: 'cognitive', label: 'Core' },
  { key: 'inference', label: 'Cloud' },
  { key: 'execution', label: 'Execution' },
];

type SimpleEvent = { id: string; type: string; timestamp: number };

function HeaderBar({ layerStatus }: { layerStatus: Record<LayerName, string> }) {
  const ok = statusKind(layerStatus.cognitive) === 'ok';
  return (
    <header className="header-bar">
      <div className="header-bar__left">
        <div className="niblit-logo">
          <span className="niblit-logo__dot" />
          <span className="niblit-logo__text">NIBLIT</span>
        </div>
        <span className="niblit-tagline">Local Autonomous Intelligence Runtime</span>
      </div>
      <div className="header-bar__right">
        <StatusDot status={layerStatus.cognitive} label={ok ? 'SYSTEM OPERATIONAL' : undefined} pulse={ok} />
        <span className="header-meta">v0.1.0</span>
      </div>
    </header>
  );
}

function NavSection({ group }: { group: { id: string; label: string; items: NavItem[] } }) {
  return (
    <div className="nav-section">
      <div className="nav-section__label">{group.label}</div>
      {group.items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end ?? false}
          className={({ isActive }) => cn('nav-item', isActive ? 'nav-item--active' : 'nav-item--inactive')}
        >
          <span className="nav-item__icon"><NavIcon icon={item.icon} /></span>
          <span className="nav-item__body">
            <span className="nav-item__label">{item.label}</span>
            <span className="nav-item__sub">{item.sub}</span>
          </span>
          <span className="nav-item__rail" />
        </NavLink>
      ))}
    </div>
  );
}

function LeftSidebar() {
  return (
    <aside className="side-nav">
      <nav className="nav">
        {navGroups.map((group) => (
          <NavSection key={group.id} group={group} />
        ))}
      </nav>
      <div className="nav__footer">
        <span className="nav-footprint">Local runtime · Offline-first</span>
      </div>
    </aside>
  );
}

const contextTabs: Array<{ id: string; label: string }> = [
  { id: 'runtime', label: 'System' },
  { id: 'activity', label: 'Activity' },
  { id: 'memory', label: 'Memory' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'models', label: 'Models' },
];

function RightPanel({ layerStatus, events }: { layerStatus: Record<LayerName, string>; events: SimpleEvent[] }) {
  const [tab, setTab] = useState('runtime');
  return (
    <aside className="context-panel">
      <div className="context-panel__tabs">
        {contextTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn('context-tab', tab === t.id && 'context-tab--active')}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="context-panel__body">
        {tab === 'runtime' && (
          <div className="service-grid">
            {layers.map((layer) => (
              <div key={layer.key} className="service-row">
                <StatusDot status={layerStatus[layer.key]} />
                <span className="service-row__name">{layer.label}</span>
                <span className="service-row__value">{layerStatus[layer.key]}</span>
              </div>
            ))}
          </div>
        )}
        {tab === 'activity' && (
          <ul className="activity-list">
            {events.length === 0 ? (
              <EmptyState title="No recent activity" kind="idle" />
            ) : (
              events
                .slice(-12)
                .reverse()
                .map((ev) => (
                  <li key={ev.id} className="activity-item">
                    <span className="activity-item__type">{ev.type}</span>
                    <span className="activity-item__time">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  </li>
                ))
            )}
          </ul>
        )}
        {tab === 'memory' && <EmptyState title="Memory backend not connected" kind="unavailable" />}
        {tab === 'tasks' && <EmptyState title="No active tasks" hint="Background work will appear here" kind="idle" />}
        {tab === 'models' && <EmptyState title="No model loaded" hint="Load a provider in Settings" kind="idle" />}
      </div>
    </aside>
  );
}

function StatusBar({
  layerStatus,
  activeLayer,
  onToggleContext,
  contextOpen,
}: {
  layerStatus: Record<LayerName, string>;
  activeLayer: LayerName;
  onToggleContext: () => void;
  contextOpen: boolean;
}) {
  return (
    <footer className="status-bar">
      <div className="status-bar__layers">
        {layers.map((layer) => (
          <span key={layer.key} className="status-bar__item">
            <StatusDot status={layerStatus[layer.key]} />
            <span className="status-bar__label">{layer.label}</span>
            <span className={cn('status-bar__value', activeLayer === layer.key && 'status-bar__value--active')}>
              {layerStatus[layer.key]}
            </span>
          </span>
        ))}
      </div>
      <div className="status-bar__right">
        <span className="observe-badge">OBSERVE</span>
        <button
          type="button"
          className="context-toggle"
          onClick={onToggleContext}
          aria-label={contextOpen ? 'Hide system context' : 'Show system context'}
        >
          {contextOpen ? '✕ Panel' : 'Panel'}
        </button>
        <span className="status-bar__version">Niblit v0.1.0</span>
      </div>
    </footer>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [contextOpen, setContextOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { layerStatus, activeLayer, events } = useRuntimeStore();
  const systemOk = statusKind(layerStatus.cognitive) === 'ok';

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app-shell">
      <HeaderBar layerStatus={layerStatus} />
      <div className="shell-body">
        <LeftSidebar />
        <main className="workspace">
          <div className="workspace__surface">
            {!systemOk && (
              <div className="shell-banner shell-banner--info">
                <StatusDot status={layerStatus.cognitive} />
                <span>Core is {layerStatus.cognitive.toLowerCase()}. Workspace available in read-only mode.</span>
              </div>
            )}
            {children}
          </div>
        </main>
        {contextOpen && <RightPanel layerStatus={layerStatus} events={events as SimpleEvent[]} />}
      </div>
      <StatusBar
        layerStatus={layerStatus}
        activeLayer={activeLayer}
        onToggleContext={() => setContextOpen((o) => !o)}
        contextOpen={contextOpen}
      />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

