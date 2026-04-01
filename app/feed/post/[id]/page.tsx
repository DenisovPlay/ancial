import type { Metadata } from 'next';

import SinglePostContent from './post-content';
import type { PostData } from '../../../components/posts-renderer';
import { SITE_CONFIG } from '../../../seo';
import { getRequestUrl } from '../../../server-origin';

interface SinglePostResponse {
  data?: PostData;
  error?: string;
  success?: boolean;
}

const FALLBACK_TITLE = 'Неизвестная запись';
const FALLBACK_DESCRIPTION =
  'Мы не знаем кто и что, но у нас есть и другие посты! Смотрите их в ленте.';

function htmlToText(value: string | null | undefined) {
  return (value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}

type SinglePostPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: SinglePostPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const response = await fetch(await getRequestUrl(`/api/posts/get_post.php?id=${id}`), {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Metadata request failed with status ${response.status}`);
    }

    const result = (await response.json()) as SinglePostResponse;
    const post = result.success ? result.data : null;

    if (!post) {
      return {
        description: FALLBACK_DESCRIPTION,
        title: FALLBACK_TITLE,
      };
    }

    const authorName = post.author?.name?.trim() || 'Неизвестного автора';
    const plainContent = htmlToText(post.content);
    const title = post.title?.trim() || `Пост от ${authorName}`;
    const description = plainContent
      ? `Запись от ${authorName}: ${truncate(plainContent, 50)} Смотрите другие посты в ленте!`
      : `Запись от ${authorName}. Смотрите другие посты в ленте!`;
    const firstImage = post.images?.[0]?.url;
    const canonicalUrl = `${SITE_CONFIG.url}/feed/post/${id}`;

    return {
      alternates: {
        canonical: canonicalUrl,
      },
      description,
      openGraph: {
        description,
        images: firstImage ? [firstImage] : undefined,
        title,
        type: 'article',
        url: canonicalUrl,
        siteName: SITE_CONFIG.title,
      },
      twitter: {
        card: firstImage ? 'summary_large_image' : 'summary',
        description,
        images: firstImage ? [firstImage] : undefined,
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

export default async function SinglePostPage({ params }: SinglePostPageProps) {
  const { id } = await params;

  return <SinglePostContent postId={id} />;
}
