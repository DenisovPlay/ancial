import type { NotificationFilter, RichNotification } from './types.ts';

/** Тон бейджа типа: цвета заданы целыми строками — Tailwind не видит собранные на лету классы. */
export type NotificationTone = 'amber' | 'lime' | 'pink' | 'purple' | 'red' | 'sky';

export const TONE_CLASSES: Record<NotificationTone, string> = {
  amber: 'bg-amber-500',
  lime: 'bg-lime-500',
  pink: 'bg-pink-500',
  purple: 'bg-purple-500',
  red: 'bg-red-500',
  sky: 'bg-sky-500',
};

export interface KindMeta {
  filter: Exclude<NotificationFilter, 'all'> | null;
  icon: string;
  tone: NotificationTone;
}

const KINDS: Record<string, KindMeta> = {
  comment_post: { filter: 'content', icon: 'IC-comments', tone: 'sky' },
  comment_reply: { filter: 'content', icon: 'IC-reply', tone: 'sky' },
  post_mention: { filter: 'content', icon: 'IC-notify-message', tone: 'purple' },
  comment_mention: { filter: 'content', icon: 'IC-notify-message', tone: 'purple' },
  post_vote: { filter: 'content', icon: 'IC-vote-up', tone: 'lime' },
  post_quote: { filter: 'content', icon: 'IC-quote', tone: 'purple' },
  friend_request: { filter: 'people', icon: 'IC-signup', tone: 'lime' },
  friend_accepted: { filter: 'people', icon: 'IC-check', tone: 'lime' },
  dialog_created: { filter: 'people', icon: 'IC-chats', tone: 'purple' },
  group_added: { filter: 'people', icon: 'IC-groups', tone: 'purple' },
  incoming_call: { filter: 'people', icon: 'IC-call', tone: 'lime' },
  missed_call: { filter: 'people', icon: 'IC-call-incoming', tone: 'red' },
  group_call: { filter: 'people', icon: 'IC-groups', tone: 'lime' },
  chat_message: { filter: 'people', icon: 'IC-chats', tone: 'purple' },
  wallet_received: { filter: null, icon: 'IC-wallet', tone: 'amber' },
  login_code: { filter: 'security', icon: 'IC-lock', tone: 'red' },
  login_new_device: { filter: 'security', icon: 'IC-lock', tone: 'amber' },
  password_changed: { filter: 'security', icon: 'IC-lock', tone: 'amber' },
  passkey_added: { filter: 'security', icon: 'IC-lock', tone: 'amber' },
  twofa_changed: { filter: 'security', icon: 'IC-lock', tone: 'amber' },
  email_changed: { filter: 'security', icon: 'IC-email', tone: 'amber' },
};

/** Старые строки (kind=legacy) различаем по числовому type, как раньше. */
const LEGACY_BY_TYPE: Record<number, KindMeta> = {
  1: { filter: null, icon: 'IC-notify-message', tone: 'purple' },
  2: { filter: null, icon: 'IC-heart', tone: 'pink' },
  3: { filter: null, icon: 'IC-signup', tone: 'lime' },
};

export function getKindMeta(notification: Pick<RichNotification, 'kind' | 'type'>): KindMeta {
  return KINDS[notification.kind] ?? LEGACY_BY_TYPE[notification.type] ?? { filter: null, icon: 'IC-notification', tone: 'purple' };
}

export function matchesFilter(kind: string, filter: NotificationFilter): boolean {
  return filter === 'all' || KINDS[kind]?.filter === filter;
}

/** Куда ведёт уведомление: только внутренние пути; /notifications как цель смысла не имеет. */
export function notificationHref(notification: Pick<RichNotification, 'url'>): string | null {
  const url = notification.url;
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\')) return null;
  if (url === '/notifications' || url.startsWith('/notifications?')) return null;
  return url;
}

/* ------------------------------------------------------------------ тексты */

/** Русские шаблоны на случай, если в словаре пока нет ключа; остальное — `notif_<kind>` в локалях. */
const FALLBACK_TEMPLATES: Record<string, string> = {
  comment_post: '{name} оставил(а) комментарий к вашему посту',
  comment_post_many: '{name} и ещё {n} прокомментировали ваш пост',
  comment_reply: '{name} ответил(а) на ваш комментарий',
  comment_reply_many: '{name} и ещё {n} ответили на ваш комментарий',
  post_mention: '{name} упомянул(а) вас в посте',
  comment_mention: '{name} упомянул(а) вас в комментарии',
  post_vote: '{name} оценил(а) ваш пост',
  post_vote_many: '{name} и ещё {n} оценили ваш пост',
  post_quote: '{name} процитировал(а) ваш пост',
  friend_request: '{name} хочет добавить вас в друзья',
  friend_accepted: '{name} принял(а) вашу заявку в друзья',
  dialog_created: '{name} создал(а) с вами диалог',
  group_added: '{name} добавил(а) вас в групповой чат «{chat}»',
  chat_message: '{name}',
  chat_message_many: '{name} · новых сообщений: {total}',
  incoming_call: '{name} звонит вам',
  incoming_call_many: '{name} звонил(а) вам: {total}',
  missed_call: 'Пропущенный звонок от {name}',
  missed_call_many: 'Пропущенные звонки от {name}: {total}',
  group_call: '{name} начал(а) групповой звонок в «{chat}»',
  wallet_received: '{name} отправил(а) вам {amount}',
  login_code: 'Код для входа',
  login_new_device: 'Выполнен вход в аккаунт{where}. Если это не вы — смените пароль.',
  password_changed: 'Пароль аккаунта изменён. Если это не вы — завершите все сеансы и смените пароль.',
  passkey_added: 'К аккаунту добавлен новый passkey',
  twofa_changed: 'Изменены настройки двухфакторной аутентификации',
  email_changed: 'Изменён адрес почты аккаунта',
};

