import type { Metadata } from 'next';

import { createPageMetadata } from '../../../seo';
import { redirect } from 'next/navigation';

type AppsCategoryPageProps = {
  params: Promise<{ category: string }>;
};

export async function generateMetadata({
  params,
}: AppsCategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const decodedCategory = decodeURIComponent(category);

  return createPageMetadata({
    canonical: `/apps/category/${encodeURIComponent(decodedCategory)}`,
    description: `Игры в категории ${decodedCategory}.`,
    title: decodedCategory,
  });
}

export default async function AppsCategoryPage({
  params,
}: AppsCategoryPageProps) {
  const { category } = await params;
  
  redirect(`/apps?category=${category}`);
}
