/**
 * Запись о звонке в чате (сообщение type = 2). Бэкенд кладёт в текст сообщения токен
 *   call:<исход>:<секунды>:<a|v>[:<участников>]       исход: ended | missed | declined | group
 * (модуль modules/calls_log.php). Здесь — разбор токена и подписи/иконки с учётом того, звонил ли я.
 */

export const CALL_MESSAGE_TYPE = 2;

export type CallOutcome = 'declined' | 'ended' | 'group' | 'missed';

export interface CallRecord {
  outcome: CallOutcome;
  participants: number;
  seconds: number;
  video: boolean;
}

export type CallTone = 'bad' | 'neutral' | 'ok';

export interface CallDescription {
  icon: string;
  subtitle: string;
  title: string;
  tone: CallTone;
}

type Lang = Record<string, string> | null | undefined;

const TOKEN = /^call:(ended|missed|declined|group):(\d+):([av])(?::(\d+))?$/;

export function parseCallToken(text: string | null | undefined): CallRecord | null {
  const match = TOKEN.exec(String(text ?? '').trim());
  if (!match) return null;
  return {
    outcome: match[1] as CallOutcome,
    participants: match[4] ? Number(match[4]) : 0,
    seconds: Number(match[2]),
    video: match[3] === 'v',
  };
}

/** 754 → «12:34», 3725 → «1:02:05». */
export function formatCallDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** isMine — звонок начал я (в групповом — не важно). */
export function describeCall(record: CallRecord, isMine: boolean, lang: Lang): CallDescription {
  const parts: string[] = [];
  let title: string;
  let icon: string;
  let tone: CallTone = 'ok';

  switch (record.outcome) {
    case 'ended':
      title = isMine ? lang?.call_msg_outgoing || 'Исходящий звонок' : lang?.call_msg_incoming || 'Входящий звонок';
      icon = isMine ? 'IC-call-outgoing' : 'IC-call-incoming';
      parts.push(formatCallDuration(record.seconds));
      break;
    case 'missed':
      title = isMine ? lang?.call_msg_no_answer || 'Звонок без ответа' : lang?.call_msg_missed || 'Пропущенный звонок';
      icon = isMine ? 'IC-call-outgoing' : 'IC-call-incoming';
      tone = 'bad';
      break;
    case 'declined':
      title = lang?.call_msg_declined || 'Звонок отклонён';
      icon = 'IC-call-end';
      tone = 'bad';
      break;
    default:
      title = lang?.call_msg_group || 'Групповой звонок';
      icon = 'IC-groups';
      parts.push(formatCallDuration(record.seconds));
      if (record.participants > 1) parts.push((lang?.call_msg_participants || 'Участников: {n}').replace('{n}', String(record.participants)));
  }

  if (record.video && record.outcome !== 'group') parts.push(lang?.call_msg_video || 'видео');
  return { icon, subtitle: parts.join(' · '), title, tone };
}

/** Подпись для превью в списке диалогов. */
export function callPreviewText(record: CallRecord, isMine: boolean, lang: Lang): string {
  const { title, subtitle } = describeCall(record, isMine, lang);
  return record.outcome === 'ended' && subtitle ? `${title}, ${subtitle}` : title;
}
