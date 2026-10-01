'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../context/AuthContext';
import { useSanitizedHtml } from '../lib/use-sanitized-html';
import { formatRelativeTime } from '../lib/time';
import AccountName from './account-name';
import AppImage from './app-image';
import { Dropdown, DropdownItem } from './navigation';
import { parsePostContentToHtml } from './post-parser';
import Icon from './svg-icon';

export interface CommentCardData {
  content: string;
  date: string;
  id: string | number;
  is_own_comment?: boolean | number | string | null;
  reply_to?: { id: number; name: string; preview: string; username: string } | null;
  user: {
    img: string;
    is_verified?: boolean | number | string | null;
    name: string;
    username: string;
  };
}

function isTrue(value: boolean | number | string | null | undefined) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

/**
 * Карточка комментария — одна на модалку комментариев и страницу поста.
 * Действия (ответить / удалить своё / пожаловаться на чужое) собираются в меню «⋯»; если действие одно
 * (чужой комментарий без входа — только жалоба), вместо меню показывается обычная кнопка.
 */
export default function CommentCard<T extends CommentCardData>({
  comment,
  deleteLabel,
  onDelete,
  onLinkNavigate,
  onNavigateToUser,
  onReply,
  onReport,
  replyLabel,
  reportLabel,
}: {
  comment: T;
  deleteLabel: string;
  onDelete: (comment: T) => void;
  /** По умолчанию — router.push; модалка сначала закрывается. */
  onLinkNavigate?: (href: string) => void;
  onNavigateToUser: (username: string) => void;
  onReply?: (comment: T) => void;
  onReport: (comment: T) => void;
  replyLabel: string;
  reportLabel: string;
}) {
  const router = useRouter();
  const { lang } = useAuth();
  const contentRef = useRef<HTMLDivElement>(null);
  const commentHtml = useMemo(() => parsePostContentToHtml(comment.content), [comment.content]);
  const commentHtmlProps = useSanitizedHtml(commentHtml, true);
  const linkNavigateRef = useRef(onLinkNavigate);
  useEffect(() => {
    linkNavigateRef.current = onLinkNavigate;
  }, [onLinkNavigate]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-user], a[data-group]');
      const href = anchor?.getAttribute('href');
      if (!href) return;
      e.preventDefault();
      e.stopPropagation();
      (linkNavigateRef.current ?? router.push)(href);
    };
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [router]);

  const actions = [
    onReply ? { key: 'reply', icon: 'IC-reply', label: replyLabel, onClick: () => onReply(comment) } : null,
    isTrue(comment.is_own_comment)
      ? { key: 'delete', icon: 'IC-times', label: deleteLabel, onClick: () => onDelete(comment) }
      : { key: 'report', icon: 'IC-report', label: reportLabel, onClick: () => onReport(comment) },
  ].filter((action) => action !== null);

  return (
    <div
      id={`comment${comment.id}`}
      className="p-3 border border-zinc-600/30 duration-300 rounded-3xl bg-zinc-800/50 flex flex-col w-full shadow"
    >
      <div className="text-sm lg:text-base text-zinc-200 font-medium flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => onNavigateToUser(comment.user.username)}
          className="active:scale-95 duration-300 w-10 h-10 rounded-3xl shadow shrink-0 overflow-hidden cursor-pointer"
          aria-label={comment.user.name}
        >
          <AppImage width={40} height={40} src={comment.user.img} fallbackSrc="/img/placeholders/user.png" alt="" className="block h-full w-full object-cover" />
        </button>

        <div className="flex flex-col flex-grow min-w-0">
          <button
            type="button"
            onClick={() => onNavigateToUser(comment.user.username)}
            className="cursor-pointer hover:text-zinc-100 duration-300 font-medium text-left flex items-center gap-1.5 min-w-0"
          >
            <AccountName user={comment.user} nameClassName="font-medium" />
          </button>
          <span className="text-zinc-300 text-xs">{formatRelativeTime(comment.date, lang, comment.date)}</span>
        </div>

        {actions.length === 1 ? (
          <button
            type="button"
            data-tip={actions[0].label}
            aria-label={actions[0].label}
            onClick={actions[0].onClick}
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full cursor-pointer duration-300 active:scale-95 hover:bg-zinc-800/50"
          >
            <Icon name={actions[0].icon} className="w-5 h-5 fill-white" />
          </button>
        ) : (
          <Dropdown
            triggerSize="sm"
            triggerIcon="IC-more"
            triggerAriaLabel="Comment actions"
            position="left"
            align="start"
            triggerClassName="hover:bg-zinc-800/50"
            menuClassName="-mt-8 min-w-44 rounded-2xl"
          >
            {actions.map((action) => (
              <DropdownItem key={action.key} onClick={action.onClick} icon={action.icon} className="p-1 text-sm" iconClassName="w-5 h-5">
                {action.label}
              </DropdownItem>
            ))}
          </Dropdown>
        )}
      </div>

      {comment.reply_to ? (
        <button
          type="button"
          onClick={() => document.getElementById(`comment${comment.reply_to?.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          className="mt-3 flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-full border border-zinc-600/30 bg-zinc-900/60 px-3 py-1.5 text-left duration-300 hover:bg-zinc-900 active:scale-[0.99]"
        >
          <Icon name="IC-reply" className="h-4 w-4 shrink-0 fill-purple-300" />
          <span className="max-w-[40%] shrink-0 truncate text-sm font-semibold text-purple-300">{comment.reply_to.name}</span>
          {comment.reply_to.preview ? <span className="min-w-0 truncate text-sm text-zinc-400">{comment.reply_to.preview}</span> : null}
        </button>
      ) : null}

      <div
        ref={contentRef}
        className="mt-1.5 -mb-1.5 text-base lg:text-lg text-zinc-200 font-medium whitespace-pre-wrap break-words"
        dangerouslySetInnerHTML={commentHtmlProps}
      />
    </div>
  );
}

/** Плашка «Ответ для …» над полем ввода комментария. */
export function ReplyBar({ name, onCancel }: { name: string; onCancel: () => void }) {
  const { lang } = useAuth();
  return (
    <div className="mb-3 flex items-center gap-3 rounded-full border border-zinc-600/30 bg-zinc-800 p-1.5">
      <span className="min-w-0 flex-1 truncate text-sm text-zinc-300">
        <span className="text-purple-300">{lang?.comment_replying_to || 'Ответ для'}</span> {name}
      </span>
      <button
        type="button"
        aria-label={lang?.comment_reply_cancel || 'Отменить ответ'}
        onClick={onCancel}
        className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-zinc-700 active:scale-95 duration-300"
      >
        <Icon name="IC-times" className="h-4 w-4 fill-zinc-300" />
      </button>
    </div>
  );
}
