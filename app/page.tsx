import type { Metadata } from 'next';
import { Suspense } from 'react';
import { createPageMetadata } from './seo';
import HomeContent from './home-content';
import { connection } from 'next/server';
import { IS_NATIVE_APP } from './lib/platform';

export const metadata: Metadata = createPageMetadata({
  title: 'Zypo - Социальная сеть для общения и развлечений',
  description: 'Добро пожаловать в Zypo — социальную сеть с лентой новостей, сообщениями, звонками, музыкой, играми и кошельком.',
  keywords: ['главная', 'лента', 'социальная сеть', 'Ancial'],
  canonical: '/',
});

// HomeContent's render depends on useSearchParams (q); static generation causes
// a hydration mismatch in prod when the URL carries real query params.

export default async function Home() {
  // Сайт рендерит страницу на каждый запрос (раньше — dynamic = 'force-dynamic', литерал не даёт
  // собрать статический экспорт приложения). В приложении сервера нет — страница статическая.
  if (!IS_NATIVE_APP) await connection();
  return (
    <Suspense fallback={<div className="h-screen w-full" />}>
      <HomeContent />
    </Suspense>
  );
}
