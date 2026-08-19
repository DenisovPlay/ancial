import type { Metadata } from 'next';
import InfoContent from './info-content';
import { createPageMetadata } from '../../../seo';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;

  return createPageMetadata({
    title: 'Информация о фильме — Frame',
    description: 'Подробная информация о фильме или сериале на платформе Frame.',
    canonical: `/cinema/info/${id}`,
    robots: { index: false, follow: false },
  });
}

export default async function CinemaInfoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InfoContent id={id} />;
}

export function generateStaticParams() {
  return [{ id: "1" }];
}
