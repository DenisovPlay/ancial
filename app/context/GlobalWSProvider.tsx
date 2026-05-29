'use client';

import { useEffect, useSyncExternalStore } from 'react';

import { useAuth } from './AuthContext';
import { globalWS } from '../lib/global-ws';

function NetStatusBanner() {
  const { lang } = useAuth();
  const status = useSyncExternalStore(
    globalWS.subscribeNetStatus,
    globalWS.getNetStatus,
    globalWS.getNetStatus,
  );

  const isVisible = status === 'reconnecting';

  return (
    <div
      className={`fixed top-0 inset-x-0 w-full flex items-center justify-center pt-[calc(env(safe-area-inset-top,0px)+0.25rem)] z-[9999999999] pointer-events-none transition-[opacity,transform,visibility] duration-[320ms] ease-[cubic-bezier(0.34,1.4,0.64,1)] ${
        isVisible ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-full opacity-0'
      }`}
      aria-live="polite"
      aria-hidden={!isVisible}
    >
      <span className="p-1 bg-zinc-800/90 backdrop-blur-lg text-xs rounded-full flex gap-1 items-center border border-zinc-600/30 text-zinc-100 shadow-lg">
        <svg
          className="w-5 h-5 inline animate-spin fill-purple-500"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 48 48"
          aria-hidden="true"
        >
          <path d="M24 4a1.5 1.5 0 0 0 0 3c6.256 0 11.766 3.407 14.703 8.455a1.5 1.5 0 1 0 2.594-1.51C37.834 7.994 31.344 4 24 4Z" />
        </svg>
        <span>{lang?.reconnect || 'Переподключение...'}</span>
      </span>
    </div>
  );
}

export function GlobalWSProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    window.GlobalWS = globalWS;
    globalWS.init();

    const syncConnection = () => {
      globalWS.init();
    };

    window.addEventListener('focus', syncConnection);
    window.addEventListener('online', syncConnection);
    window.addEventListener('storage', syncConnection);

    return () => {
      window.removeEventListener('focus', syncConnection);
      window.removeEventListener('online', syncConnection);
      window.removeEventListener('storage', syncConnection);

      if (window.GlobalWS === globalWS) {
        delete window.GlobalWS;
      }
    };
  }, []);

  useEffect(() => {
    globalWS.init();
  }, [isAuthenticated, user?.id]);

  return (
    <>
      <NetStatusBanner />
      {children}
    </>
  );
}
