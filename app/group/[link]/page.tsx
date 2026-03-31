import type { Metadata } from 'next';

import GroupProfileContent from './group-content';

interface UserPreview {
  fname?: string | null;
  id: string | number;
  img?: string | null;
  lname?: string | null;
  online?: boolean | number | string | null;
  username?: string | null;
}

interface OfficialGroupPreview {
  id: string | number;
  img?: string | null;
  name?: string | null;
  slnk?: string | null;
}

interface GroupPageData {
  cover?: string | null;
  creator?: string | number | null;
  description?: string | null;
  id: string | number;
  img?: string | null;
  is_creator?: boolean | number | string | null;
  is_subscribed?: boolean | number | string | null;
  name?: string | null;
  official_groups?: OfficialGroupPreview[] | null;
  slnk?: string | null;
  status?: boolean | number | string | null;
  subscribers?: UserPreview[] | null;
  verify?: boolean | number | string | null;
}

interface GroupPageResponse {
  blocked?: boolean;
  data?: GroupPageData;
  error?: string;
  success?: boolean;
}

const FALLBACK_TITLE = 'Группа не найдена';
const FALLBACK_DESCRIPTION = 'Такой группы не существует или она удалена.';

function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function getApiBaseUrl() {
  return trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL || 'https://ancial.ru');
}

type GroupPageProps = {
  params: Promise<{
    link: string;
  }>;
};

export async function generateMetadata({ params }: GroupPageProps): Promise<Metadata> {
  const { link } = await params;

  try {
    const response = await fetch(
      `${getApiBaseUrl()}/api/group/get_group_page.php?link=${encodeURIComponent(link)}`,
      {
        cache: 'no-store',
        credentials: 'include',
      },
    );

    if (!response.ok) {
      throw new Error(`Metadata request failed with status ${response.status}`);
    }

    const result = (await response.json()) as GroupPageResponse;
    const group = result.success ? result.data : null;

    if (!group) {
      return {
        description: FALLBACK_DESCRIPTION,
        title: FALLBACK_TITLE,
      };
    }

    const title = `${group.name || ''} ($${group.slnk || link})`.trim();
    const description = `${group.name || link} и другие уже кучкуются вместе в Ancial!`;
    const image = group.img || undefined;
    const canonicalUrl = `https://ancial.ru/$${encodeURIComponent(group.slnk || link)}`;

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
      },
      title,
      twitter: {
        card: image ? 'summary_large_image' : 'summary',
        description,
        images: image ? [image] : undefined,
        title,
      },
    };
  } catch {
    return {
      description: FALLBACK_DESCRIPTION,
      title: FALLBACK_TITLE,
    };
  }
}

export default async function GroupPage({ params }: GroupPageProps) {
  const { link } = await params;

  return <GroupProfileContent link={link} />;
}
