'use client';

import Link from 'next/link';
import { memo, useMemo } from 'react';

import AppImage from '../components/app-image';
import Icon from '../components/svg-icon';
import { cn } from '../lib/cn';
import { useSanitizedHtml } from '../lib/use-sanitized-html';
import { formatRelativeTime } from '../lib/time';
import {
  getKindMeta,
  notificationHref,
  notificationSegments,
  TONE_CLASSES,
  type Lang,
} from '../lib/notifications/kinds';
import type { NotificationActor, RichNotification } from '../lib/notifications/types';
import { parseStickersToHtml } from '../lib/stickers-service';
import TrackPreview from '../messages/components/track-preview';
import SecretSpoiler from './secret-spoiler';

const FALLBACK_AVATAR = '/img/placeholders/user.png';
const TRACK_URL = /(?:https?:\/\/[^\s/]+)?\/pulse\/track\/(\d+)\S*/i;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

/** Аватар актёра; у группы — стопка до трёх, у системных (безопасность, кошелёк без людей) — значок типа. */
function ActorAvatars({ notification }: { notification: RichNotification }) {
  const meta = getKindMeta(notification);
  const actors = notification.actors.slice(0, 3);
  const badge = (
    <span className={cn('absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-zinc-900', TONE_CLASSES[meta.tone])}>
      <Icon name={meta.icon} className="h-3.5 w-3.5 fill-white" />
    </span>
  );

  if (actors.length === 0) {
    return (
      <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full', TONE_CLASSES[meta.tone])}>
        <Icon name={meta.icon} className="h-6 w-6 fill-white" />
      </span>
    );
  }

  const avatar = (actor: NotificationActor, className: string) => (
    <AppImage
      key={`${actor.type}:${actor.id}`}
      width={48}
      height={48}
      src={actor.img || FALLBACK_AVATAR}
      fallbackSrc={FALLBACK_AVATAR}
      alt=""
      className={cn('rounded-full border-2 border-zinc-900 object-cover', className)}
    />
  );

  return (
    <span className="relative h-12 w-12 shrink-0">
      {actors.length === 1 ? (
        avatar(actors[0], 'h-12 w-12')
      ) : (
        <>
          {avatar(actors[0], 'absolute left-0 top-0 h-9 w-9 z-20')}
          {avatar(actors[1], 'absolute bottom-0 right-0 h-9 w-9 z-10')}
          {actors[2] ? avatar(actors[2], 'absolute bottom-0 left-0 h-6 w-6 z-30') : null}
        </>
      )}
      {badge}
    </span>
  );
}

/** Превью сообщения чата: стикер — картинкой, трек — карточкой, фото — миниатюрой, текст — как есть. */
function ChatPreview({ notification }: { notification: RichNotification }) {
  const text = notification.object?.preview ?? '';
  const media = notification.params.media;
  const trackId = TRACK_URL.exec(text)?.[1] ?? null;
  const plain = trackId ? text.replace(TRACK_URL, '').trim() : text;
  const html = useMemo(() => {
    if (!plain) return '';
    // Сообщение из одного стикера рисуем крупнее обычного текста, но не на пол-экрана.
    return parseStickersToHtml(escapeHtml(plain), media === 'sticker');
  }, [media, plain]);
  const htmlProps = useSanitizedHtml(html);

  return (
    <>
      {html ? (
        <div
          className="line-clamp-3 break-words text-sm text-zinc-300 [&_img]:max-h-16 [&_img]:rounded-2xl"
          dangerouslySetInnerHTML={htmlProps}
        />
      ) : null}
      {trackId ? <div className="pointer-events-auto max-w-full"><TrackPreview trackId={trackId} className="w-full max-w-sm" /></div> : null}
      {media === 'photo' && notification.object?.image ? (
        <AppImage
          width={160}
          height={160}
          src={notification.object.image}
          alt=""
          className="h-20 w-auto max-w-40 rounded-3xl border border-zinc-600/30 object-cover"
        />
      ) : null}
    </>
  );
}

interface NotificationRowProps {
  highlighted: boolean;
  lang: Lang;
  langCode?: string;
  notification: RichNotification;
  onAction: (notification: RichNotification, actionId: string) => void;
  onDelete: (notification: RichNotification) => void;
}

