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
    <div className="relative w-full h-[75vh] min-h-[500px] bg-zinc-950 flex flex-col justify-end p-6 -mt-24 pb-20 animate-pulse border-b border-white/5">
      <div className="max-w-[1920px] w-full mx-auto space-y-4">
        <div className="h-6 w-24 bg-zinc-800 rounded-full" />
        <div className="h-16 w-3/4 max-w-2xl bg-zinc-800 rounded-2xl" />
        <div className="h-4 w-1/2 max-w-md bg-zinc-900 rounded-md" />
        <div className="h-4 w-2/3 max-w-lg bg-zinc-900 rounded-md" />
        <div className="flex gap-4 pt-4">
          <div className="h-14 w-40 bg-zinc-800 rounded-3xl" />
          <div className="h-14 w-40 bg-zinc-900 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

export function CinemaRowSkeleton({ title }: { title?: string }) {
  return (
    <div className="space-y-3 w-full">
      {title && <div className="h-7 w-48 bg-zinc-900 rounded-xl animate-pulse" />}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="w-full aspect-[2/3] rounded-3xl bg-zinc-950 border border-white/5 animate-pulse flex flex-col justify-end p-4 space-y-2 shadow-xl"
          >
            <div className="h-4 w-4/5 bg-zinc-800/80 rounded-md" />
            <div className="h-3 w-2/5 bg-zinc-800/40 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CinemaPageSkeleton() {
  return (
    <div className="w-full min-h-screen bg-black">
      <CinemaHeroSkeleton />
      <div className="space-y-12 max-w-[1920px] mx-auto -mt-12 relative z-10">
        <CinemaRowSkeleton />
        <CinemaRowSkeleton />
      </div>
    </div>
  );
}

export function CinemaGridSkeleton() {
  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="w-full aspect-[2/3] rounded-3xl bg-zinc-950 border border-white/5 animate-pulse flex flex-col justify-end p-4 space-y-2 shadow-xl"
          >
            <div className="h-4 w-4/5 bg-zinc-800/80 rounded-md" />
            <div className="h-3 w-2/5 bg-zinc-800/40 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CinemaInfoSkeleton() {
  return (
    <div className="w-full min-h-screen bg-black">
      {/* Hero section skeleton */}
      <div className="relative w-full h-[65vh] bg-zinc-950 flex flex-col justify-end p-6 -mt-24 pb-12 animate-pulse border-b border-white/5">
        <div className="max-w-[1920px] w-full mx-auto space-y-4 z-10 px-3">
          <div className="flex gap-3">
            <div className="h-6 w-16 bg-zinc-800 rounded-md" />
            <div className="h-6 w-12 bg-zinc-800/50 rounded-md" />
            <div className="h-6 w-12 bg-zinc-800/50 rounded-md" />
            <div className="h-6 w-20 bg-zinc-800/50 rounded-md" />
          </div>
          <div className="h-16 w-3/4 max-w-3xl bg-zinc-800 rounded-2xl" />
          <div className="h-4 w-1/3 max-w-sm bg-zinc-900 rounded-md" />

          <div className="flex gap-4 pt-4">
            <div className="h-12 w-40 bg-zinc-800 rounded-3xl" />
          </div>
        </div>
      </div>

      {/* Body details skeleton */}
      <div className="w-full px-6 pt-6 space-y-8 max-w-[1920px] mx-auto animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="h-4 w-full bg-zinc-900 rounded-md" />
            <div className="h-4 w-11/12 bg-zinc-900 rounded-md" />
            <div className="h-4 w-4/5 bg-zinc-900 rounded-md" />
            <div className="h-4 w-3/4 bg-zinc-900 rounded-md" />

            <div className="flex gap-3 pt-4">
              <div className="h-8 w-20 bg-zinc-800 rounded-full" />
              <div className="h-8 w-24 bg-zinc-800 rounded-full" />
              <div className="h-8 w-16 bg-zinc-800 rounded-full" />
            </div>
          </div>

          <div className="space-y-4 bg-zinc-950 p-6 rounded-3xl border border-white/5">
            <div>
              <div className="h-3 w-16 bg-zinc-800 rounded-md mb-2" />
              <div className="h-4 w-32 bg-zinc-700 rounded-md" />
            </div>
            <div>
              <div className="h-3 w-24 bg-zinc-800 rounded-md mb-2" />
              <div className="h-4 w-48 bg-zinc-700 rounded-md" />
              <div className="h-4 w-40 bg-zinc-700 rounded-md mt-1" />
            </div>
          </div>
        </div>

        <div className="pt-8">
          <CinemaRowSkeleton title="Похожие" />
        </div>
      </div>
    </div>
  );
}
