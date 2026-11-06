import '@santi020k/lumen-react/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles.css';
// V3-only theme is loaded AFTER all V2 base CSS, avoiding cascade overwrite.
import './desktop-palette-slate-blue.css';
// Reference-inspired dashboard is loaded LAST in V3 only.
import './desktop-reference-dashboard.css';
// Icon accents deliberately come after established V3 visual theme.
import './features/iconography/ambienta-icons.css';
// Illustrated hero identity comes after the reference theme and plain icon styling.
import './features/iconography/illustrated-hero.css';
// Generated WebP art is V3-only, served from the compiled app, never an external CDN.
import './features/iconography/raster-art.css';

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el contenedor de AMBIENTA V2');
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter><App /></HashRouter>
    </QueryClientProvider>
  </StrictMode>
);
