// Safe localStorage polyfill to prevent SecurityError in restricted iframes or browsers
try {
  const test = window.localStorage;
  if (!test) {
    throw new Error("localStorage is null");
  }
} catch (e) {
  console.warn("localStorage is not accessible, using in-memory fallback", e);
  const memStore: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => memStore[key] !== undefined ? memStore[key] : null,
    setItem: (key: string, value: string) => { memStore[key] = String(value); },
    removeItem: (key: string) => { delete memStore[key]; },
    clear: () => { for (const key in memStore) delete memStore[key]; },
    key: (index: number) => Object.keys(memStore)[index] || null,
    get length() { return Object.keys(memStore).length; }
  };
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    configurable: true,
    writable: true
  });
}

import React, {StrictMode, Component, ReactNode, ErrorInfo} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in TaskFlow Pro:", error, errorInfo);
  }

  handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <h2 className="text-xl font-bold text-slate-100">TaskFlow Pro Encountered an Issue</h2>
            <p className="text-sm text-slate-400">
              {this.state.error?.message || "An unexpected error occurred while loading the application."}
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl transition"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition"
              >
                Clear Cache & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Unregister any legacy service workers and clear cache to prevent the "stale index.html" blank page issue
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then((success) => {
        if (success) {
          console.log('Legacy ServiceWorker unregistered successfully.');
        }
      });
    }
  }).catch((err) => {
    console.warn('Error fetching service worker registrations:', err);
  });

  // Clear cache storage to ensure latest assets are loaded
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name).then(() => {
          console.log(`Cache "${name}" cleared successfully.`);
        }).catch(() => {});
      }
    }).catch(() => {});
  }
}


