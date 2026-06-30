'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { AncialAPI } from '../../lib/api-v2';
import type { PostData } from '../../components/posts-renderer';

type PostPreviewProps = {
  postId: string | number;
  onLoadSuccess?: () => void;
};

export default function PostPreview({ postId, onLoadSuccess }: PostPreviewProps) {
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const cached = localStorage.getItem(`preview_post_${postId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (isMounted) {
          setPost(parsed);
          setLoading(false);
          onLoadSuccess?.();
        }
      } catch (e) {
        // ignore
      }
    }

    AncialAPI.getPost<PostData>(postId)
      .then((data) => {
        if (isMounted) {
          if (data && data.id) {
            setPost(data);
            localStorage.setItem(`preview_post_${postId}`, JSON.stringify(data));
            if (!cached) {
              onLoadSuccess?.();
            }
          } else {
            if (!cached) setError(true);
          }
        }
      })
      .catch(() => {
        if (isMounted && !cached) setError(true);
      })
      .finally(() => {
        if (isMounted && !cached) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  if (error) {
    return null;
  }

  if (loading) {
    return (
      <div className="block w-[300px] max-w-full rounded-2xl bg-zinc-900/40 border border-zinc-700/30 p-1.5 hover:bg-zinc-800/40 duration-300 shadow">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-zinc-800" />
          <div className="w-24 h-4 rounded bg-zinc-800" />
        </div>
        <div className="w-full h-16 rounded-xl bg-zinc-800" />
      </div>
    );
  }

  if (!post) return null;

  return (
    <Link href={`/feed/post/${post.id}`} className="block w-[300px] max-w-full rounded-2xl bg-zinc-900/40 border border-zinc-700/30 p-1.5 hover:bg-zinc-800/40 duration-300 shadow">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Image
            src={post.author?.img || '/img/noimg.png'}
            alt={post.author?.name || 'Author'}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full object-cover"
          />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-200 line-clamp-1">{post.author?.name}</span>
            <span className="text-[10px] text-zinc-500">{post.time_elapsed || '...'}</span>
          </div>
        </div>

        {post.title && <span className="text-sm font-bold text-purple-300 line-clamp-2">{post.title}</span>}

        {post.images && post.images.length > 0 && (
          <div className="w-full h-32 rounded-xl overflow-hidden relative">
            <Image
              src={post.images[0].url}
              alt="Post preview"
              fill
              className="object-cover"
            />
          </div>
        )}

        {post.content && (!post.images || post.images.length === 0) && (
          <p className="text-xs text-zinc-300 line-clamp-3" dangerouslySetInnerHTML={{ __html: post.content }} />
        )}
      </div>
    </Link>
  );
}
