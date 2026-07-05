'use client';

import Link from 'next/link';

type QuoteAuthor = {
  type: 'user' | 'group';
  id: number | string;
  name: string;
  img: string;
  username?: string;
  slnk?: string;
};

type QuoteImage = {
  url: string;
};

export type QuoteWidgetData = {
  type: 'quote';
  post_id: number;
  quote_data: {
    id: number | string;
    content: string;
    author: QuoteAuthor;
    images: QuoteImage[];
    date?: string;
  } | null;
};

type PostWidgetQuoteProps = QuoteWidgetData;

export default function PostWidgetQuote({ post_id, quote_data }: PostWidgetQuoteProps) {
  const postHref = `/feed/post/${post_id}`;

  if (!quote_data) {
    return (
      <div className="mt-3 border border-zinc-700/40 rounded-2xl px-4 py-3 bg-zinc-800/30">
        <span className="text-zinc-500 text-sm">Запись недоступна</span>
      </div>
    );
  }

  const authorHref =
    quote_data.author.type === 'user'
      ? `/@${quote_data.author.username || quote_data.author.id}`
      : `/$${quote_data.author.slnk || quote_data.author.id}`;

  const firstImage = quote_data.images?.[0]?.url;

  return (
    <Link
      href={postHref}
      className="block mt-3 border border-zinc-700/60 rounded-3xl overflow-hidden bg-zinc-800/40 hover:bg-zinc-800/70 hover:border-zinc-600 transition-all duration-200 active:scale-[0.99]"
    >
      <div className="flex gap-3 p-2">
        <div className="flex-1 min-w-0">
          {/* Автор */}
          <div className="flex items-center gap-1.5 mb-1">
            <div
              className="w-7 h-7 rounded-full bg-cover bg-center shrink-0 border border-zinc-700/50"
              style={{ backgroundImage: `url(${quote_data.author.img || '/includes/img/anlite/default_avatar.png'})` }}
            />
            <span className="text-zinc-300 text-xs font-semibold truncate">{quote_data.author.name}</span>
          </div>
          {/* Текст */}
          {quote_data.content && (
            <p className="text-zinc-400 text-sm leading-snug line-clamp-3 break-words">
              {quote_data.content}
            </p>
          )}
        </div>
        {/* Первое фото */}
        {firstImage && (
          <div
            className="w-16 h-16 rounded-xl shrink-0 bg-cover bg-center bg-zinc-700"
            style={{ backgroundImage: `url(${firstImage})` }}
          />
        )}
      </div>
    </Link>
  );
}
