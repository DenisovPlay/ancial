import type { ImageViewerSlide } from '../../components/image-viewer-modal';
import { AncialAPI } from '../../lib/api-v2';
import { cache } from '../../lib/cache.ts';

export type DialogImageSlide = ImageViewerSlide & { key: string };
export type LangMap = Record<string, string> | null;

export type DialogListItem = {
  hash?: string | null;
  id?: number | string | null;
  Mmessage?: string | null;
  Mstatus?: number | string | null;
  Mtime?: string | null;
  Uimg?: string | null;
  Ulastonline?: number | string | null;
  Uname?: string | null;
  Uverify?: number | string | null;
};

export type DialogMeta = {
  hash?: string | null;
  id?: number | string | null;
  img?: string | null;
  blocked?: boolean | number | string | null;
};

export type DialogUser = {
  fname?: string | null;
  id?: number | string | null;
  img?: string | null;
  lastonlinetime?: number | string | null;
  lname?: string | null;
  username?: string | null;
  verify?: number | string | null;
};

export type DialogListResponse = {
  dialogs?: DialogListItem[];
  error?: string;
  success?: boolean;
};

export type DialogByHashResponse = {
  blocked?: boolean;
  dialog?: DialogMeta | null;
  error?: string;
  foreignUser?: DialogUser | null;
  success?: boolean;
};

export type DialogMessage = {
  createdAt?: string | null;
  created_at?: string | null;
  date?: string | null;
  datetime?: string | null;
  id?: number | string | null;
  message?: string | null;
  reactions?: string | null;
  sender_id?: number | string | null;
  status?: number | string | null;
  reply_to?: number | string | null;
  reply_msg?: string | null;
  reply_type?: number | string | null;
  reply_author?: number | string | null;
  time?: string | null;
  timeFull?: string | null;
  time_full?: string | null;
  type?: number | string | null;
  userImg?: string | null;
  dialog_id?: number | string | null;
  di_id?: number | string | null;
  isSending?: boolean;
};

export type DialogMessagesResponse = {
  error?: string;
  foreignUser?: DialogUser | null;
  messages?: DialogMessage[];
  success?: boolean;
};

export type MessageReactionEntry = {
  emoji: string;
  userId: string;
};

export type MessageImage = {
  alt: string;
  isViewerImage: boolean;
  src: string;
};

export type SevenTvSticker = {
  id: string;
  name: string;
  url: string;
};

export type MessageTimelineItem =
  | {
    dayKey: string;
    kind: 'separator';
    label: string;
  }
  | {
    kind: 'message';
    message: DialogMessage;
  };

export type ScrollAction =
  | {
    type: 'bottom';
  }
  | {
    prevHeight: number;
    prevTop: number;
    type: 'preserve';
  };

export type WsPayloadData = Record<string, unknown> & {
  last_online?: number | string | null;
  last_seen_at?: number | string | null;
  lastonlinetime?: number | string | null;
  online?: boolean | null;
  online_at?: number | string | null;
  status?: string | null;
  user_id?: number | string | null;
};

export type WsPayload = {
  data?: WsPayloadData | null;
  last_online?: number | string | null;
  last_seen_at?: number | string | null;
  lastonlinetime?: number | string | null;
  message_id?: number | string | null;
  new_text?: string | null;
  online?: boolean | null;
  online_at?: number | string | null;
  status?: string | null;
  user_id?: number | string | null;
  [key: string]: unknown;
};

export const DIALOGS_CACHE_KEY = 'dialogs-cache';
export const DIALOGS_REFRESH_INTERVAL_MS = 20_000;
export const MESSAGE_PAGE_SIZE = 30;
export const MESSAGE_CACHE_LIMIT = 2000;
export const IMGBB_API_KEY = '595c8d872da11fdaa5225badc67cc6e6';
export const FALLBACK_AVATAR = '/includes/img/new_user.png';
export const FALLBACK_WELCOME_IMAGE = '/includes/img/anlite/chats.png';
export const NOTHING_FOUND_IMAGE = '/img/status/nothingfound.webp';
export const SEVEN_TV_SEARCH_DEBOUNCE_MS = 700;
export const SEVEN_TV_MIN_QUERY_LENGTH = 3;
export const SEVEN_TV_SEARCH_CACHE_KEY = 'messages:7tv-search-cache:v1';
export const SEVEN_TV_SEARCH_CACHE_MAX_ENTRIES = 40;
export const SEVEN_TV_SEARCH_CACHE_TTL_MS = 1000 * 60 * 60 * 6;
export const STICKER_NAMES = [
  'hi',
  'privet',
  'aware',
  'booba',
  'box',
  'classic',
  'durak',
  'rar',
  'flex1337',
  'hehehe',
  'hmm',
  'hop',
  'love',
  'myaa',
  'nerd',
  'peepoclap',
  'pofig',
  'russian',
  'shy',
  'sussy',
  'ura',
  'vibe',
  'ww',
  'alcoholic',
  'stonks',
  'nowoted',
  'what',
  'late',
  'hamster',
  'joker',
];

