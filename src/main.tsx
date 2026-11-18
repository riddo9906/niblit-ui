import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { initializeDesktopBinding } from './runtimeBinding';
import './styles.css';

async function launch() {
await initializeDesktopBinding();
const { default: App } = await import('./App');
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

}
void launch().catch(error => { document.getElementById('root')!.textContent = `Desktop connection configuration failed: ${String(error)}. Launch Niblit from its installed shortcut.`; });
