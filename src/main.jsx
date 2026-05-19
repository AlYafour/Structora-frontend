/**
 * 🚀 Application Entry Point
 * @version 2.0.0
 *
 * Provider hierarchy:
 * 1. BrowserRouter - Routing
 * 2. ErrorBoundary - Error handling
 * 3. QueryClientProvider - React Query caching & state
 * 4. AuthProvider - Authentication & tenant context
 * 5. ThemeProvider - MUI theme with tenant branding
 * 6. App - Application routes
 */

// Polyfill Buffer globally for jszip (and other Node.js libs used in the browser)
import { Buffer } from 'buffer';
if (!globalThis.Buffer) globalThis.Buffer = Buffer;

import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QUERY_STALE_TIME, QUERY_GC_TIME } from './utils/constants';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import * as Sentry from '@sentry/react';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { VatDisplayProvider } from './contexts/VatDisplayContext';
import { ThemeContextProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import ThemeProvider from './theme/ThemeProvider';
import App from './App.jsx';

// Initialize Sentry for production error tracking
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    enabled: import.meta.env.PROD,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}

// Configure React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME,
      gcTime: QUERY_GC_TIME,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

// 🎨 Design System CSS (order matters!)
import './styles/ds/tokens.css';     // CSS variables & tokens
import './styles/ds/components.css';  // All component styles
import './styles/ds/utilities.css';   // Utility classes

// 🌐 Internationalization
import './config/i18n';

// 📊 Performance monitoring (development only)
if (import.meta.env.DEV) {
  // Log render timing
  const startTime = performance.now();
  window.addEventListener('load', () => {
    const loadTime = performance.now() - startTime;
    console.debug(`App loaded in ${loadTime.toFixed(2)}ms`);
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeContextProvider>
          <AuthProvider>
            <ThemeProvider>
              <NotificationProvider>
                <VatDisplayProvider>
                  <App />
                </VatDisplayProvider>
              </NotificationProvider>
            </ThemeProvider>
          </AuthProvider>
        </ThemeContextProvider>
        {/* React Query Devtools (development only) */}
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  </BrowserRouter>
);