type SevenTvStickerSearchCacheEntry = {
  items: SevenTvSticker[];
  updatedAt: number;
};

export const sevenTvStickerCache = new Map<string, SevenTvSticker | null>();
const sevenTvStickerPromiseCache = new Map<string, Promise<SevenTvSticker | null>>();
const sevenTvStickerSearchCache = new Map<string, SevenTvStickerSearchCacheEntry>();
let sevenTvStickerSearchCacheHydrated = false;

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function Icon({
  name,
  className,
}: {
  className?: string;
  name: string;
}) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <use href={`#${name}`}></use>
    </svg>
  );
}

export function toNumber(value: number | string | null | undefined) {
  const nextValue = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

export function normalizeText(value: string | null | undefined) {
  return String(value ?? '').trim();
}

export function normalizeHash(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) {
    return normalizeHash(value[0]);
  }

  return normalizeText(value).replace(/^\/+/, '').replace(/\/+$/, '');
}

export function normalizeAssetUrl(value: string | null | undefined, fallback: string) {
  const nextValue = normalizeText(value);
  if (!nextValue || nextValue === '""') return fallback;
  return nextValue;
}

export function stripHtml(value: string | null | undefined) {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function decodeHtml(value: string) {
  if (typeof window === 'undefined') return value;

  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

export function decodeText(value: string | null | undefined) {
  return decodeHtml(normalizeText(value));
}

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function getSevenTvStickerCacheKey(value: string) {
  return normalizeText(value).toLowerCase();
}

export function buildSevenTvStickerProxyUrl(stickerId: string) {
  const normalizedStickerId = normalizeText(stickerId);
  if (!normalizedStickerId) {
    return '';
  }

  return `/api/V2/7tv/Image.php?id=${encodeURIComponent(normalizedStickerId)}`;
}

export function getSevenTvStickerTokenData(value: string | null | undefined) {
  const tokenValue = decodeHtml(stripHtml(value));
  const tokenWithIdMatch = tokenValue.match(/^:7tv-(.+)-([A-Z0-9]{26}):$/i);
  if (tokenWithIdMatch?.[1] && tokenWithIdMatch?.[2]) {
    return {
      id: normalizeText(tokenWithIdMatch[2]),
      name: normalizeText(tokenWithIdMatch[1]),
    };
  }

  const legacyTokenMatch = tokenValue.match(/^:7tv-(.+):$/i);
  if (legacyTokenMatch?.[1]) {
    return {
      id: '',
      name: normalizeText(legacyTokenMatch[1]),
    };
  }

  return null;
}

function isSevenTvStickerSearchCacheEntryExpired(entry: SevenTvStickerSearchCacheEntry) {
  return Date.now() - entry.updatedAt > SEVEN_TV_SEARCH_CACHE_TTL_MS;
}

function persistSevenTvStickerSearchCache() {
  if (typeof window === 'undefined') {
    return;
  }

  const nextEntries = Array.from(sevenTvStickerSearchCache.entries())
    .filter(([, entry]) => !isSevenTvStickerSearchCacheEntryExpired(entry))
    .sort((left, right) => right[1].updatedAt - left[1].updatedAt)
    .slice(0, SEVEN_TV_SEARCH_CACHE_MAX_ENTRIES);

  sevenTvStickerSearchCache.clear();
  nextEntries.forEach(([cacheKey, entry]) => {
    sevenTvStickerSearchCache.set(cacheKey, entry);
  });

  try {
    sessionStorage.setItem(
      SEVEN_TV_SEARCH_CACHE_KEY,
      JSON.stringify(
        nextEntries.map(([cacheKey, entry]) => ({
          cacheKey,
          items: entry.items,
          updatedAt: entry.updatedAt,
        })),
      ),
    );
  } catch {
    // Ignore storage quota and privacy-mode errors.
  }
}

function hydrateSevenTvStickerSearchCache() {
  if (typeof window === 'undefined' || sevenTvStickerSearchCacheHydrated) {
    return;
  }

  sevenTvStickerSearchCacheHydrated = true;

  try {
    const rawValue = sessionStorage.getItem(SEVEN_TV_SEARCH_CACHE_KEY);
    if (!rawValue) {
      return;
    }

    const payload = JSON.parse(rawValue) as Array<{
      cacheKey?: string;
      items?: SevenTvSticker[];
      updatedAt?: number;
    }>;

    if (!Array.isArray(payload)) {
      return;
    }

    payload.forEach((entry) => {
      const cacheKey = normalizeText(entry.cacheKey);
      if (!cacheKey || !Array.isArray(entry.items) || !Number.isFinite(entry.updatedAt)) {
        return;
      }

      const nextEntry: SevenTvStickerSearchCacheEntry = {
        items: entry.items,
        updatedAt: Number(entry.updatedAt),
      };

      if (isSevenTvStickerSearchCacheEntryExpired(nextEntry)) {
        return;
      }

      sevenTvStickerSearchCache.set(cacheKey, nextEntry);
      seedSevenTvStickerCache(nextEntry.items);
    });
  } catch {
    // Ignore malformed cache payloads.
  }
}

export function getCachedSevenTvSearchItems(cacheKey: string) {
  hydrateSevenTvStickerSearchCache();
  const cacheEntry = sevenTvStickerSearchCache.get(cacheKey);
  if (!cacheEntry) {
    return null;
  }

  if (isSevenTvStickerSearchCacheEntryExpired(cacheEntry)) {
    sevenTvStickerSearchCache.delete(cacheKey);
    persistSevenTvStickerSearchCache();
    return null;
  }

  return cacheEntry.items;
}

function setCachedSevenTvSearchItems(cacheKey: string, items: SevenTvSticker[]) {
  hydrateSevenTvStickerSearchCache();
  sevenTvStickerSearchCache.set(cacheKey, {
    items,
    updatedAt: Date.now(),
  });
  persistSevenTvStickerSearchCache();
}

export function seedSevenTvStickerCache(items: SevenTvSticker[]) {
  items.forEach((item) => {
    const nextKey = getSevenTvStickerCacheKey(item.name);
    if (!nextKey) return;
    sevenTvStickerCache.set(nextKey, item);
  });
}

export async function searchSevenTvStickers(
  query: string,
  options?: {
    exact?: boolean;
    limit?: number;
    signal?: AbortSignal;
  },
) {
  const normalizedQuery = normalizeText(query);
  const allowEmpty = !options?.exact;
  if (!normalizedQuery && !allowEmpty) {
    return [];
  }

  const exact = Boolean(options?.exact);
  const limit = Math.min(Math.max(options?.limit ?? 24, 1), 72);
  const cacheKey = `${getSevenTvStickerCacheKey(normalizedQuery)}:${exact ? '1' : '0'}:${limit}`;
  const cachedItems = getCachedSevenTvSearchItems(cacheKey);
  if (cachedItems) {
    return cachedItems;
  }

  try {
    const payload = await AncialAPI.search7tv<{ items?: SevenTvSticker[] }>(
      normalizedQuery,
      limit,
      exact,
      { signal: options?.signal },
    );
    const items = Array.isArray(payload.items) ? payload.items : [];
    setCachedSevenTvSearchItems(cacheKey, items);
    seedSevenTvStickerCache(items);
    return items;
  } catch (err) {
    throw new Error(`7TV search failed: ${err}`);
  }
}

export async function resolveSevenTvStickerByName(name: string) {
  const normalizedName = normalizeText(name);
  const cacheKey = getSevenTvStickerCacheKey(normalizedName);
  if (!cacheKey) {
    return null;
  }

  if (sevenTvStickerCache.has(cacheKey)) {
    return sevenTvStickerCache.get(cacheKey) ?? null;
  }

  const existingPromise = sevenTvStickerPromiseCache.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  const nextPromise = searchSevenTvStickers(normalizedName, { exact: true, limit: 12 })
    .then((items) => {
      const exactItem = items.find(
        (item) => getSevenTvStickerCacheKey(item.name) === cacheKey,
      ) ?? null;

      sevenTvStickerCache.set(cacheKey, exactItem);
      return exactItem;
    })
    .catch(() => {
      sevenTvStickerCache.set(cacheKey, null);
      return null;
    })
    .finally(() => {
      sevenTvStickerPromiseCache.delete(cacheKey);
    });

  sevenTvStickerPromiseCache.set(cacheKey, nextPromise);
  return nextPromise;
}

function getHtmlAttribute(tag: string, attributeName: string) {
  const quotedMatch = tag.match(new RegExp(`${attributeName}\\s*=\\s*(['"])(.*?)\\1`, 'i'));
  if (quotedMatch?.[2]) {
    return quotedMatch[2];
  }

  const unquotedMatch = tag.match(new RegExp(`${attributeName}\\s*=\\s*([^\\s>]+)`, 'i'));
  return unquotedMatch?.[1] ?? '';
}

function hasFancyboxAttribute(tag: string) {
  return /\bdata-fancybox(?:\s*=|\b)/i.test(tag);
}

export function extractMessageImages(value: string | null | undefined) {
  const images: MessageImage[] = [];
  const html = String(value ?? '');
  const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];

  imageTags.forEach((tag) => {
    const src = decodeHtml(
      normalizeText(getHtmlAttribute(tag, 'data-src') || getHtmlAttribute(tag, 'src')),
    );
    if (!src) return;

    images.push({
      alt: decodeHtml(normalizeText(getHtmlAttribute(tag, 'alt'))),
      isViewerImage: hasFancyboxAttribute(tag),
      src,
    });
  });

  return images;
}

export function getMessageBodyHtmlWithoutImages(value: string | null | undefined) {
  return String(value ?? '').replace(/<img\b[^>]*>/gi, '').trim();
}

export function getDialogImageKey(messageId: number, imageIndex: number) {
  return `msg:${messageId}:img:${imageIndex}`;
}

export function hasMeaningfulValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const normalizedValue = normalizeText(value).toLowerCase();
    return normalizedValue !== '' && normalizedValue !== 'undefined' && normalizedValue !== 'null';
  }
  return true;
}

