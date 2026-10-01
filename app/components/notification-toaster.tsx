'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { globalWS } from '../lib/global-ws';
import { getKindMeta, notificationHref, notificationSegments, TONE_CLASSES } from '../lib/notifications/kinds';
import { cleanNotificationPreview } from '../lib/notifications/clean-preview';
import type { RichNotification } from '../lib/notifications/types';
import AppImage from './app-image';
import Icon from './svg-icon';

const FALLBACK_AVATAR = '/img/placeholders/user.png';
/** Эти виды во всплывашке не показываем: код входа не должен «светиться» на экране сам по себе. */
const SILENT_KINDS = new Set(['login_code']);

function readEnvelope(payload: unknown): Record<string, unknown> {
  const envelope = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const data = envelope.data;
  return (data && typeof data === 'object' ? data : envelope) as Record<string, unknown>;
}

function isRichNotification(value: Record<string, unknown>): value is Record<string, unknown> & RichNotification {
  return typeof value.id === 'number' && typeof value.kind === 'string' && Array.isArray(value.actors);
}

/** Всплывашка нового уведомления: аватар, текст с именем, клик — переход по ссылке уведомления. */
function ToastBody({ notification, lang, langCode, onOpen }: { notification: RichNotification; lang: Record<string, string> | null | undefined; langCode?: string; onOpen: (href: string | null) => void }) {
  const meta = getKindMeta(notification);
  const preview = notification.kind !== 'chat_message' ? cleanNotificationPreview(notification.object?.preview) : null;
  const actor = notification.actors[0];
  const segments = notificationSegments(notification, lang, langCode);
  const href = notificationHref(notification);

  return (
    <button type="button" onClick={() => onOpen(href)} className="flex w-full cursor-pointer items-center gap-3 text-left">
      <span className="relative h-10 w-10 shrink-0">
        {actor ? (
          <AppImage width={40} height={40} src={actor.img || FALLBACK_AVATAR} fallbackSrc={FALLBACK_AVATAR} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <span className={`flex h-10 w-10 items-center justify-center rounded-full ${TONE_CLASSES[meta.tone]}`}>
            <Icon name={meta.icon} className="h-5 w-5 fill-white" />
          </span>
        )}
        {actor ? (
          <span className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-600/30 ${TONE_CLASSES[meta.tone]}`}>
            <Icon name={meta.icon} className="h-3 w-3 fill-white" />
          </span>
        ) : null}
      </span>
      <span className="min-w-0 flex-1 text-sm leading-snug">
        {segments.map((segment, index) => (segment.bold ? <b key={index} className="font-semibold">{segment.text}</b> : <span key={index}>{segment.text}</span>))}
        {preview ? (
          <span className="mt-0.5 block truncate text-xs opacity-70">{preview}</span>
        ) : null}
      </span>
    </button>
  );
}

export default function NotificationToaster() {
  const { isAuthenticated, lang, langCode } = useAuth();
  const { showNote } = useNotification();
  const router = useRouter();
  const pathname = usePathname();
  // Актуальные значения для обработчика WS, не пересоздавая подписку.
  const latest = useRef({ lang, langCode, pathname, router, showNote });
  useEffect(() => {
    latest.current = { lang, langCode, pathname, router, showNote };
  });

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const onNew = (payload?: unknown) => {
      const data = readEnvelope(payload);
      if (!isRichNotification(data) || SILENT_KINDS.has(data.kind)) return;
      const { lang: currentLang, langCode: currentCode, pathname: currentPath, router: currentRouter, showNote: show } = latest.current;
      // На странице уведомлений строка появится в списке; в скрытой вкладке покажет push.
      if (currentPath?.startsWith('/notifications') || document.visibilityState === 'hidden') return;
      const href = notificationHref(data);
      // Открытый диалог/чат уведомлять самим собой не нужно.
      if (href?.startsWith('/messages') && currentPath?.startsWith('/messages')) return;
      if (data.kind === 'chat_message' && currentPath?.startsWith('/messages')) return;

      show({
        content: <ToastBody notification={data} lang={currentLang} langCode={currentCode} onOpen={(target) => currentRouter.push(target ?? '/notifications')} />,
        time: 6,
        type: 'info',
      });
    };

    globalWS.addDialogListener('notification:new', onNew);
    return () => globalWS.removeDialogListener('notification:new', onNew);
  }, [isAuthenticated]);

  return null;
}
