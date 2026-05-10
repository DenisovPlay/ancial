'use client';

import { useEffect } from 'react';

const SITE_TITLE = 'Ancial';

export function buildDocumentTitle(title: string | null | undefined) {
  const normalizedTitle = (title ?? '').trim();
  if (!normalizedTitle) return null;
  return `${normalizedTitle} | ${SITE_TITLE}`;
}

export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    const nextTitle = buildDocumentTitle(title);
    if (!nextTitle) return;

    document.title = nextTitle;
  }, [title]);
}
