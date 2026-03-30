import type { Metadata } from 'next';
import { Suspense } from 'react';

import FeedContent from './feed-content';

export const metadata: Metadata = {
  title: 'Лента',
  description: 'Заметки прекрасных людей.',
};

function FeedPostSkeleton() {
  return (
    <div className="loading-skeleton border border-zinc-600/30 p-3 duration-300 rounded-3xl bg-zinc-900 flex flex-col w-full shadow gap-1.5">
      <div className="flex items-center gap-1.5">
        <div className="w-10 h-10 rounded-2xl shadow animate-pulse bg-zinc-700"></div>
        <div className="flex flex-col gap-1">
          <span className="bg-zinc-700 animate-pulse rounded-md h-5 w-16"></span>
          <span className="bg-zinc-700 animate-pulse rounded-md h-4 w-12"></span>
        </div>
      </div>
      <div className="bg-zinc-700 animate-pulse h-8 w-32 rounded-md"></div>
      <div className="bg-zinc-700 animate-pulse h-6 w-64 rounded-md"></div>
      <div className="animate-pulse bg-zinc-700 h-5 w-56 rounded-md"></div>
    </div>
  );
}

function FeedFallback() {
  return (
    <div className="flex flex-col jusitify-center items-center gap-3">
      <div className="max-w-3xl w-full items-center gap-1.5 flex pt-3 px-3 md:px-0 -mb-3">
        <span className="text-3xl font-extralight">Лента</span>
      </div>

      <div className="max-w-3xl w-full flex items-center justify-center sticky top-0 bg-gradient-to-b from-black via-black/90 to-transparent z-[25]">
        <div className="overflow-auto p-3 md:px-0 flex rounded-b-xl duration-300 w-full">
          <div className="flex flex-row flex-nowrap gap-3">
            <div className="w-32 h-12 rounded-full bg-zinc-900 animate-pulse border border-zinc-600/30 shrink-0"></div>
            <div className="w-28 h-12 rounded-full bg-zinc-900 animate-pulse border border-zinc-600/30 shrink-0"></div>
            <div className="w-24 h-12 rounded-full bg-zinc-900 animate-pulse border border-zinc-600/30 shrink-0"></div>
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col gap-3 justify-center items-center -mt-3">
        <div className="max-w-3xl w-full flex flex-col gap-3 px-3 md:px-0">
          <FeedPostSkeleton />
          <FeedPostSkeleton />
          <FeedPostSkeleton />
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<FeedFallback />}>
      <FeedContent />
    </Suspense>
  );
}
