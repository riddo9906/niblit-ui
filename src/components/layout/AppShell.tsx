import { type ReactNode, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useRuntimeStore } from '../../state/runtimeStore';
import type { LayerName } from '../../types/runtime';

export type RightPanelTab = 'runtime' | 'memory' | 'tasks' | 'health' | 'models';

const navigation = [
  { to: '/', label: 'New Chat', icon: 'plus' },
  { to: '/chats', label: 'Chats', icon: 'message-square' },
  { to: '/memory', label: 'Memory', icon: 'database' },
  { to: '/skills', label: 'Skills', icon: 'zap' },
  { to: '/agents', label: 'Agents', icon: 'bot' },
  { to: '/trading', label: 'Trading', icon: 'trending-up' },
  { to: '/knowledge', label: 'Knowledge', icon: 'book' },
  { to: '/research', label: 'Research', icon: 'search' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

const statusColor: Record<string, string> = {
  healthy: 'runtime-dot--ok',
  operational: 'runtime-dot--ok',
  connected: 'runtime-dot--ok',
  ready: 'runtime-dot--ok',
  active: 'runtime-dot--ok',
  online: 'runtime-dot--ok',
  degraded: 'runtime-dot--warn',
  observe: 'runtime-dot--warn',
  paper: 'runtime-dot--warn',
  idle: 'runtime-dot--idle',
  offline: 'runtime-dot--danger',
  disconnected: 'runtime-dot--danger',
  default: 'runtime-dot--idle',
};

export default function AppShell({ children }: { children: ReactNode }) {
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('runtime');
  const location = useLocation();
  const { layerStatus } = useRuntimeStore();

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-glass/30 backdrop-blur-xl border-r border-glass-border">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-glass-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Niblit
          </h1>
        </div>

        <nav className="flex-1 px-3 py-4">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  'hover:bg-glass-hover',
                  isActive ? 'bg-blue-500/20 text-blue-300' : 'text-muted-foreground'
                )
              }
            >
              <span className="w-5 h-5">{item.label.charAt(0)}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Center Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-y-auto"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Right Panel - Collapsible */}
      <AnimatePresence>
        {rightPanelOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex-shrink-0 bg-glass/20 backdrop-blur-xl border-l border-glass-border overflow-hidden"
          >
            <RightPanel activeTab={rightPanelTab} onTabChange={setRightPanelTab} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Status Bar */}
      <StatusBar
        onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)}
        layerStatus={layerStatus}
      />
    </div>
  );
}
function RightPanel({
  activeTab,
  onTabChange,
}: {
  activeTab: RightPanelTab;
  onTabChange: (tab: RightPanelTab) => void;
}) {
  const tabs: Array<{ id: RightPanelTab; label: string }> = [
    { id: 'runtime', label: 'Runtime' },
    { id: 'memory', label: 'Memory' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'health', label: 'Health' },
    { id: 'models', label: 'Models' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-glass-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex-1 px-3 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'runtime' && <RuntimePanel />}
        {activeTab === 'memory' && <MemoryPanel />}
        {activeTab === 'tasks' && <TasksPanel />}
        {activeTab === 'health' && <HealthPanel />}
        {activeTab === 'models' && <ModelsPanel />}
      </div>
    </div>
  );
}

// Runtime Panel - shows live runtime status from the shared store
function RuntimePanel() {
  const { layerStatus, events } = useRuntimeStore();

  const statusItems: Array<{ key: LayerName; label: string }> = [
    { key: 'cognitive', label: 'Core' },
    { key: 'inference', label: 'Cloud' },
    { key: 'execution', label: 'Execution' },
  ];

  return (
    <div className="space-y-4">
      {/* Global Runtime Indicator */}
      <div className="p-3 border-b border-glass-border mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Niblit</span>
          <span className={cn('runtime-dot', statusColor[layerStatus.cognitive] ?? statusColor.default)} />
          <span className="text-xs text-muted-foreground">{layerStatus.cognitive}</span>
        </div>
      </div>

      {/* Runtime Service Status */}
      <div className="space-y-2">
        {statusItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <span className="text-sm text-foreground">{item.label}</span>
            <span className="flex items-center gap-2">
              <span className={cn('runtime-dot', statusColor[layerStatus[item.key]] ?? statusColor.default)} />
              <span className="text-xs text-muted-foreground">{layerStatus[item.key]}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      {events.length > 0 && (
        <div className="pt-3 border-t border-glass-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Activity</span>
            <span className="text-xs font-mono text-muted-foreground">{events.length} events</span>
          </div>
          <ul className="text-xs text-muted-foreground">
            {events.slice(0, 5).map((event) => (
              <li key={event.id}>
                {event.type} • {new Date(event.timestamp).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MemoryPanel() {
  return <div className="text-sm text-muted-foreground">Memory backend - Qdrant integration pending</div>;
}

function TasksPanel() {
  return <div className="text-sm text-muted-foreground">Tasks panel - pending implementation</div>;
}

function HealthPanel() {
  return <div className="text-sm text-muted-foreground">Health panel - pending implementation</div>;
}

function ModelsPanel() {
  return <div className="text-sm text-muted-foreground">Models panel - pending implementation</div>;
}

function StatusBar({
  onToggleRightPanel,
  layerStatus,
}: {
  onToggleRightPanel: () => void;
  layerStatus: Record<LayerName, string>;
}) {
  const items: Array<{ key: LayerName; label: string }> = [
    { key: 'cognitive', label: 'Core' },
    { key: 'inference', label: 'Cloud' },
    { key: 'execution', label: 'Execution' },
  ];

  return (
    <div className="flex items-center justify-between px-4 text-xs text-muted-foreground border-t border-glass-border">
      <div className="flex items-center gap-4">
        {items.map((item) => (
          <span key={item.key} className="flex items-center gap-1.5">
            <span className={cn('runtime-dot', statusColor[layerStatus[item.key]] ?? statusColor.default)} />
            {item.label}
          </span>
        ))}
      </div>
      <button
        onClick={onToggleRightPanel}
        className="px-2 py-0.5 rounded hover:bg-glass-hover transition-colors"
      >
        Panel
      </button>
    </div>
  );
}

