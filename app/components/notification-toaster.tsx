'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';

import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { AncialAPI } from '../lib/api-v2';
import { globalWS } from '../lib/global-ws';
import { getKindMeta, notificationHref, notificationSegments, TONE_CLASSES } from '../lib/notifications/kinds';
import { cleanNotificationPreview } from '../lib/notifications/clean-preview';
import type { RichNotification } from '../lib/notifications/types';
import AppImage from './app-image';
import Icon from './svg-icon';

const FALLBACK_AVATAR = '/img/placeholders/user.png';
/** Эти виды во всплывашке не показываем: код входа не должен «светиться» на экране сам по себе. */
const SILENT_KINDS = new Set(['login_code']);
/** Звонки: во всплывашке — кнопки «Принять» / «Отклонить», держится дольше обычной. */
const CALL_TOAST_KINDS = new Set(['incoming_call', 'group_call']);
const CALL_TOAST_SECONDS = 45;

function readEnvelope(payload: unknown): Record<string, unknown> {
  const envelope = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const data = envelope.data;
  return (data && typeof data === 'object' ? data : envelope) as Record<string, unknown>;
}

function isRichNotification(value: Record<string, unknown>): value is Record<string, unknown> & RichNotification {
  return typeof value.id === 'number' && typeof value.kind === 'string' && Array.isArray(value.actors);
}

/** Всплывашка нового уведомления: аватар, текст с именем, клик — переход по ссылке уведомления. */
function ToastBody({ notification, lang, langCode, onOpen, trailing }: { notification: RichNotification; lang: Record<string, string> | null | undefined; langCode?: string; onOpen: (href: string | null) => void; trailing?: ReactNode }) {
  const meta = getKindMeta(notification);
  const preview = notification.kind !== 'chat_message' ? cleanNotificationPreview(notification.object?.preview) : null;
  const actor = notification.actors[0];
  const segments = notificationSegments(notification, lang, langCode);
  const href = notificationHref(notification);

  return (
    <div className="flex w-full items-center gap-3">
    <button type="button" onClick={() => onOpen(href)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
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
    {trailing}
    </div>
  );
}

/** Кнопки звонка: красная — отклонить, зелёная — принять. */
function CallToastActions({ lang, onAccept, onDecline }: { lang: Record<string, string> | null | undefined; onAccept: () => void; onDecline: () => void }) {
  return (
    <span className="flex shrink-0 items-center gap-3">
      <button
        type="button"
        onClick={onDecline}
        data-tip={lang?.notif_decline || 'Отклонить'}
        aria-label={lang?.notif_decline || 'Отклонить'}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-red-600 duration-300 hover:bg-red-500 active:scale-95"
      >
        <Icon name="IC-call-end" className="h-5 w-5 fill-white" />
      </button>
      <button
        type="button"
        onClick={onAccept}
        data-tip={lang?.notif_accept || 'Принять'}
        aria-label={lang?.notif_accept || 'Принять'}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-lime-600 duration-300 hover:bg-lime-500 active:scale-95"
      >
        <Icon name="IC-call" className="h-5 w-5 fill-white" />
      </button>
    </span>
  );
}

export default function NotificationToaster() {
  const { isAuthenticated, lang, langCode } = useAuth();
  const { dismissNote, showNote } = useNotification();
  const router = useRouter();
  const pathname = usePathname();
  // Актуальные значения для обработчика WS, не пересоздавая подписку.
  const latest = useRef({ dismissNote, lang, langCode, pathname, router, showNote });
  useEffect(() => {
    latest.current = { dismissNote, lang, langCode, pathname, router, showNote };
  });
  // Всплывашки входящих звонков: ключ — call_id (1:1) или `n<id>` (групповой), значение — id всплывашки.
  const callToasts = useRef(new Map<string, number>());

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const onNew = (payload?: unknown) => {
      const data = readEnvelope(payload);
      if (!isRichNotification(data) || SILENT_KINDS.has(data.kind)) return;
      const { dismissNote: dismiss, lang: currentLang, langCode: currentCode, pathname: currentPath, router: currentRouter, showNote: show } = latest.current;
      const isCall = CALL_TOAST_KINDS.has(data.kind) && data.actions.some((action) => action.id === 'accept');
      // На странице уведомлений строка появится в списке; в скрытой вкладке покажет push.
      if (currentPath?.startsWith('/notifications') || document.visibilityState === 'hidden') return;
      // Уже в звонке: ещё одна всплывашка со звонком мешает.
      if (isCall && currentPath?.startsWith('/call')) return;
      const href = notificationHref(data);
      // Открытый диалог/чат уведомлять самим собой не нужно.
      if (href?.startsWith('/messages') && currentPath?.startsWith('/messages')) return;
      if (data.kind === 'chat_message' && currentPath?.startsWith('/messages')) return;

      if (isCall) {
        const key = data.params.call_id || `n${data.id}`;
        const finish = () => {
          const noteId = callToasts.current.get(key);
          if (noteId !== undefined) dismiss(noteId);
          callToasts.current.delete(key);
        };
        const noteId = show({
          content: (
            <ToastBody
              notification={data}
              lang={currentLang}
              langCode={currentCode}
              onOpen={() => undefined}
              trailing={(
                <CallToastActions
                  lang={currentLang}
                  onAccept={() => {
                    finish();
                    if (href) currentRouter.push(href);
                  }}
                  onDecline={() => {
                    finish();
                    // Звонок 1:1 закрываем на сервере (звонящий увидит «отклонён»); групповой просто скрываем.
                    if (data.params.call_id && data.params.dialog_id) {
                      void AncialAPI.declineCall(Number(data.params.dialog_id), data.params.call_id).catch((error: unknown) => console.error('Decline call failed', error));
                    }
                  }}
                />
              )}
            />
          ),
          time: CALL_TOAST_SECONDS,
          type: 'info',
          closable: false,
        });
        callToasts.current.set(key, noteId);
        return;
      }

      show({
        content: <ToastBody notification={data} lang={currentLang} langCode={currentCode} onOpen={(target) => currentRouter.push(target ?? '/notifications')} />,
        time: 6,
        type: 'info',
      });
    };

    // Звонок принят/закончен/отклонён (на этом или другом устройстве): убираем «звонит вам».
    const onCallEnded = (payload?: unknown) => {
      const callId = String(readEnvelope(payload).call_id ?? '');
      const noteId = callId ? callToasts.current.get(callId) : undefined;
      if (noteId === undefined) return;
      latest.current.dismissNote(noteId);
      callToasts.current.delete(callId);
    };

    globalWS.addDialogListener('notification:new', onNew);
    globalWS.addDialogListener('call:ended', onCallEnded);
    return () => {
      globalWS.removeDialogListener('notification:new', onNew);
      globalWS.removeDialogListener('call:ended', onCallEnded);
    };
  }, [isAuthenticated]);

  return null;
}
