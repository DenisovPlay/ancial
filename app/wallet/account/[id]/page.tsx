import type { Metadata } from 'next';
import AccountContent from './account-content';
import { createPageMetadata } from '../../../seo';

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    canonical: `/wallet/account`,
    description: `Переводы, оплата услуг и товаров, пополнение баланса и другое.`,
    title: `Счёт`,
  });
}

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AccountPage({ params }: PageProps) {
  const { id } = await params;
  return <AccountContent accountId={parseInt(id, 10)} />;
}
