import type { Metadata } from 'next';
import { Suspense } from 'react';
import PayContent from '../pay-content';
import { createPageMetadata } from '../../seo';

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    canonical: `/pay`,
    description: `Оплата услуг и товаров через Ancial Pay.`,
    title: `Платёж`,
  });
}

export default function PayPage() {
  return (
    <Suspense fallback={null}>
      <PayContent />
    </Suspense>
  );
}
