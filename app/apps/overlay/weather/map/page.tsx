'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import WeatherMapContent from '../../../included/weather/map/weather-map-content';
import Icon from '../../../../components/svg-icon';

export default function WeatherMapOverlayPage() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/apps/overlay/weather');
    }
  };

  return (
    <div className="apps-overlay-route no-mobile-nav-padding no-pc-nav-padding min-h-screen w-full relative bg-black">
      {/* Overlay Floating Back Button */}
      <button
        type="button"
        aria-label="Назад"
        onClick={handleBack}
        className="glass-panel [--glass-alpha:0.6] [--glass-sat:2] p-1.5 flex items-center group justify-center rounded-full fixed top-3 left-3 cursor-pointer active:scale-95 duration-300 border border-zinc-600/40 hover:[--glass-tint:var(--color-zinc-700)] hover:[--glass-alpha:1] h-10 w-10 z-[9999] shadow-lg"
      >
        <Icon name="IC-chevron-left" className="w-6 h-6 fill-white inline shrink-0" />
      </button>

      {/* Map Content View with Overlay Support wrapped in Suspense */}
      <Suspense fallback={<div className="h-screen w-full bg-zinc-950" />}>
        <WeatherMapContent hideHeaderBackButton />
      </Suspense>
    </div>
  );
}
