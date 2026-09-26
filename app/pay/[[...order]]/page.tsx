import type { Metadata } from 'next';
import { Suspense } from 'react';
import PayContent from '../pay-content';
import { createPageMetadata } from '../../seo';
import { IS_NATIVE_APP } from '../../lib/platform';
import { appShellStaticParams } from '../../lib/app-shell-params';

// Приложение: базовая страница /pay/ обслуживает любой заказ, номер берётся из адреса.
export const generateStaticParams = appShellStaticParams({ order: 'optionalCatchAll' });

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    canonical: `/pay`,
    description: `Оплата услуг и товаров через Zypo Pay.`,
    title: `Платёж`,
  });
}

export default function PayPage() {
  return (
    <Suspense fallback={null}>
      {/* Приложение: оплата открывается на сайте в системном браузере (AppRuntime) — здесь ничего. */}
      {IS_NATIVE_APP ? null : <PayContent />}
    </Suspense>
  );
}