/** Для этих kind «ещё N» — число событий, для остальных — число уникальных людей. */
const COUNTS_EVENTS = new Set(['comment_post', 'comment_reply', 'incoming_call', 'missed_call', 'chat_message']);

export type Lang = Record<string, string> | null | undefined;

export interface TextSegment {
  bold?: boolean;
  text: string;
}

export function notificationTemplate(notification: RichNotification, lang: Lang): string {
  const base = `notif_${notification.kind}`;
  const many = notification.count > 1 || notification.actor_count > 1;
  if (many) {
    const manyText = lang?.[`${base}_many`] ?? FALLBACK_TEMPLATES[`${notification.kind}_many`];
    if (manyText) return manyText;
  }
  return lang?.[base] ?? FALLBACK_TEMPLATES[notification.kind] ?? notification.content;
}

/** Текст уведомления сегментами: имя актёра выделяется жирным. */
export function notificationSegments(notification: RichNotification, lang: Lang, langCode?: string): TextSegment[] {
  if (notification.kind === 'legacy' || (!KINDS[notification.kind] && !lang?.[`notif_${notification.kind}`])) {
    return [{ text: translateLegacyContent(notification.content, langCode) }];
  }

  const name = notification.actors[0]?.name ?? '';
  const others = COUNTS_EVENTS.has(notification.kind) ? notification.count - 1 : notification.actor_count - 1;
  const vars: Record<string, string> = {
    ...notification.params,
    n: String(Math.max(0, others)),
    name,
    total: String(notification.count),
  };

  const template = notificationTemplate(notification, lang);
  const segments: TextSegment[] = [];
  const pattern = /\{([a-z_]+)\}/gi;
  let last = 0;
  for (let match = pattern.exec(template); match; match = pattern.exec(template)) {
    if (match.index > last) segments.push({ text: template.slice(last, match.index) });
    const key = match[1];
    if (key === 'name') {
      if (name) segments.push({ bold: true, text: name });
    } else {
      segments.push({ text: vars[key] ?? '' });
    }
    last = match.index + match[0].length;
  }
  if (last < template.length) segments.push({ text: template.slice(last) });
  return segments.filter((segment) => segment.text !== '');
}

/** Старые строки приходили готовым русским текстом — переводим теми же заменами, что и раньше. */
export function translateLegacyContent(text: string, langCode?: string): string {
  if (!text) return '';
  const map: Record<string, Array<[string, string]>> = {
    en: [
      ['написал вам!', 'wrote to you!'], ['хочет добавить вас в друзья', 'wants you to become friends'],
      ['поставил вам лайк!', 'liked your post!'], ['создал с вами диалог!', 'created a dialogue with you!'],
      ['отправил фотографию', 'sent a photo'], ['отправил стикер', 'sent a sticker'], ['написал сообщение', 'sent a message'],
      ['оставил комментарий к вашему посту', 'commented on your post'], ['упомянул вас в комментарии', 'mentioned you in a comment'],
      ['упомянул вас в своем посте', 'mentioned you in a post'], ['звонит вам', 'is calling you'],
    ],
    be: [
      ['написал вам!', 'напісаў вам!'], ['хочет добавить вас в друзья', 'хоча дадаць вас у сябры'],
      ['поставил вам лайк!', 'паставіў вам лайк!'], ['создал с вами диалог!', 'стварыў з вамі дыялог!'],
      ['отправил фотографию', 'адправіў фатаграфію'], ['отправил стикер', 'адправіў сцікер'], ['написал сообщение', 'напісаў паведамленне'],
      ['оставил комментарий к вашему посту', 'пакінуў каментарый да вашага допісу'], ['упомянул вас в комментарии', 'згадаў вас у каментарыі'],
      ['упомянул вас в своем посте', 'згадаў вас у сваім допісе'], ['звонит вам', 'тэлефануе вам'],
    ],
  };
  const pairs = langCode ? map[langCode] : undefined;
  return pairs ? pairs.reduce((result, [from, to]) => result.replace(from, to), text) : text;
}

/* ------------------------------------------------------------------ группировка по дням */

export type DayBucket = 'earlier' | 'today' | 'yesterday';

export function dayBucket(ts: string | null, now: Date = new Date()): DayBucket {
  if (!ts) return 'earlier';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return 'earlier';
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  return 'earlier';
}

export interface NotificationSection {
  bucket: DayBucket;
  items: RichNotification[];
}

/** Секции «Сегодня / Вчера / Ранее» в порядке ленты; пустые не создаются. */
export function groupNotificationsByDay(items: readonly RichNotification[], now: Date = new Date()): NotificationSection[] {
  const sections: NotificationSection[] = [];
  for (const item of items) {
    const bucket = dayBucket(item.ts, now);
    const last = sections[sections.length - 1];
    if (last && last.bucket === bucket) last.items.push(item);
    else sections.push({ bucket, items: [item] });
  }
  return sections;
}

/** Сколько осталось секунд до срока; 0 — истёк или срока нет. */
export function secondsLeft(expiresAt: string | null, now: number = Date.now()): number {
  if (!expiresAt) return 0;
  const end = new Date(expiresAt).getTime();
  return Number.isNaN(end) ? 0 : Math.max(0, Math.ceil((end - now) / 1000));
}

export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