export function mergeDialogUser(
  currentUser: DialogUser | null | undefined,
  incomingUser: DialogUser | null | undefined,
): DialogUser | null {
  if (!currentUser && !incomingUser) return null;
  if (!currentUser) return incomingUser ? { ...incomingUser } : null;
  if (!incomingUser) return { ...currentUser };

  return {
    ...currentUser,
    ...incomingUser,
    fname: hasMeaningfulValue(incomingUser.fname) ? incomingUser.fname : currentUser.fname,
    id: hasMeaningfulValue(incomingUser.id) ? incomingUser.id : currentUser.id,
    img: hasMeaningfulValue(incomingUser.img) ? incomingUser.img : currentUser.img,
    lastonlinetime: hasMeaningfulValue(incomingUser.lastonlinetime)
      ? incomingUser.lastonlinetime
      : currentUser.lastonlinetime,
    lname: hasMeaningfulValue(incomingUser.lname) ? incomingUser.lname : currentUser.lname,
    username: hasMeaningfulValue(incomingUser.username) ? incomingUser.username : currentUser.username,
    verify: hasMeaningfulValue(incomingUser.verify) ? incomingUser.verify : currentUser.verify,
  };
}

export function buildDialogImageSlides(messages: DialogMessage[]) {
  const slides: DialogImageSlide[] = [];

  sortMessages(messages).forEach((message) => {
    const messageId = getMessageId(message);
    if (!messageId) return;

    extractMessageImages(message.message).forEach((image, imageIndex) => {
      if (!image.isViewerImage) return;

      slides.push({
        alt: image.alt || null,
        key: getDialogImageKey(messageId, imageIndex),
        url: image.src,
      });
    });
  });

  return slides;
}

