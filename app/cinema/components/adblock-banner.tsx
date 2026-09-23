'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Icon from '../../components/svg-icon';

export default function AdblockBanner() {
  const { lang } = useAuth();
  const [hasAdblock, setHasAdblock] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let adElement: HTMLDivElement | null = null;

    const detectAdblock = () => {
      const ad = document.createElement('div');
      ad.className = 'adsbox textad banner-ad ads-banner ad-placement ad-container ads-box';
      ad.style.height = '10px';
      ad.style.width = '10px';
      ad.style.position = 'absolute';
      ad.style.top = '-1000px';
      ad.style.left = '-1000px';
      document.body.appendChild(ad);
      adElement = ad;

      fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
        method: 'HEAD',
        mode: 'no-cors'
      }).catch(() => {
        if (isMounted) {
          setHasAdblock(true);
        }
      });

      timer = setTimeout(() => {
        if (!isMounted) return;
        const isBlocked = ad.offsetHeight === 0 || window.getComputedStyle(ad).display === 'none';
        
        if (isBlocked) {
          setHasAdblock(true);
        }
        if (ad.parentNode) {
          ad.parentNode.removeChild(ad);
          adElement = null;
        }
      }, 300);
    };

    detectAdblock();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      if (adElement && adElement.parentNode) {
        adElement.parentNode.removeChild(adElement);
      }
    };
  }, []);

  if (!hasAdblock || isDismissed) return null;

  return (
    <div className="fixed bottom-4 sm:bottom-8 left-4 right-4 sm:left-auto sm:right-8 sm:w-96 bg-zinc-900/95 backdrop-blur-xl border border-red-500/50 shadow-2xl shadow-red-900/20 rounded-3xl p-5 z-[9999] flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="flex items-start gap-3 text-red-200">
        <Icon name="IC-shield" className="w-8 h-8 shrink-0 text-red-500" fill="currentColor" />
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
