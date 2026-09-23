import { Suspense } from 'react';

import UploadContent from './upload-content';
import Icon from '../../../components/svg-icon';

// UploadContent's initial mode (single/album) depends directly on useSearchParams;
// static generation causes a hydration mismatch in prod when the URL carries real query params.
export const dynamic = 'force-dynamic';

export default function PulseCreateUploadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center p-6">
          <Icon name="IC-loader" className="inline h-8 w-8 animate-spin fill-zinc-500" />
        </div>
      }
    >
      <UploadContent />
    </Suspense>
  );
}