export function formatDialogPreview(messageValue: string | null | undefined, lang: LangMap) {
  const sevenTvStickerTokenData = getSevenTvStickerTokenData(messageValue);
  if (sevenTvStickerTokenData?.name) {
    return `7TV: ${sevenTvStickerTokenData.name}`;
  }

  const previewText = decodeHtml(stripHtml(messageValue));
  if (previewText) {
    return previewText;
  }

  if (extractMessageImages(messageValue).length > 0) {
    return lang?.sticker || 'Стикер';
  }

  return '';
}

export function parseMessageLinks(text: string) {
  if (!text) return text;

  let html = text;

  html = html.replace(
    /(?<=^|[\s\n])(?:\[url\|(.*?)\]|((?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?))(?=$|[\s\n])/gi,
    (match, m1, m2) => {
      let url = '';
      let linkText = '';

      if (m1) {
        const parts = m1.split('|');
        url = parts[0].trim();
        linkText = parts.length > 1 ? parts[1].trim() : url;
      } else if (m2) {
        url = m2.trim();
        linkText = url;
        if (!/^https?:\/\//i.test(url) && /\.(php|html?|js|css|zip|rar|exe|png|jpe?g|gif|mp4|avi)$/i.test(url)) {
          return match;
        }
      }

      if (!url) return match;

      let finalUrl = url;
      if (!/^https?:\/\//i.test(url)) {
        finalUrl = `https://${url}`;
      }

      return `<a href="https://ancial.ru/redirect?link=${encodeURIComponent(finalUrl)}" target="_blank" class="text-purple-300 hover:text-purple-200 underline duration-300">${linkText}</a>`;
    },
  );

  html = html.replace(
    /(?<=^|[\s\n])([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?=$|[\s\n])/gi,
    (match, email) => {
      const cleanEmail = email ? email.trim() : '';
      if (!cleanEmail) return match;
      return `<a href="mailto:${cleanEmail}" class="text-purple-300 hover:text-purple-200 underline duration-300">${cleanEmail}</a>`;
    },
  );

  return html;
}

export function isOnline(lastOnlineTime: number | string | null | undefined) {
  const onlineAt = toNumber(lastOnlineTime);
  if (!onlineAt) return false;
  return onlineAt + 500 >= Math.floor(Date.now() / 1000);
}

export function resolvePresenceLastOnline(payload: WsPayload): number | null {
  const data = payload.data && typeof payload.data === 'object' ? payload.data : null;
  const explicitOnline =
    typeof payload.online === 'boolean'
      ? payload.online
      : typeof data?.online === 'boolean'
        ? data.online
        : null;

  if (explicitOnline !== null) {
    return explicitOnline ? Math.floor(Date.now() / 1000) : 0;
  }

  const status =
    typeof payload.status === 'string'
      ? payload.status
      : typeof data?.status === 'string'
        ? data.status
        : '';
  const normalizedStatus = normalizeText(status).toLowerCase();

  if (normalizedStatus === 'online') {
    return Math.floor(Date.now() / 1000);
  }

  if (normalizedStatus === 'offline') {
    return 0;
  }

  const timestampCandidates: Array<number | string | null | undefined> = [
    payload.lastonlinetime,
    payload.last_online,
    payload.online_at,
    payload.last_seen_at,
    data?.lastonlinetime,
    data?.last_online,
    data?.online_at,
    data?.last_seen_at,
  ];

  const lastOnlineTime = timestampCandidates.reduce<number>((maxTimestamp, value) => {
    const nextTimestamp = toNumber(value);
    return nextTimestamp > maxTimestamp ? nextTimestamp : maxTimestamp;
  }, 0);

  return lastOnlineTime > 0 ? lastOnlineTime : null;
}

export function parseReactions(reactions: string | null | undefined): MessageReactionEntry[] {
  return String(reactions ?? '')
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf(':');
      if (separatorIndex === -1) {
        return null;
      }

      return {
        emoji: entry.slice(separatorIndex + 1),
        userId: entry.slice(0, separatorIndex),
      } satisfies MessageReactionEntry;
    })
    .filter((entry): entry is MessageReactionEntry => Boolean(entry?.emoji && entry.userId));
}

