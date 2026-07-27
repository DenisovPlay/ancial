'use client';

import { useRouter } from 'next/navigation';
import { BackIcon } from '../../../apps-icons';
import WeatherMapContent from '../../../included/weather/map/weather-map-content';

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
        className="p-1.5 flex items-center group justify-center rounded-full fixed top-3 left-3 cursor-pointer active:scale-95 duration-300 bg-zinc-900/60 border border-zinc-600/40 backdrop-blur-md backdrop-saturate-200 hover:bg-zinc-700 h-10 w-10 z-[9999] shadow-lg"
      >
        <BackIcon className="w-6 h-6 fill-white inline shrink-0" />
      </button>

      {/* Map Content View with Overlay Support */}
      <WeatherMapContent hideHeaderBackButton />
    </div>
  );
}
