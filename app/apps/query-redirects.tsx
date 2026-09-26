'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/** Приложение: /apps/search?q= → /apps?q= (на сайте это делает серверный redirect). */
export function AppsSearchRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  useEffect(() => {
    router.replace(`/apps?q=${query ?? ''}`);
  }, [query, router]);
  return null;
}

/** Приложение: /apps/overlay?gm= → /apps/overlay/<gm> (на сайте это делает серверный redirect). */
export function AppsOverlayRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const game = searchParams.get('gm');
  useEffect(() => {
    router.replace(game ? `/apps/overlay/${encodeURIComponent(game)}` : '/apps');
  }, [game, router]);
  return null;
}
