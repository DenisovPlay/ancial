'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AppsOverlayRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const game = searchParams.get('gm');
    if (game) {
      router.replace(`/apps/overlay/${encodeURIComponent(game)}`);
    } else {
      router.replace('/apps');
    }
  }, [router, searchParams]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
    </div>
  );
}

export default function AppsOverlayPage() {
  return (
    <Suspense fallback={null}>
      <AppsOverlayRedirect />
    </Suspense>
  );
}
