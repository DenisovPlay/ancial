import type { Metadata } from 'next';

import UserProfileContent from './profile-content';
import { SITE_CONFIG } from '../../seo';

interface UserFriendButton {
  action?: string | null;
  relation_id?: string | number | null;
  status?: string | number | null;
  target_id?: string | number | null;
}

interface UserPreview {
  fname?: string | null;
  id: string | number;
  img?: string | null;
  lname?: string | null;
  online?: boolean | number | string | null;
  username?: string | null;
}

interface GroupPreview {
  id: string | number;
  img?: string | null;
  name?: string | null;
  slnk?: string | null;
}

interface UserPageData {
  active?: boolean | number | string | null;
  cover?: string | null;
  description?: string | null;
  fname?: string | null;
  friend_button?: UserFriendButton | null;
  friends?: UserPreview[] | null;
  groups?: GroupPreview[] | null;
  id: string | number;
  img?: string | null;
  is_owner?: boolean | number | string | null;
  lname?: string | null;
  login?: string | null;
  online?: boolean | number | string | null;
  subscribers?: UserPreview[] | null;
  verify?: boolean | number | string | null;
}

interface UserPageResponse {
  data?: UserPageData;
  error?: string;
  success?: boolean;
}

const FALLBACK_TITLE = 'Пользователь не найден';
const FALLBACK_DESCRIPTION = 'Такого пользователя не существует или он удалён.';

function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

type ProfilePageProps = {
  params: Promise<{
    login: string;
  }>;
};

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { login } = await params;

  try {
    const response = await fetch(
      `/api/user/get_user_page.php?login=${encodeURIComponent(login)}`,
      {
        cache: 'no-store',
        credentials: 'include',
      },
    );

    if (!response.ok) {
      throw new Error(`Metadata request failed with status ${response.status}`);
    }

    const result = (await response.json()) as UserPageResponse;
    const profile = result.success ? result.data : null;

    if (!profile) {
      return {
        description: FALLBACK_DESCRIPTION,
        title: FALLBACK_TITLE,
      };
    }

    const title = `${profile.fname || ''} ${profile.lname || ''} (@${profile.login || login})`.trim();
    const description = `${profile.login || login} и другие уже общаются в Ancial!`;
    const image = profile.img || undefined;
    const canonicalUrl = `${SITE_CONFIG.url}/@${encodeURIComponent(profile.login || login)}`;

    return {
      alternates: {
        canonical: canonicalUrl,
      },
      description,
      openGraph: {
        description,
        images: image ? [image] : undefined,
        title,
        url: canonicalUrl,
        type: 'profile',
        siteName: SITE_CONFIG.title,
      },
      title,
      twitter: {
        card: image ? 'summary_large_image' : 'summary',
        description,
        images: image ? [image] : undefined,
        title,
        creator: SITE_CONFIG.twitter,
      },
    };
  } catch {
    return {
      description: FALLBACK_DESCRIPTION,
      title: FALLBACK_TITLE,
    };
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { login } = await params;

  return <UserProfileContent login={login} />;
}