export function getDialogsCache() {
  const parsed = cache.get<{ dialogs?: DialogListItem[]; time?: number }>(DIALOGS_CACHE_KEY, { category: 'chats', subcategory: 'dialogs' });
  if (!parsed || !Array.isArray(parsed.dialogs) || typeof parsed.time !== 'number') {
    return null;
  }

  return {
    dialogs: parsed.dialogs,
    time: parsed.time,
  };
}

export function writeDialogsCache(dialogs: DialogListItem[]) {
  cache.set(
    DIALOGS_CACHE_KEY,
    {
      dialogs,
      time: Date.now(),
    },
    { category: 'chats', subcategory: 'dialogs' },
  );
}

export function applyCachedDialogs(dialogs: DialogListItem[]) {
  return dialogs.map((dialog) => ({ ...dialog }));
}

export function getMessageCacheKey(userId: number, dialogId: number) {
  return `msg-cache:${userId}:${dialogId}`;
}

export function getMessageHashCacheKey(userId: number, dialogHash: string) {
  return `msg-cache-hash:${userId}:${normalizeHash(dialogHash)}`;
}

export function readMessageCache(cacheKey: string) {
  if (!cacheKey) return null;

  const parsed = cache.get<{
    dialog_hash?: string;
    dialog_id?: number | string;
    dialogMeta?: DialogMeta | null;
    foreignUser?: DialogUser | null;
    messages?: DialogMessage[];
    time?: number;
  }>(cacheKey, { category: 'chats', subcategory: 'messages' });

  if (!parsed || !Array.isArray(parsed.messages)) {
    return null;
  }

  return parsed;
}

