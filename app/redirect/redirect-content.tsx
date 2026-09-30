'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { toInternalPath } from '../lib/internal-link';
import AppImage from '../components/app-image';
import LinkGuardBody from '../components/link-guard-body';

function RedirectContentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawLink = searchParams.get('link') || searchParams.get('url') || '';
  const { lang } = useAuth();
  // Ссылка на наш же сайт: проверять нечего — сразу переходим, без этой страницы в истории.
  const internalPath = toInternalPath(rawLink);

  useEffect(() => {
    if (internalPath) router.replace(internalPath);
  }, [internalPath, router]);

  if (internalPath) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center p-3">
      <style>{`
        #NAVP, [data-app-nav="mobile"], [data-app-nav="desktop"] { display: none !important; }
        #main-content { padding: 0 !important; }
      `}</style>
      <div className="flex w-full max-w-xl flex-col gap-3">
        {/* Header box */}
        <div className="glass-panel [--glass-alpha:0.9] [--glass-blur:24px] pb-20 flex items-center gap-3 rounded-3xl border border-zinc-800 p-3 shadow-2xl">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-3xl">
            <AppImage width={56} height={56} alt="Zypo Logo" className="h-14 w-14 rounded-3xl" src="/img/zypo/logo-rounded.webp" />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-xl font-bold text-white lg:text-2xl">
              {lang?.redirect_title || 'Переход на сторонний ресурс'}
            </h1>
            <p className="text-xs text-zinc-400 lg:text-sm">
              {lang?.redirect_subtitle || 'Проверка безопасности ссылки перед открытием'}
            </p>
          </div>
        </div>

        <LinkGuardBody
          overlapHeader
          rawLink={rawLink}
          onCancel={() => {
            if (window.history.length > 1) router.back();
            else router.push('/');
          }}
        />
      </div>
    </div>
  );
}

export default function RedirectContent() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center">
          <style>{`
            #NAVP, [data-app-nav="mobile"], [data-app-nav="desktop"] { display: none !important; }
            #main-content { padding: 0 !important; }
          `}</style>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      }
    >
      <RedirectContentInner />
    </Suspense>
  );
}
