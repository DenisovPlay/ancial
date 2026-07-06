import type { Metadata } from 'next';
import { Suspense } from 'react';
import { createPageMetadata } from './seo';
import HomeContent from './home-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Ancial - Социальная сеть для общения и развлечений',
  description: 'Добро пожаловать в Ancial — социальную сеть с лентой новостей, сообщениями, звонками, музыкой, играми и кошельком.',
  keywords: ['главная', 'лента', 'социальная сеть', 'Ancial'],
  canonical: '/',
});

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-[#09090b]" />}>
      <HomeContent />
    </Suspense>
  );
}