export function readMessageCacheByHash(userId: number, dialogHash: string) {
  if (typeof window === 'undefined' || !dialogHash || !userId) return null;
  const hashKey = getMessageHashCacheKey(userId, dialogHash);
  return readMessageCache(hashKey);
}

export function getMessageId(message: DialogMessage) {
  return toNumber(message.id);
}

export function sortMessages(messages: DialogMessage[]) {
  return [...messages].sort((left, right) => getMessageId(left) - getMessageId(right));
}

export function getEarliestMessageId(messages: DialogMessage[]) {
  if (!messages.length) return 0;
  return getMessageId(messages[0]);
}

export function getLatestMessageId(messages: DialogMessage[]) {
  if (!messages.length) return 0;
  return getMessageId(messages[messages.length - 1]);
}

export function mergeMessages(existing: DialogMessage[], incoming: DialogMessage[]) {
  const merged = new Map<number, DialogMessage>();

  existing.forEach((message) => {
    const messageId = getMessageId(message);
    if (!messageId) return;
    merged.set(messageId, message);
  });

  incoming.forEach((message) => {
    const messageId = getMessageId(message);
    if (!messageId) return;
    merged.set(messageId, message);
  });

  return sortMessages(Array.from(merged.values()));
}

export function trimMessageCache(messages: DialogMessage[], keepSide: 'newest' | 'oldest') {
  if (messages.length <= MESSAGE_CACHE_LIMIT) {
    return messages;
  }

  return keepSide === 'oldest'
    ? messages.slice(0, MESSAGE_CACHE_LIMIT)
    : messages.slice(messages.length - MESSAGE_CACHE_LIMIT);
}

export function writeMessageCache({
  cacheKey,
  dialogHash,
  dialogId,
  dialogMeta,
  foreignUser,
  keepSide,
  messages,
  userId,
}: {
  cacheKey: string;
  dialogHash: string;
  dialogId: number;
  dialogMeta?: DialogMeta | null;
  foreignUser?: DialogUser | null;
  keepSide: 'newest' | 'oldest';
  messages: DialogMessage[];
  userId?: number;
}) {
  const payload = {
    dialog_hash: dialogHash,
    dialog_id: dialogId,
    foreignUser: foreignUser ?? null,
    dialogMeta: dialogMeta ?? null,
    messages: trimMessageCache(sortMessages(messages), keepSide),
    time: Date.now(),
  };

  if (cacheKey) {
    cache.set(cacheKey, payload, { category: 'chats', subcategory: 'messages' });
  }

  if (userId && dialogHash) {
    const hashKey = getMessageHashCacheKey(userId, dialogHash);
    cache.set(hashKey, payload, { category: 'chats', subcategory: 'messages_hash' });
  }
}

