import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { createPageMetadata } from '../../../seo';
import { LEGAL_DOCS } from '../documents';
import LegalDocument from '../legal-document';

type LegalDocPageProps = {
  params: Promise<{ doc: string }>;
};

// Набор документов известен заранее: все страницы собираются статически (и в сборке приложения).
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(LEGAL_DOCS).map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: LegalDocPageProps): Promise<Metadata> {
  const { doc } = await params;
  const legalDoc = LEGAL_DOCS[doc];
  if (!legalDoc) return {};
  return createPageMetadata({
    title: legalDoc.title,
    description: legalDoc.summary,
    canonical: `/about/legal/${legalDoc.slug}`,
  });
}

export default async function LegalDocPage({ params }: LegalDocPageProps) {
  const { doc } = await params;
  const legalDoc = LEGAL_DOCS[doc];
  if (!legalDoc) notFound();
  return <LegalDocument doc={legalDoc} />;
}
