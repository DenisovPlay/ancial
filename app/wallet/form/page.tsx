import type { Metadata } from 'next';
import FormContent from './form-content';
import { createPageMetadata } from '../../seo';

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    canonical: `/wallet/form`,
    description: `Переводы, оплата услуг и товаров, пополнение баланса и другое.`,
    title: `Платёжная форма`,
  });
}

export default function FormPage() {
  return <FormContent />;
}
