import type { Metadata } from 'next';

import UserProfileContent from './profile-content';
import { createPageMetadata } from '../../seo';

type ProfilePageProps = {
  params: Promise<{
    login: string;
  }>;
};

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { login } = await params;
  const profileHandle = login.trim() || 'profile';

  return createPageMetadata({
    canonical: `/@${encodeURIComponent(profileHandle)}`,
    description: `Профиль @${profileHandle} в Ancial.`,
    openGraph: {
      type: 'profile',
    },
    title: `@${profileHandle}`,
  });
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { login } = await params;

  return <UserProfileContent login={login} />;
}
