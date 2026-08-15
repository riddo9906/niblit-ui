import { type ReactNode, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

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

export default function AppShell({ children }: { children: ReactNode }) {
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('runtime');
  const location = useLocation();

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-glass/30 backdrop-blur-xl border-r border-glass-border">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-glass-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Niblit
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  'hover:bg-glass-hover',
                  isActive
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'text-muted-foreground'
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
      <StatusBar onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)} />
    </div>
  );
}

function RightPanel({ activeTab, onTabChange }: { 
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

// Placeholder panels - to be implemented
function RuntimePanel() {
  return <div className="text-sm text-muted-foreground">Runtime status coming soon...</div>;
}
function MemoryPanel() {
  return <div className="text-sm text-muted-foreground">Memory status coming soon...</div>;
}
function TasksPanel() {
  return <div className="text-sm text-muted-foreground">Tasks status coming soon...</div>;
}
function HealthPanel() {
  return <div className="text-sm text-muted-foreground">Health status coming soon...</div>;
}
function ModelsPanel() {
  return <div className="text-sm text-muted-foreground">Models status coming soon...</div>;
}

function StatusBar({ onToggleRightPanel }: { onToggleRightPanel: () => void }) {
  return (
    <div className="h-8 bg-glass/40 backdrop-blur-xl border-t border-glass-border flex items-center justify-between px-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>API: Connected</span>
        <span>Memory: Healthy</span>
        <span>CPU: 45%</span>
        <span>GPU: Idle</span>
      </div>
      <button
        onClick={onToggleRightPanel}
        className="px-2 py-0.5 rounded hover:bg-glass-hover transition-colors"
      >
        Toggle Panel
      </button>
    </div>
  );
}