export function parseMessageDate(message: DialogMessage) {
  const raw =
    message.date ??
    message.created_at ??
    message.createdAt ??
    message.datetime ??
    message.time_full ??
    message.timeFull;

  const nextValue = normalizeText(raw);
  if (!nextValue) return null;

  const isoValue = nextValue.replace(' ', 'T');
  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(isoValue);
  const normalizedIso =
    !hasTimezone && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(isoValue)
      ? `${isoValue}+03:00`
      : isoValue;

  const date = new Date(normalizedIso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatMessageTime(message: DialogMessage) {
  const date = parseMessageDate(message);
  if (!date) return '';

  try {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}

function getDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDayLabel(date: Date, lang: LangMap) {
  const months = [
    lang?.january || 'января',
    lang?.february || 'февраля',
    lang?.march || 'марта',
    lang?.april || 'апреля',
    lang?.may || 'мая',
    lang?.june || 'июня',
    lang?.july || 'июля',
    lang?.august || 'августа',
    lang?.september || 'сентября',
    lang?.october || 'октября',
    lang?.november || 'ноября',
    lang?.december || 'декабря',
  ];

  const today = startOfLocalDay(new Date());
  const current = startOfLocalDay(date);
  const diffDays = Math.round((today.getTime() - current.getTime()) / 86_400_000);

  if (diffDays === 0) {
    return lang?.today || 'Сегодня';
  }

  if (diffDays === 1) {
    return lang?.yesterday || 'Вчера';
  }

  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function buildTimelineItems(messages: DialogMessage[], lang: LangMap) {
  const sortedMessages = sortMessages(messages);
  const items: MessageTimelineItem[] = [];
  let previousDayKey = '';

  sortedMessages.forEach((message) => {
    const date = parseMessageDate(message);
    const dayKey = date ? getDayKey(date) : '';

    if (date && dayKey && dayKey !== previousDayKey) {
      items.push({
        dayKey,
        kind: 'separator',
        label: formatDayLabel(date, lang),
      });
      previousDayKey = dayKey;
    }

    items.push({
      kind: 'message',
      message,
    });
  });

  return items;
}

export function getEditableMessageText(message: DialogMessage) {
  const raw = String(message.message ?? '');
  const textWithNewlines = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeHtml(textWithNewlines);
}

export function getPayloadMessageId(payload: unknown) {
  if (!payload || typeof payload !== 'object') return 0;

  const directId = toNumber((payload as WsPayload).message_id);
  if (directId) return directId;

  const dataId = toNumber((payload as WsPayload).data?.message_id as string | number | null);
  return dataId;
}

export function getPayloadMessageText(payload: unknown) {
  if (!payload || typeof payload !== 'object') return '';

  const directText = normalizeText((payload as WsPayload).new_text as string | null | undefined);
  if (directText) return directText;

  return normalizeText((payload as WsPayload).data?.new_text as string | null | undefined);
}

export function shouldStickToBottom(element: HTMLDivElement | null) {
  if (!element) return true;
  return element.scrollHeight - element.scrollTop - element.clientHeight < 180;
}

export function getDialogTitle(user: DialogUser | null) {
  if (!user) return '';
  return [decodeText(user.fname), decodeText(user.lname)].filter(Boolean).join(' ');
}

export function mapDialogListItemToUser(dialog: DialogListItem | null | undefined): DialogUser | null {
  if (!dialog) return null;

  const displayName = decodeText(dialog.Uname);
  if (!displayName && !hasMeaningfulValue(dialog.Uimg) && !hasMeaningfulValue(dialog.Ulastonline)) {
    return null;
  }

  const [fname = '', ...lnameParts] = displayName.split(/\s+/).filter(Boolean);

  return {
    fname: fname || null,
    img: dialog.Uimg ?? null,
    lastonlinetime: dialog.Ulastonline ?? null,
    lname: lnameParts.join(' ') || null,
    verify: dialog.Uverify ?? null,
  };
}

export function getMessageStatusIconName(status: number | string | null | undefined) {
  return String(status) === '0' ? 'IC-check' : 'IC-double-check';
}

export function getDialogPreviewStatusIconName(status: number | string | null | undefined) {
  return String(status) === '0' ? 'IC-check' : 'IC-double-check';
}

export function isMessageMenuIgnoredTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('a, button, img'));
}
