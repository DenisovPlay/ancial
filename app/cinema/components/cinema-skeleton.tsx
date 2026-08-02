'use client';

import React from 'react';

export function FrameBrandLoader() {
  return (
    <div className="flex items-center justify-center p-8 select-none">
      {/* PURE ELEGANT BRAND LOGO ANIMATION (NO TEXT, NO NEON, NO BOUNCE) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/branding/frame.svg"
        alt="Frame"
        className="h-12 sm:h-16 w-auto animate-pulse duration-1000"
      />
    </div>
  );
}

export function CinemaHeroSkeleton() {
  return (
    <div className="relative w-full h-[80vh] sm:h-[85vh] lg:h-[100vh] min-h-[550px] bg-zinc-950 flex flex-col justify-end p-6 -mt-16 pb-6 animate-pulse border-b border-white/5 overflow-hidden select-none">
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/70 pointer-events-none" />
      <div className="relative z-30 max-w-[1920px] w-full mx-auto space-y-4">
        {/* Badges row */}
        <div className="flex items-center gap-2">
          <div className="h-6 w-16 bg-amber-500/20 rounded-full" />
          <div className="h-6 w-12 bg-zinc-800/80 rounded-full" />
          <div className="h-6 w-14 bg-zinc-800/80 rounded-full" />
          <div className="h-6 w-24 bg-zinc-800/80 rounded-full" />
        </div>
        {/* Main title */}
        <div className="h-12 sm:h-16 lg:h-20 w-3/4 max-w-2xl bg-zinc-800/90 rounded-2xl" />
        {/* Description line */}
        <div className="h-4 w-1/2 max-w-md bg-zinc-900/90 rounded-md" />
        {/* Buttons */}
        <div className="flex items-center gap-4 pt-3">
          <div className="h-12 sm:h-14 w-44 bg-white/20 rounded-3xl" />
          <div className="h-12 sm:h-14 w-40 bg-zinc-800/80 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

export function CinemaRowSkeleton({ title }: { title?: string }) {
  return (
    <div className="space-y-3 w-full select-none">
      {title ? (
        <div className="h-7 w-48 bg-zinc-900/90 rounded-xl animate-pulse" />
      ) : (
        <div className="h-7 w-56 bg-zinc-900/90 rounded-xl animate-pulse" />
      )}
      <div className="flex items-center gap-3 overflow-hidden -mx-3 px-3 lg:-mx-6 lg:px-6 py-3 select-none">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex-none w-40 sm:w-56 aspect-[2/3] rounded-3xl bg-zinc-950 border border-white/10 animate-pulse relative overflow-hidden flex flex-col justify-between p-3 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-12 bg-amber-500/20 rounded-full" />
              {i % 2 === 0 && <div className="h-5 w-16 bg-indigo-500/20 rounded-full" />}
            </div>
            <div className="space-y-1.5 z-10">
              <div className="h-4 w-4/5 bg-zinc-800/80 rounded-md" />
              <div className="flex justify-between items-center">
                <div className="h-3 w-1/3 bg-zinc-800/50 rounded-md" />
                <div className="h-3 w-1/3 bg-zinc-800/40 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CinemaPageSkeleton() {
  return (
    <div className="w-full min-h-screen bg-black select-none font-sans">
      <CinemaHeroSkeleton />
      <main className="w-full px-3 lg:px-6 space-y-6 lg:space-y-12 mt-6">
        <CinemaRowSkeleton />
        <CinemaRowSkeleton />
        <CinemaRowSkeleton />
      </main>
    </div>
  );
}

export function CinemaGridSkeleton() {
  return (
    <div className="w-full px-3 lg:px-6 py-6 space-y-6 max-w-[1920px] mx-auto select-none">
      <div className="h-8 w-48 bg-zinc-900/90 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="w-full aspect-[2/3] rounded-3xl bg-zinc-950 border border-white/10 animate-pulse relative overflow-hidden flex flex-col justify-between p-3 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-12 bg-amber-500/20 rounded-full" />
              {i % 3 === 0 && <div className="h-5 w-16 bg-indigo-500/20 rounded-full" />}
            </div>
            <div className="space-y-1.5 z-10">
              <div className="h-4 w-4/5 bg-zinc-800/80 rounded-md" />
              <div className="flex justify-between items-center">
                <div className="h-3 w-1/3 bg-zinc-800/50 rounded-md" />
                <div className="h-3 w-1/3 bg-zinc-800/40 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CinemaInfoSkeleton() {
  return (
    <div className="w-full min-h-screen bg-black select-none font-sans">
      {/* Hero section skeleton */}
      <div className="relative w-full h-[65vh] min-h-[450px] bg-zinc-950 flex flex-col justify-end p-6 -mt-16 pb-10 animate-pulse border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/70 pointer-events-none" />
        <div className="max-w-[1920px] w-full mx-auto space-y-4 z-10 px-3">
          <div className="flex items-center gap-3">
            <div className="h-6 w-16 bg-amber-500/20 rounded-full" />
            <div className="h-6 w-12 bg-zinc-800/60 rounded-full" />
            <div className="h-6 w-14 bg-zinc-800/60 rounded-full" />
            <div className="h-6 w-20 bg-zinc-800/60 rounded-full" />
          </div>
          <div className="h-14 sm:h-18 w-3/4 max-w-3xl bg-zinc-800/90 rounded-2xl" />
          <div className="h-4 w-1/3 max-w-sm bg-zinc-900/90 rounded-md" />

          <div className="flex gap-4 pt-4">
            <div className="h-12 w-44 bg-white/20 rounded-3xl" />
            <div className="h-12 w-12 bg-zinc-900/80 rounded-full" />
          </div>
        </div>
      </div>

      {/* Body details skeleton */}
      <div className="w-full px-3 lg:px-6 pt-6 space-y-8 max-w-[1920px] mx-auto animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-4 w-full bg-zinc-900 rounded-md" />
            <div className="h-4 w-11/12 bg-zinc-900 rounded-md" />
            <div className="h-4 w-4/5 bg-zinc-900 rounded-md" />
            <div className="h-4 w-3/4 bg-zinc-900 rounded-md" />

            <div className="flex gap-3 pt-4">
              <div className="h-8 w-20 bg-zinc-800/80 rounded-full" />
              <div className="h-8 w-24 bg-zinc-800/80 rounded-full" />
              <div className="h-8 w-16 bg-zinc-800/80 rounded-full" />
            </div>
          </div>

          <div className="space-y-4 bg-zinc-950 p-6 rounded-3xl border border-white/10">
            <div>
              <div className="h-3 w-16 bg-zinc-800/80 rounded-md mb-2" />
              <div className="h-4 w-32 bg-zinc-700/80 rounded-md" />
            </div>
            <div>
              <div className="h-3 w-24 bg-zinc-800/80 rounded-md mb-2" />
              <div className="h-4 w-48 bg-zinc-700/80 rounded-md" />
              <div className="h-4 w-40 bg-zinc-700/80 rounded-md mt-1" />
            </div>
          </div>
        </div>

        <div className="pt-6">
          <CinemaRowSkeleton title="Похожие" />
        </div>
      </div>
    </div>
  );
}
