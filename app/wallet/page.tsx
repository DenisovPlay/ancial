import type { Metadata } from 'next';
import WalletContent from './wallet-content';
import { createPageMetadata } from '../seo';

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    canonical: `/wallet`,
    description: `Переводы, оплата услуг и товаров, пополнение баланса и другое.`,
    title: `Кошелёк`,
  });
}

export default function WalletPage() {
  return <WalletContent />;
}
