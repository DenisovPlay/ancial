import type { Metadata } from 'next';
import { createPageMetadata } from '../../seo';
import InviteContent from './invite-content';

type InvitePageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({
  params,
}: InvitePageProps): Promise<Metadata> {
  const { code } = await params;

  return createPageMetadata({
    canonical: `/invite/${encodeURIComponent(code)}`,
    description: 'Приглашение в беседу Zypo.',
    title: 'Приглашение в беседу',
  });
}



export default function InvitePage() {
  return <InviteContent />;
}

export function generateStaticParams() {
  return [{ code: "default" }];
}
