import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import { EventBusProvider } from './events/eventBus';
import { RuntimeStoreProvider } from './state/runtimeStore';

const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const CognitivePage = lazy(() => import('./pages/CognitivePage'));
const InferencePage = lazy(() => import('./pages/InferencePage'));
const ExecutionPage = lazy(() => import('./pages/ExecutionPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const FilesPage = lazy(() => import('./pages/FilesPage'));

function App() {
  return (
    <EventBusProvider>
      <RuntimeStoreProvider>
        <AppShell>
          <Suspense fallback={<div className="panel">Loading view…</div>}>
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/cognitive" element={<CognitivePage />} />
              <Route path="/inference" element={<InferencePage />} />
              <Route path="/execution" element={<ExecutionPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/files" element={<FilesPage />} />
            </Routes>
          </Suspense>
        </AppShell>
      </RuntimeStoreProvider>
    </EventBusProvider>
  );
}

export default App;
