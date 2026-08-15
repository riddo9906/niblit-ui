import { NavLink, type To } from 'react-router-dom';
import { useRuntimeStore } from '../state/runtimeStore';
import type { LayerName } from '../types/runtime';

const navigation: Array<{ to: To; label: string }> = [
  { to: '/', label: 'Overview' },
  { to: '/files', label: 'Files' },
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
        <div className="topbar-left">
          <div className="logo">
            <span className="logo-icon">N</span>
            <span className="logo-text">Niblit</span>
          </div>
          <nav className="nav-links">
            {navigation.map((item) => (
              <NavLink key={String(item.to)} to={item.to} end={item.to === '/'}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="topbar-right">
          <div className="layer-info">
            <span className="layer-label">Active layer</span>
            <span className="layer-value">{layerTitles[activeLayer]}</span>
          </div>
          <div className="heartbeat">
            <span className="heartbeat-label">Heartbeat</span>
            <span className="heartbeat-value">{heartbeat}</span>
          </div>
          <div className="layer-states">
            <span className="layer-states-label">Layer states</span>
            <span className="layer-states-value">
              {Object.entries(layerStatus).map(([layer, value]) => `${layer}: ${value}`).join(' • ')}
            </span>
          </div>
        </div>
      </header>

      <div className="shell-content">
        <aside className="sidebar left-sidebar">
          <div className="sidebar-section">
            <h3>Model Status</h3>
            <div className="status-grid">
              <div className="status-row">
                <span>Model</span>
                <span>Qwen2.5-Coder-3B</span>
              </div>
              <div className="status-row">
                <span>Quant</span>
                <span>Q5_K_M • 4.4GB</span>
              </div>
              <div className="status-row">
                <span>Status</span>
                <span className="status-ready">READY</span>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Setup Status</h3>
            <div className="setup-list">
              <div className="setup-item ok">
                <span className="setup-dot ok" />
                <span>llama-server running</span>
                <span className="setup-sub">:8080</span>
              </div>
              <div className="setup-item ok">
                <span className="setup-dot ok" />
                <span>Model loaded</span>
                <span className="setup-sub">Qwen2.5-Coder-3B</span>
              </div>
              <div className="setup-item">
                <span className="setup-dot" />
                <span>Ready for prompts</span>
                <span className="setup-sub">idle</span>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Context Files</h3>
            <div className="context-list">
              <div className="context-item active">
                <span>App.tsx</span>
                <span>847t</span>
              </div>
              <div className="context-item active">
                <span>utils.ts</span>
                <span>312t</span>
              </div>
              <div className="context-item">
                <span>api.ts</span>
                <span>521t</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="content">{children}</main>

        <aside className="sidebar right-sidebar">
          <div className="sidebar-section">
            <h3>Prompt Templates</h3>
            <div className="template-list">
              <button className="template-item">Explain Code</button>
              <button className="template-item">Fix Bug</button>
              <button className="template-item">Write Tests</button>
              <button className="template-item">Refactor</button>
              <button className="template-item">Generate Docs</button>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Runtime Info</h3>
            <div className="status-grid">
              <div className="status-row">
                <span>Provider</span>
                <span>llama.cpp</span>
              </div>
              <div className="status-row">
                <span>Cloud Server</span>
                <span>Running</span>
              </div>
              <div className="status-row">
                <span>Context</span>
                <span>16384</span>
              </div>
              <div className="status-row">
                <span>Temperature</span>
                <span>0.2</span>
              </div>
              <div className="status-row">
                <span>Tokens/sec</span>
                <span>52</span>
              </div>
              <div className="status-row">
                <span>Memory</span>
                <span>6 GB</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <footer className="bottom-bar">
        <div className="bottom-bar-content">
          <span className="offline-indicator">
            <span className="offline-dot" />
            Offline Mode • GGUF
          </span>
        </div>
      </footer>
    </div>
  );
}
