'use client';

import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/cn';

const SIZES = { sm: 'h-8', md: 'h-12', lg: 'h-16' } as const;

/**
 * Единый индикатор загрузки страницы/блока: логотип Zypo с бегущей белой полосой (стили — .brand-loader).
 * Один на экран: у страниц, поделённых на блоки со скелетонами, остаются скелетоны. В кнопках — мини-крутилка.
 * `screen` — по центру всего экрана, `page` — по центру области страницы (заглушки Suspense целых страниц).
 */
export default function BrandLoader({ className, page = false, screen = false, size = 'md' }: { className?: string; page?: boolean; screen?: boolean; size?: keyof typeof SIZES }) {
  const { lang } = useAuth();
  const loader = <span role="status" aria-label={lang?.['loading...'] || 'Загрузка...'} className={cn('brand-loader', SIZES[size], className)} />;
  if (screen) return <div className="flex min-h-dvh w-full items-center justify-center">{loader}</div>;
  if (page) return <div className="flex min-h-[calc(100dvh-5rem)] lg:min-h-dvh w-full items-center justify-center">{loader}</div>;
  return loader;
}
