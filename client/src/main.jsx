import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import './index.css';

// Default to dark theme (this app's fully-designed experience) unless the
// user has explicitly chosen light mode in Settings.
if (localStorage.getItem('theme') !== 'light') {
  document.documentElement.classList.add('dark');
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Register service worker (handled by vite-plugin-pwa's virtual module in production build)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}
