'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function AdblockBanner() {
  const { lang } = useAuth();
  const [hasAdblock, setHasAdblock] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const detectAdblock = () => {
      // Способ 1: Фейковый DOM элемент (основной и самый надежный метод)
      const ad = document.createElement('div');
      ad.className = 'adsbox textad banner-ad ads-banner ad-placement ad-container ads-box';
      ad.style.height = '10px';
      ad.style.width = '10px';
      ad.style.position = 'absolute';
      ad.style.top = '-1000px';
      ad.style.left = '-1000px';
      document.body.appendChild(ad);

      // Способ 2: Параллельный fetch
      fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
        method: 'HEAD',
        mode: 'no-cors'
      }).catch(() => {
        if (isMounted) {
          console.log('[AdblockBanner] Detected via fetch block');
          setHasAdblock(true);
        }
      });

      // Проверка DOM-элемента через небольшую задержку
      setTimeout(() => {
        if (!isMounted) return;
        const isBlocked = ad.offsetHeight === 0 || window.getComputedStyle(ad).display === 'none';
        
        if (isBlocked) {
          console.log('[AdblockBanner] Detected via DOM element');
          setHasAdblock(true);
        }
        document.body.removeChild(ad);
      }, 300);
    };

    detectAdblock();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!hasAdblock || isDismissed) return null;

  return (
    <div className="fixed bottom-4 sm:bottom-8 left-4 right-4 sm:left-auto sm:right-8 sm:w-96 bg-zinc-900/95 backdrop-blur-xl border border-red-500/50 shadow-2xl shadow-red-900/20 rounded-3xl p-5 z-[9999] flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="flex items-start gap-3 text-red-200">
        <svg className="w-8 h-8 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
          <path d="M11 7h2v6h-2zm0 8h2v2h-2z" fill="white" />
        </svg>
        <div className="flex flex-col gap-1">
          <h3 className="text-white font-black text-base">Блокировщик рекламы</h3>
          <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed">
            Похоже, у вас включён AdBlock. Пожалуйста, добавьте наш сайт в исключения, чтобы поддержать развитие проекта ❤️
          </p>
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button
          onClick={() => setIsDismissed(true)}
          className="focusable-tv px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-full text-sm font-bold transition-all active:scale-95 outline-none focus:ring-4 focus:ring-white shadow-lg shadow-red-600/30"
        >
          Я отключил
        </button>
      </div>
    </div>
  );
}
