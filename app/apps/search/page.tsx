'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AppsSearchRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.get('q') || '';
    router.replace(`/apps?q=${encodeURIComponent(q)}`);
  }, [router, searchParams]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
    </div>
  );
}

export default function AppsSearchPage() {
  return (
    <Suspense fallback={null}>
      <AppsSearchRedirect />
    </Suspense>
  );
}
