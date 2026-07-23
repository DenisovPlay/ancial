'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Перехватывает клики по mention-ссылкам (<a data-user> / <a data-group>)
 * внутри переданного ref-контейнера и делает SPA-навигацию через router.push,
 * не позволяя браузеру выполнить полную перезагрузку страницы.
 *
 * Используется в местах с dangerouslySetInnerHTML, где Next.js Link недоступен.
 */
export function useMentionNavigation(ref: React.RefObject<HTMLElement | null>) {
  const router = useRouter();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: Event) => {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-user], a[data-group]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      e.preventDefault();
      e.stopPropagation();
      router.push(href);
    };
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [ref, router]);
}
