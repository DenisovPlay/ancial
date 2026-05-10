import type { Metadata } from 'next';

import GroupProfileContent from './group-content';
import { createPageMetadata } from '../../seo';

type GroupPageProps = {
  params: Promise<{
    link: string;
  }>;
};

export async function generateMetadata({ params }: GroupPageProps): Promise<Metadata> {
  const { link } = await params;
  const groupHandle = link.trim() || 'group';

  return createPageMetadata({
    canonical: `/$${encodeURIComponent(groupHandle)}`,
    description: `Сообщество $${groupHandle} в Ancial.`,
    title: `$${groupHandle}`,
  });
}

export default async function GroupPage({ params }: GroupPageProps) {
  const { link } = await params;

  return <GroupProfileContent link={link} />;
}
