import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { enableMapSet } from "immer";
import '@/lib/errorReporter';
import '@/index.css'
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { HomePage } from '@/pages/HomePage'
import { ThreadPage } from '@/pages/ThreadPage'
import { ComposePage } from '@/pages/ComposePage'
import { DocsPage } from '@/pages/DocsPage'
import { SettingsPage } from '@/pages/SettingsPage'
enableMapSet();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});
const router = createBrowserRouter([
  { path: "/", element: <HomePage />, errorElement: <RouteErrorBoundary /> },
  { path: "/settings", element: <SettingsPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/docs", element: <DocsPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/thread/:id", element: <ThreadPage />, errorElement: <RouteErrorBoundary /> },
  { path: "/compose", element: <ComposePage />, errorElement: <RouteErrorBoundary /> },
  { path: "/:folder", element: <HomePage />, errorElement: <RouteErrorBoundary /> },
]);
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Failed to find root element");
createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>
);
// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('AeroMail SW registered with scope:', registration.scope);
        // Cast to any to bypass missing TS types for the Background Sync API
        const reg = registration as any;
        if (reg.sync) {
          reg.sync.register('send-email').catch(() => {
            console.warn('Background sync not supported or failed to register');
          });
        }
      })
      .catch((err) => {
        console.error('AeroMail SW registration failed:', err);
      });
  });
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}