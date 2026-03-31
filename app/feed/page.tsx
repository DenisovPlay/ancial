import type { Metadata } from 'next';
import { Suspense } from 'react';

import FeedContent from './feed-content';
import FeedPostSkeleton from './feed-post-skeleton';

export const metadata: Metadata = {
  title: 'Лента',
  description: 'Заметки прекрасных людей.',
};

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
