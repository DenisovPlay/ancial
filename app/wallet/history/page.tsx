import type { Metadata } from 'next';
import HistoryContent from './history-content';
import { createPageMetadata } from '../../seo';

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    canonical: `/wallet/history`,
    description: `Переводы, оплата услуг и товаров, пополнение баланса и другое.`,
    title: `История транзакций`,
  });
}

export default function HistoryPage() {
  return <HistoryContent />;
}