function NotificationRowComponent({ highlighted, lang, langCode, notification, onAction, onDelete }: NotificationRowProps) {
  const href = notificationHref(notification);
  const segments = notificationSegments(notification, lang, langCode);
  const plainText = segments.map((segment) => segment.text).join('');
  const isChat = notification.kind === 'chat_message';
  const preview = !isChat ? notification.object?.preview : null;
  const thumbnail = !isChat ? notification.object?.image : null;
  const time = notification.ts ? formatRelativeTime(new Date(notification.ts), lang, '') : '';
  const actionIds = new Set(notification.actions.map((action) => action.id));

  return (
    <li
      className={cn(
        'group relative flex w-full gap-3 rounded-3xl border p-3 shadow duration-300',
        highlighted ? 'border-purple-500/40 bg-purple-500/10' : 'border-zinc-600/30 bg-zinc-900/70',
        href && 'hover:bg-zinc-800/70 active:scale-[0.99]',
      )}
    >
      {href ? <Link href={href} aria-label={plainText} className="absolute inset-0 z-0 cursor-pointer rounded-3xl" /> : null}

      <div className="pointer-events-none relative z-10 flex w-full min-w-0 gap-3">
        <ActorAvatars notification={notification} />

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="break-words text-base leading-snug text-zinc-100 lg:text-lg">
            {segments.map((segment, index) => (segment.bold ? <b key={index} className="font-semibold text-white">{segment.text}</b> : <span key={index}>{segment.text}</span>))}
            {isChat && notification.params.chat ? <span className="text-zinc-500"> · {notification.params.chat}</span> : null}
          </p>

          {isChat ? <ChatPreview notification={notification} /> : null}
          {preview ? <p className="line-clamp-2 text-sm text-zinc-400">{preview}</p> : null}
          {notification.secret ? <SecretSpoiler notification={notification} lang={lang} /> : null}

          {actionIds.size > 0 ? (
            <div className="pointer-events-auto flex flex-wrap gap-3 pt-1">
              {actionIds.has('accept') ? (
                <button type="button" onClick={() => onAction(notification, 'accept')} className="cursor-pointer rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white duration-300 hover:bg-purple-500 active:scale-95">
                  {lang?.notif_accept || 'Принять'}
                </button>
              ) : null}
              {actionIds.has('decline') ? (
                <button type="button" onClick={() => onAction(notification, 'decline')} className="cursor-pointer rounded-full border border-zinc-600/30 bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 duration-300 hover:bg-zinc-700 active:scale-95">
                  {lang?.notif_decline || 'Отклонить'}
                </button>
              ) : null}
              {actionIds.has('callback') && href ? (
                <Link href={href} className="cursor-pointer rounded-full bg-lime-600 px-4 py-2 text-sm font-semibold text-white duration-300 hover:bg-lime-500 active:scale-95">
                  {lang?.notif_callback || 'Перезвонить'}
                </Link>
              ) : null}
              {actionIds.has('confirm') ? (
                <button type="button" onClick={() => onAction(notification, 'confirm')} className="cursor-pointer rounded-full border border-zinc-600/30 bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-200 duration-300 hover:bg-zinc-700 active:scale-95">
                  {lang?.notif_its_me || 'Это я'}
                </button>
              ) : null}
              {actionIds.has('deny') ? (
                <button type="button" onClick={() => onAction(notification, 'deny')} className="cursor-pointer rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white duration-300 hover:bg-red-500 active:scale-95">
                  {lang?.notif_not_me || 'Это не я'}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-3">
          <div className="flex items-center gap-1.5">
            {highlighted ? <span aria-hidden="true" className="h-2 w-2 rounded-full bg-purple-400" /> : null}
            <span className="text-xs text-zinc-500 lg:text-sm">{time}</span>
          </div>
          {thumbnail ? (
            <AppImage width={56} height={56} src={thumbnail} alt="" className="h-14 w-14 rounded-3xl border border-zinc-600/30 object-cover" />
          ) : null}
          <button
            type="button"
            aria-label={lang?.notif_delete || 'Удалить'}
            onClick={() => onDelete(notification)}
            className="pointer-events-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-full opacity-0 duration-300 hover:bg-zinc-700 focus-visible:opacity-100 active:scale-95 group-hover:opacity-100 [@media(hover:none)]:opacity-60"
          >
            <Icon name="IC-times" className="h-4 w-4 fill-zinc-300" />
          </button>
        </div>
      </div>
    </li>
  );
}

const NotificationRow = memo(NotificationRowComponent);
export default NotificationRow;
