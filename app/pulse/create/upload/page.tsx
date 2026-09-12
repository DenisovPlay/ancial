import { Suspense } from 'react';

import UploadContent from './upload-content';
import { ActionIcon } from '../../pulse-components';

// UploadContent's initial mode (single/album) depends directly on useSearchParams;
// static generation causes a hydration mismatch in prod when the URL carries real query params.
export const dynamic = 'force-dynamic';

export default function PulseCreateUploadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full items-center justify-center p-6">
          <ActionIcon className="h-8 w-8 animate-spin fill-zinc-500" name="IC-loader" />
        </div>
      }
    >
      <UploadContent />
    </Suspense>
  );
}
