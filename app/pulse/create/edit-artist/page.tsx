import { Suspense } from 'react';

import EditArtistContent from './edit-artist-content';

// EditArtistContent's title/button text depend directly on useSearchParams (id);
// static generation causes a hydration mismatch in prod when the URL carries real query params.
export const dynamic = 'force-dynamic';

export default function PulseCreateEditArtistPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center p-6">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      }
    >
      <EditArtistContent />
    </Suspense>
  );
}
