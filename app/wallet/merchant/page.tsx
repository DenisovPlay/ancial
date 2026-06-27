import type { Metadata } from 'next';
import MerchantContent from './merchant-content';
import { createPageMetadata } from '../../seo';

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    canonical: `/wallet/merchant`,
    description: `Переводы, оплата услуг и товаров, пополнение баланса и другое.`,
    title: `Панель мерчанта`,
  });
}

export default function MerchantPage() {
  return <MerchantContent />;
}
