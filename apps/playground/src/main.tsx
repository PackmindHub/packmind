import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { UIProvider } from '@packmind/ui';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UIProvider>
      <App />
    </UIProvider>
  </StrictMode>,
);
