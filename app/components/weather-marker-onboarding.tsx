'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface WeatherMarkerOnboardingProps {
  children: React.ReactNode;
}

export default function WeatherMarkerOnboarding({ children }: WeatherMarkerOnboardingProps) {
  const { lang } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 768) return () => {};

    let startTimer: ReturnType<typeof setTimeout> | null = null;
    let fadeTimer: ReturnType<typeof setTimeout> | null = null;
    let removeTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      const alreadyShown = localStorage.getItem('ancial_weather_onboarding_shown');
      if (!alreadyShown) {
        // Mark as shown in localStorage immediately
        localStorage.setItem('ancial_weather_onboarding_shown', 'true');

        // Delay start slightly for smooth page load
        startTimer = setTimeout(() => {
          setShowOnboarding(true);

          // Fade out after 4.5 seconds
          fadeTimer = setTimeout(() => {
            setIsFadingOut(true);
            removeTimer = setTimeout(() => {
              setShowOnboarding(false);
            }, 800);
          }, 4500);
        }, 700);
      }
    } catch (e) {
      console.error('Failed to read weather onboarding cache:', e);
    }

    return () => {
      if (startTimer) clearTimeout(startTimer);
      if (fadeTimer) clearTimeout(fadeTimer);
      if (removeTimer) clearTimeout(removeTimer);
    };
  }, []);

  return (
    <div className="relative inline-flex items-center">
      {children}

      {showOnboarding && (
        <div
          className={`absolute inset-0 pointer-events-none z-30 flex items-center transition-all duration-700 ${isFadingOut ? 'opacity-0 -translate-x-2' : 'opacity-100 translate-x-0'
            }`}
        >
          {/* HAND-DRAWN MARKER STROKE SVG OVERLAY */}
          <svg
            className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] overflow-visible pointer-events-none"
            viewBox="0 0 100 36"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M 5,5 C 30,2 75,3 95,6 C 102,8 101,28 90,32 C 60,35 15,34 6,30 C -2,25 1,8 20,4 C 45,2 80,3 96,8"
              stroke="#f59e0b"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 300,
                strokeDashoffset: 300,
                animation: 'drawMarker 1.1s ease-out forwards',
                filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.7))',
              }}
            />
          </svg>

          {/* FLOATING TEXT ON THE LEFT (NO BACKGROUND PANEL) */}
          <div className="absolute right-full mr-3.5 whitespace-nowrap text-amber-300 font-bold flex items-center gap-2 drop-shadow-[0_2px_10px_rgba(245,158,11,0.6)] animate-in fade-in slide-in-from-right-3 duration-500 z-40 select-none">
            <span>{lang?.weather_onboarding_hint || 'Прогноз на несколько дней и карта осадков'}</span>
          </div>
        </div>
      )}

      {/* CSS KEYFRAMES FOR MARKER ANIMATION */}
      <style jsx global>{`
        @keyframes drawMarker {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}
