import type { Metadata } from 'next';

import SinglePostContent from './post-content';
import type { PostData } from '../../../components/posts-renderer';

interface SinglePostResponse {
  data?: PostData;
  error?: string;
  success?: boolean;
}

const FALLBACK_TITLE = 'Неизвестная запись';
const FALLBACK_DESCRIPTION =
  'Мы не знаем кто и что, но у нас есть и другие посты! Смотрите их в ленте.';

function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function getApiBaseUrl() {
  return trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL || 'https://ancial.ru');
}

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
    const response = await fetch(`${getApiBaseUrl()}/api/posts/get_post.php?id=${id}`, {
      cache: 'no-store',
      credentials: 'include',
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
    const canonicalUrl = `https://ancial.ru/feed/post/${id}`;

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
      },
      title,
      twitter: {
        card: firstImage ? 'summary_large_image' : 'summary',
        description,
        images: firstImage ? [firstImage] : undefined,
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

export default async function SinglePostPage({ params }: SinglePostPageProps) {
  const { id } = await params;

  return <SinglePostContent postId={id} />;
}
