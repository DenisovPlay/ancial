import { Suspense } from 'react';

import LyricsContent from './lyrics-content';
import Icon from '../../../components/svg-icon';

// Трек берётся из ?id= через useSearchParams — статическая генерация дала бы расхождение гидратации.
export const dynamic = 'force-dynamic';

export default function PulseCreateLyricsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center p-6">
          <Icon name="IC-loader" className="inline h-8 w-8 animate-spin fill-zinc-500" />
        </div>
      }
    >
      <LyricsContent />
    </Suspense>
  );
}
