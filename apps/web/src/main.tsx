import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import './style.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App.tsx';
import { createDeriveWorker } from './worker/createWorker.ts';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App createWorker={createDeriveWorker} />
    </StrictMode>,
  );
}
