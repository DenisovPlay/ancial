/* eslint-disable @next/next/no-img-element */
'use client';

import Image from 'next/image';
import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';

import Modal from '../components/modal';
import { Dropdown, DropdownItem } from '../components/navigation';
import YandexRtb from '../components/yandex-rtb';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { usePulsePlayer } from '../context/PulsePlayerContext';
import { AncialAPI } from '../lib/api-v2';
import { globalWS } from '../lib/global-ws';
import DialogImageViewerModal, { type DialogImageSlide } from './dialog-image-viewer-modal';

type LangMap = Record<string, string> | null;

type DialogListItem = {
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

type DialogMeta = {
  hash?: string | null;
  id?: number | string | null;
  img?: string | null;
};

type DialogUser = {
  fname?: string | null;
  id?: number | string | null;
  img?: string | null;
  lastonlinetime?: number | string | null;
  lname?: string | null;
  username?: string | null;
  verify?: number | string | null;
};

type DialogListResponse = {
  dialogs?: DialogListItem[];
  error?: string;
  success?: boolean;
};

type DialogByHashResponse = {
  blocked?: boolean;
  dialog?: DialogMeta | null;
  error?: string;
  foreignUser?: DialogUser | null;
  success?: boolean;
};

type DialogMessage = {
  createdAt?: string | null;
  created_at?: string | null;
  date?: string | null;
  datetime?: string | null;
  id?: number | string | null;
  message?: string | null;
  reactions?: string | null;
  sender_id?: number | string | null;
  status?: number | string | null;
  time?: string | null;
  timeFull?: string | null;
  time_full?: string | null;
  type?: number | string | null;
  userImg?: string | null;
};

type DialogMessagesResponse = {
  error?: string;
  foreignUser?: DialogUser | null;
  messages?: DialogMessage[];
  success?: boolean;
};

type MessageReactionEntry = {
  emoji: string;
  userId: string;
};

type MessageImage = {
  alt: string;
  isViewerImage: boolean;
  src: string;
};

type SevenTvSticker = {
  id: string;
  name: string;
  url: string;
};

type MessageTimelineItem =
  | {
      dayKey: string;
      kind: 'separator';
      label: string;
    }
  | {
      kind: 'message';
      message: DialogMessage;
    };

type ScrollAction =
  | {
      type: 'bottom';
    }
  | {
      prevHeight: number;
      prevTop: number;
      type: 'preserve';
    };

type WsPayloadData = Record<string, unknown> & {
  last_online?: number | string | null;
  last_seen_at?: number | string | null;
  lastonlinetime?: number | string | null;
  online?: boolean | null;
  online_at?: number | string | null;
  status?: string | null;
  user_id?: number | string | null;
};

type WsPayload = {
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

const DIALOGS_CACHE_KEY = 'dialogs-cache';
const DIALOGS_CACHE_TTL_MS = 15_000;
const DIALOGS_REFRESH_INTERVAL_MS = 20_000;
const MESSAGE_PAGE_SIZE = 30;
const MESSAGE_CACHE_LIMIT = 2000;
const IMGBB_API_KEY = '595c8d872da11fdaa5225badc67cc6e6';
const FALLBACK_AVATAR = '/includes/img/new_user.png';
const FALLBACK_WELCOME_IMAGE = '/includes/img/anlite/chats.png';
const NOTHING_FOUND_IMAGE = '/img/status/nothingfound.webp';
const SEVEN_TV_SEARCH_DEBOUNCE_MS = 700;
const SEVEN_TV_MIN_QUERY_LENGTH = 3;
const SEVEN_TV_SEARCH_CACHE_KEY = 'messages:7tv-search-cache:v1';
const SEVEN_TV_SEARCH_CACHE_MAX_ENTRIES = 40;
const SEVEN_TV_SEARCH_CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const STICKER_NAMES = [
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

const sevenTvStickerCache = new Map<string, SevenTvSticker | null>();
const sevenTvStickerPromiseCache = new Map<string, Promise<SevenTvSticker | null>>();
const sevenTvStickerSearchCache = new Map<string, SevenTvStickerSearchCacheEntry>();
let sevenTvStickerSearchCacheHydrated = false;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function Icon({
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

function toNumber(value: number | string | null | undefined) {
  const nextValue = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').trim();
}

function normalizeHash(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) {
    return normalizeHash(value[0]);
  }

  return normalizeText(value).replace(/^\/+/, '').replace(/\/+$/, '');
}

function normalizeAssetUrl(value: string | null | undefined, fallback: string) {
  const nextValue = normalizeText(value);
  if (!nextValue || nextValue === '""') return fallback;
  return nextValue;
}

function stripHtml(value: string | null | undefined) {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(value: string) {
  if (typeof window === 'undefined') return value;

  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

function decodeText(value: string | null | undefined) {
  return decodeHtml(normalizeText(value));
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getSevenTvStickerCacheKey(value: string) {
  return normalizeText(value).toLowerCase();
}

function buildSevenTvStickerProxyUrl(stickerId: string) {
  const normalizedStickerId = normalizeText(stickerId);
  if (!normalizedStickerId) {
    return '';
  }

  return `/api/V2/7tv/Image.php?id=${encodeURIComponent(normalizedStickerId)}`;
}

function getSevenTvStickerTokenData(value: string | null | undefined) {
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

function getCachedSevenTvSearchItems(cacheKey: string) {
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

function seedSevenTvStickerCache(items: SevenTvSticker[]) {
  items.forEach((item) => {
    const nextKey = getSevenTvStickerCacheKey(item.name);
    if (!nextKey) return;
    sevenTvStickerCache.set(nextKey, item);
  });
}

async function searchSevenTvStickers(
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
      { signal: options?.signal }
    );
    const items = Array.isArray(payload.items) ? payload.items : [];
    setCachedSevenTvSearchItems(cacheKey, items);
    seedSevenTvStickerCache(items);
    return items;
  } catch (err) {
    throw new Error(`7TV search failed: ${err}`);
  }
}

async function resolveSevenTvStickerByName(name: string) {
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

function extractMessageImages(value: string | null | undefined) {
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

function getMessageBodyHtmlWithoutImages(value: string | null | undefined) {
  return String(value ?? '').replace(/<img\b[^>]*>/gi, '').trim();
}

function getDialogImageKey(messageId: number, imageIndex: number) {
  return `msg:${messageId}:img:${imageIndex}`;
}

function hasMeaningfulValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const normalizedValue = normalizeText(value).toLowerCase();
    return normalizedValue !== '' && normalizedValue !== 'undefined' && normalizedValue !== 'null';
  }
  return true;
}

function mergeDialogUser(
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

function buildDialogImageSlides(messages: DialogMessage[]) {
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

function formatDialogPreview(messageValue: string | null | undefined, lang: LangMap) {
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

function isOnline(lastOnlineTime: number | string | null | undefined) {
  const onlineAt = toNumber(lastOnlineTime);
  if (!onlineAt) return false;
  return onlineAt + 500 >= Math.floor(Date.now() / 1000);
}

function resolvePresenceLastOnline(payload: WsPayload): number | null {
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

function parseReactions(reactions: string | null | undefined) {
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

function getDialogsCache() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(DIALOGS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      dialogs?: DialogListItem[];
      time?: number;
    };

    if (!Array.isArray(parsed.dialogs) || typeof parsed.time !== 'number') {
      return null;
    }

    return {
      dialogs: parsed.dialogs,
      time: parsed.time,
    };
  } catch {
    return null;
  }
}

function writeDialogsCache(dialogs: DialogListItem[]) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      DIALOGS_CACHE_KEY,
      JSON.stringify({
        dialogs,
        time: Date.now(),
      }),
    );
  } catch {
    // ignore cache write failures
  }
}

function getMessageCacheKey(userId: number, dialogId: number) {
  return `msg-cache:${userId}:${dialogId}`;
}

function readMessageCache(cacheKey: string) {
  if (typeof window === 'undefined' || !cacheKey) return null;

  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      dialog_hash?: string;
      dialog_id?: number | string;
      foreignUser?: DialogUser | null;
      messages?: DialogMessage[];
      time?: number;
    };

    if (!Array.isArray(parsed.messages)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function getMessageId(message: DialogMessage) {
  return toNumber(message.id);
}

function sortMessages(messages: DialogMessage[]) {
  return messages.slice().sort((left, right) => getMessageId(left) - getMessageId(right));
}

function getEarliestMessageId(messages: DialogMessage[]) {
  if (!messages.length) return 0;
  return getMessageId(messages[0]);
}

function getLatestMessageId(messages: DialogMessage[]) {
  if (!messages.length) return 0;
  return getMessageId(messages[messages.length - 1]);
}

function mergeMessages(existing: DialogMessage[], incoming: DialogMessage[]) {
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

function trimMessageCache(messages: DialogMessage[], keepSide: 'newest' | 'oldest') {
  if (messages.length <= MESSAGE_CACHE_LIMIT) {
    return messages;
  }

  return keepSide === 'oldest'
    ? messages.slice(0, MESSAGE_CACHE_LIMIT)
    : messages.slice(messages.length - MESSAGE_CACHE_LIMIT);
}

function writeMessageCache({
  cacheKey,
  dialogHash,
  dialogId,
  foreignUser,
  keepSide,
  messages,
}: {
  cacheKey: string;
  dialogHash: string;
  dialogId: number;
  foreignUser?: DialogUser | null;
  keepSide: 'newest' | 'oldest';
  messages: DialogMessage[];
}) {
  if (typeof window === 'undefined' || !cacheKey) return;

  try {
    window.localStorage.setItem(
      cacheKey,
      JSON.stringify({
        dialog_hash: dialogHash,
        dialog_id: dialogId,
        foreignUser: foreignUser ?? null,
        messages: trimMessageCache(sortMessages(messages), keepSide),
        time: Date.now(),
      }),
    );
  } catch {
    // ignore cache write failures
  }
}

function parseMessageDate(message: DialogMessage) {
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

function formatMessageTime(message: DialogMessage) {
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

function buildTimelineItems(messages: DialogMessage[], lang: LangMap) {
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

function getEditableMessageText(message: DialogMessage) {
  return decodeHtml(stripHtml(message.message));
}

function getPayloadMessageId(payload: unknown) {
  if (!payload || typeof payload !== 'object') return 0;

  const directId = toNumber((payload as WsPayload).message_id);
  if (directId) return directId;

  const dataId = toNumber((payload as WsPayload).data?.message_id as string | number | null);
  return dataId;
}

function getPayloadMessageText(payload: unknown) {
  if (!payload || typeof payload !== 'object') return '';

  const directText = normalizeText((payload as WsPayload).new_text as string | null | undefined);
  if (directText) return directText;

  return normalizeText((payload as WsPayload).data?.new_text as string | null | undefined);
}

function shouldStickToBottom(element: HTMLDivElement | null) {
  if (!element) return true;
  return element.scrollHeight - element.scrollTop - element.clientHeight < 180;
}

function getDialogTitle(user: DialogUser | null) {
  if (!user) return '';
  return [decodeText(user.fname), decodeText(user.lname)].filter(Boolean).join(' ');
}

function getMessageStatusIconName(status: number | string | null | undefined) {
  return String(status) === '0' ? 'IC-check' : 'IC-double-check';
}

function getDialogPreviewStatusIconName(status: number | string | null | undefined) {
  return String(status) === '0' ? 'IC-check' : 'IC-double-check';
}

function isMessageMenuIgnoredTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('a, button, img'));
}

function SevenTvStickerMessage({
  stickerId,
  stickerName,
}: {
  stickerId?: string;
  stickerName: string;
}) {
  const directStickerUrl = buildSevenTvStickerProxyUrl(stickerId ?? '');
  const cacheKey = getSevenTvStickerCacheKey(stickerName);
  const cachedSticker = cacheKey ? sevenTvStickerCache.get(cacheKey) : undefined;
  const [resolvedState, setResolvedState] = useState<{
    key: string;
    sticker: SevenTvSticker | null;
  } | null>(() => (
    cacheKey && cachedSticker !== undefined
      ? { key: cacheKey, sticker: cachedSticker }
      : null
  ));
  const resolvedSticker = cachedSticker !== undefined
    ? cachedSticker
    : resolvedState?.key === cacheKey
      ? resolvedState.sticker
      : null;

  useEffect(() => {
    let cancelled = false;

    if (!cacheKey || directStickerUrl) {
      return undefined;
    }

    if (cachedSticker !== undefined) {
      return undefined;
    }

    void resolveSevenTvStickerByName(stickerName).then((resolvedSticker) => {
      if (cancelled) return;
      setResolvedState({
        key: cacheKey,
        sticker: resolvedSticker,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, cachedSticker, directStickerUrl, stickerName]);

  if (directStickerUrl || resolvedSticker?.url) {
    return (
      <div className="overflow-hidden rounded-lg">
        <Image
          src={directStickerUrl || resolvedSticker?.url || ''}
          alt={resolvedSticker?.name || stickerName}
          unoptimized
          width={220}
          height={220}
          className="h-auto max-h-48 w-auto max-w-full rounded-lg object-contain shadow lg:max-h-64"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-24 min-w-24 items-center justify-center rounded-2xl bg-zinc-900/70 px-3 py-2 text-center text-sm text-zinc-300 shadow">
      7TV: {stickerName}
    </div>
  );
}

function StickerPickerDropdownContent({
  isOpen,
  isSending,
  onSendNativeSticker,
  onSendSevenTvSticker,
}: {
  isOpen: boolean;
  isSending: boolean;
  onSendNativeSticker: (stickerName: string) => void;
  onSendSevenTvSticker: (sticker: SevenTvSticker) => void;
}) {
  const [tab, setTab] = useState<'native' | '7tv'>('native');
  const [searchInput, setSearchInput] = useState('');
  const [searchState, setSearchState] = useState<{
    error: string;
    items: SevenTvSticker[];
    key: string;
  } | null>(null);
  const [loadingKey, setLoadingKey] = useState('');
  const searchVersionRef = useRef(0);

  const normalizedQuery = normalizeText(searchInput);
  const effectiveQuery = normalizedQuery === ''
    ? ''
    : normalizedQuery.length >= SEVEN_TV_MIN_QUERY_LENGTH
      ? normalizedQuery
      : null;
  const searchCacheKey = effectiveQuery === null
    ? ''
    : `${getSevenTvStickerCacheKey(effectiveQuery)}:0:24`;
  const cachedResults = searchCacheKey ? getCachedSevenTvSearchItems(searchCacheKey) : null;
  const visibleResults = cachedResults ?? (searchState?.key === searchCacheKey ? searchState.items : []);
  const visibleError = searchState?.key === searchCacheKey ? searchState.error : '';
  const isSevenTvLoading = Boolean(
    isOpen
    && tab === '7tv'
    && searchCacheKey
    && loadingKey === searchCacheKey
    && cachedResults === null,
  );

  useEffect(() => {
    if (!isOpen || tab !== '7tv' || effectiveQuery === null || !searchCacheKey || cachedResults !== null) {
      return undefined;
    }

    const requestId = searchVersionRef.current + 1;
    searchVersionRef.current = requestId;
    const abortController = new AbortController();

    const timeoutId = window.setTimeout(() => {
      setLoadingKey(searchCacheKey);

      void searchSevenTvStickers(effectiveQuery, {
        signal: abortController.signal,
      })
        .then((items) => {
          if (searchVersionRef.current !== requestId) return;
          setSearchState({
            error: '',
            items,
            key: searchCacheKey,
          });
          setLoadingKey((currentKey) => (currentKey === searchCacheKey ? '' : currentKey));
        })
        .catch((error) => {
          if (searchVersionRef.current !== requestId) return;
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }

          console.error('Failed to search 7TV stickers', error);
          setSearchState({
            error: '7TV временно недоступен',
            items: [],
            key: searchCacheKey,
          });
          setLoadingKey((currentKey) => (currentKey === searchCacheKey ? '' : currentKey));
        });
    }, SEVEN_TV_SEARCH_DEBOUNCE_MS);

    return () => {
      abortController.abort();
      window.clearTimeout(timeoutId);
    };
  }, [cachedResults, effectiveQuery, isOpen, searchCacheKey, tab]);

  return (
    <div className="flex w-[17rem] flex-col relative">
      <div className="flex gap-1.5 p-1.5 pb-0 absolute inset-x-0 top-0 bg-gradient-to-b from-black via-black/90 to-transparent">
        <button
          type="button"
          onClick={() => {
            setTab('native');
          }}
          className={cn(
            'cursor-pointer backdrop-blur-lg backdrop-saturate-200  flex-1 rounded-3xl border border-zinc-600/30 px-3 py-2 text-sm font-medium duration-300 active:scale-95',
            tab === 'native'
              ? 'bg-zinc-700 text-white'
              : 'bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200',
          )}
        >
          Стикеры
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('7tv');
          }}
          className={cn(
            'flex items-center justify-center cursor-pointer backdrop-blur-lg backdrop-saturate-200  flex-1 rounded-3xl border border-zinc-600/30 px-3 py-2 text-sm font-medium duration-300 active:scale-95',
            tab === '7tv'
              ? 'bg-zinc-700 text-white'
              : 'bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200',
          )}
        >
          <img src="/img/branding/7tv.svg?id=-1" alt="7TV" className="h-5 w-5" />
        </button>
      </div>

      {tab === 'native' ? (
        <div className="grid max-h-72 grid-cols-4 gap-1.5 overflow-y-auto overflow-x-hidden p-1.5 pt-[54px]">
          {STICKER_NAMES.map((stickerName) => (
            <button
              key={stickerName}
              type="button"
              onClick={() => {
                onSendNativeSticker(stickerName);
              }}
              disabled={isSending}
              className="cursor-pointer shrink-0 h-16 w-16 overflow-hidden rounded-2xl duration-300 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
            >
              <img
                src={`/includes/img/anlite/stickers/webp/${stickerName}.webp?id=NEW`}
                alt={stickerName}
                className="h-16 w-16 object-contain"
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="max-h-72 flex flex-col items-center overflow-y-auto overflow-x-hidden px-1.5 pt-[54px] pb-[58px]">
            {isSevenTvLoading ? (
              <div className="flex h-52 w-62 items-center justify-center">
                <Icon name="IC-loader" className="h-6 w-6 animate-spin fill-zinc-300" />
              </div>
            ) : visibleError ? (
              <div className="h-52 w-62 flex items-center justify-center text-center px-2 py-3 text-xs text-zinc-400">
                {visibleError}
              </div>
            ) : visibleResults.length ? (
              <div className="grid grid-cols-4 gap-1.5">
                {visibleResults.map((sticker) => (
	                  <button
	                    key={sticker.id}
	                    type="button"
                    onClick={() => {
                      onSendSevenTvSticker(sticker);
                    }}
                    disabled={isSending}
	                    className="cursor-pointer shrink-0 h-16 w-16 overflow-hidden rounded-2xl duration-300 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
	                    title={sticker.name}
	                  >
	                    <Image
	                      src={sticker.url}
	                      alt={sticker.name}
	                      unoptimized
	                      width={64}
	                      height={64}
	                      className="h-16 w-16 object-contain"
	                    />
	                  </button>
	                ))}
              </div>
            ) : normalizedQuery && normalizedQuery.length < SEVEN_TV_MIN_QUERY_LENGTH ? (
              <div className="h-52 w-62 flex items-center justify-center text-center px-2 py-3 text-xs text-zinc-400">
                Введите минимум {SEVEN_TV_MIN_QUERY_LENGTH} символа
              </div>
            ) : normalizedQuery ? (
              <div className="h-52 w-62 flex items-center justify-center text-center px-2 py-3 text-xs text-zinc-400">
                Ничего не найдено
              </div>
            ) : (
              <div className="h-52 w-62 flex items-center justify-center text-center px-2 py-3 text-xs text-zinc-500">
                Популярные стикеры 7TV
              </div>
            )}
          </div>

          <div className="absolute bottom-0 inset-x-0 p-1.5 pt-0">
            <div className="relative">
              <input
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                  }
                }}
                placeholder="Поиск 7TV"
                autoComplete="off"
                className="backdrop-blur-lg backdrop-saturate-200 h-10 w-full rounded-3xl border border-zinc-600/30 bg-zinc-950/80 px-3 text-sm text-white placeholder-zinc-500 outline-none duration-300 focus:border-zinc-500/50"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  authUserImage,
  currentUserId,
  foreignUser,
  lang,
  message,
  onAddReaction,
  onDeleteMessage,
  onDeleteReaction,
  onEditMessage,
  onOpenImage,
}: {
  authUserImage: string;
  currentUserId: number;
  foreignUser: DialogUser | null;
  lang: LangMap;
  message: DialogMessage;
  onAddReaction: (messageId: number, reaction: string) => void;
  onDeleteMessage: (message: DialogMessage) => void;
  onDeleteReaction: (messageId: number, reaction: string) => void;
  onEditMessage: (message: DialogMessage) => void;
  onOpenImage: (imageKey: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const messageId = getMessageId(message);
  const isOwn = toNumber(message.sender_id) === currentUserId;
  const isTextMessage = String(message.type ?? '0') === '0';
  const messageImages = extractMessageImages(message.message);
  const messageBodyHtml = messageImages.length
    ? getMessageBodyHtmlWithoutImages(message.message)
    : String(message.message ?? '');
  const sevenTvStickerTokenData = messageImages.length ? null : getSevenTvStickerTokenData(messageBodyHtml);
  const sevenTvStickerName = sevenTvStickerTokenData?.name ?? '';
  const sevenTvStickerId = sevenTvStickerTokenData?.id ?? '';
  const hasMessageText = !sevenTvStickerName && Boolean(stripHtml(messageBodyHtml));
  const isStickerOnlyMessage = Boolean(sevenTvStickerName);
  const canTranslateMessage = !isOwn && isTextMessage && !isStickerOnlyMessage;
  const canEditMessage = isOwn && isTextMessage && !isStickerOnlyMessage;
  const reactions = parseReactions(message.reactions);
  const timeLabel = formatMessageTime(message);
  const translator = typeof window !== 'undefined'
    ? (window as Window & { translate?: (targetId: string) => void }).translate
    : undefined;

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const stopLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const startLongPress = () => {
    stopLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      setMenuOpen(true);
    }, 500);
  };

  return (
    <div
      className={cn('relative mb-2', menuOpen && 'z-20')}
      onContextMenu={(event) => {
        if (isMessageMenuIgnoredTarget(event.target)) return;
        event.preventDefault();
        setMenuOpen(true);
      }}
      onMouseDown={(event) => {
        if (event.button !== 0) return;
        if (isMessageMenuIgnoredTarget(event.target)) return;
        startLongPress();
      }}
      onMouseLeave={stopLongPress}
      onMouseUp={stopLongPress}
      onTouchEnd={stopLongPress}
      onTouchMove={stopLongPress}
      onTouchStart={(event) => {
        if (isMessageMenuIgnoredTarget(event.target)) return;
        startLongPress();
      }}
    >
      <div className={cn('flex w-full', isOwn ? 'justify-end' : 'justify-start')} style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
        <div className="relative flex flex-col">
          <div
            id={`msg-${messageId}`}
            className={cn(
              'flex max-w-[90vw] lg:max-w-[40vw] flex-col rounded-2xl p-1 text-left font-normal break-words lg:text-lg',
              isOwn && isTextMessage && !isStickerOnlyMessage && 'rounded-br-lg bg-purple-700',
              !isOwn && isTextMessage && !isStickerOnlyMessage && 'rounded-bl-lg bg-zinc-900',
            )}
          >
            <div id={`msg-body-${messageId}`} className="flex flex-col gap-2">
              {messageImages.length ? (
                <div
                  className={cn(
                    'flex flex-col gap-2',
                    messageImages.length > 1 && 'sm:grid sm:grid-cols-2',
                  )}
                >
                  {messageImages.map((image, imageIndex) => (
                    !image.isViewerImage ? (
                      <div
                        key={getDialogImageKey(messageId, imageIndex)}
                        className="overflow-hidden rounded-lg"
                      >
                        <img
                          src={image.src}
                          alt={image.alt || `Sticker ${imageIndex + 1}`}
                          className="max-h-48 max-w-full rounded-lg object-contain shadow lg:max-h-64"
                        />
                      </div>
                    ) : (
                      <button
                        key={getDialogImageKey(messageId, imageIndex)}
                        type="button"
                        onClick={() => {
                          onOpenImage(getDialogImageKey(messageId, imageIndex));
                        }}
                        className="cursor-pointer overflow-hidden rounded-lg duration-300 active:scale-95"
                      >
                        <img
                          src={image.src}
                          alt={image.alt || `Message image ${imageIndex + 1}`}
                          className="max-h-48 max-w-full rounded-lg object-cover shadow lg:max-h-64"
                        />
                      </button>
                    )
                  ))}
                </div>
              ) : null}

              {sevenTvStickerName ? (
                <SevenTvStickerMessage stickerId={sevenTvStickerId} stickerName={sevenTvStickerName} />
              ) : null}

              {hasMessageText ? (
                <span dangerouslySetInnerHTML={{ __html: messageBodyHtml }} />
              ) : null}
            </div>

            <div className="mt-1 flex items-end justify-end gap-1">
              <div className="flex flex-1 flex-wrap items-center gap-1">
                {reactions.map((reaction, index) => {
                  const ownReaction = reaction.userId === String(currentUserId);
                  const avatar = ownReaction
                    ? normalizeAssetUrl(authUserImage, FALLBACK_AVATAR)
                    : normalizeAssetUrl(foreignUser?.img, FALLBACK_AVATAR);

                  return (
                    <button
                      key={`${reaction.userId}:${reaction.emoji}:${index}`}
                      type="button"
                      onClick={() => {
                        if (!ownReaction) return;
                        onDeleteReaction(messageId, reaction.emoji);
                      }}
                      className={cn(
                        'flex items-center justify-center rounded-full bg-zinc-700/80 shadow',
                        ownReaction && 'cursor-pointer duration-300 hover:scale-110 hover:bg-zinc-600',
                      )}
                    >
                      <img
                        src={avatar}
                        alt=""
                        className="h-5 w-5 rounded-full object-cover shadow"
                      />
                      <span className="px-1 text-sm text-zinc-200">{reaction.emoji}</span>
                    </button>
                  );
                })}
              </div>

              {timeLabel ? (
                <span
                  className={cn(
                    'select-none whitespace-nowrap text-[10px]',
                    isOwn ? 'text-zinc-300' : 'text-zinc-400',
                  )}
                >
                  {timeLabel}
                </span>
              ) : null}

              {isOwn ? (
                <Icon
                  name={getMessageStatusIconName(message.status)}
                  className={cn(
                    'h-3 w-3',
                    String(message.status ?? '0') === '0' ? 'fill-zinc-200' : 'fill-zinc-200',
                  )}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <Dropdown
        open={menuOpen}
        onOpenChange={setMenuOpen}
        renderTrigger={false}
        position="top"
        align={isOwn ? 'end' : 'start'}
        width="auto"
        wrapperClassName="pointer-events-none absolute left-0 right-0 -top-12 z-30 h-0"
        menuClassName="pointer-events-auto w-fit overflow-hidden rounded-2xl bg-zinc-900/85"
      >
        <div className="flex items-center justify-center gap-1 px-1.5 py-1 text-3xl">
          {['😀', '👍', '😍', '💖', '😲', '🤬'].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onAddReaction(messageId, emoji);
              }}
              className="cursor-pointer duration-300 hover:scale-125 active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>

        {canTranslateMessage && typeof translator === 'function' ? (
          <DropdownItem
            icon="IC-translate"
            className="h-8"
            onClick={() => {
              translator(`msg-body-${messageId}`);
            }}
          >
            {lang?.translate || 'Перевести'}
          </DropdownItem>
        ) : null}

        {isOwn ? (
          <DropdownItem
            icon="IC-times"
            className="h-8"
            onClick={() => {
              onDeleteMessage(message);
            }}
          >
            {lang?.delete || 'Удалить'}
          </DropdownItem>
        ) : null}

        {canEditMessage ? (
          <DropdownItem
            icon="IC-edit"
            className="h-8"
            onClick={() => {
              onEditMessage(message);
            }}
          >
            {lang?.edit || 'Редактировать'}
          </DropdownItem>
        ) : null}
      </Dropdown>
    </div>
  );
}

export default function MessagesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading: authLoading, lang, user } = useAuth();
  const { showNote } = useNotification();
  const { isPlaying, togglePlay } = usePulsePlayer();

  // Next.js useParams in a layout might not see child segment params.
  // So we extract it from the pathname directly.
  const pathParts = pathname.split('/').filter(Boolean);
  const hashFromPath = pathParts[1] || '';
  const paramsHash = normalizeHash(hashFromPath);
  
  const [routeHash, setRouteHash] = useState(paramsHash);

  useEffect(() => {
    setRouteHash(paramsHash);
  }, [paramsHash]);
  const currentUserId = toNumber(user?.id);
  const authUserImage = normalizeAssetUrl(user?.img, FALLBACK_AVATAR);

  const [dialogs, setDialogs] = useState<DialogListItem[]>([]);
  const [dialogsLoading, setDialogsLoading] = useState(true);
  const [dialogsError, setDialogsError] = useState('');
  const [selectedDialog, setSelectedDialog] = useState<DialogMeta | null>(null);
  const [foreignUser, setForeignUser] = useState<DialogUser | null>(null);
  const [dialogPresenceOnline, setDialogPresenceOnline] = useState<boolean | null>(null);
  const [blockedDialog, setBlockedDialog] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [messages, setMessages] = useState<DialogMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadingNewer, setLoadingNewer] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [composerText, setComposerText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [deleteDialogModalOpen, setDeleteDialogModalOpen] = useState(false);
  const [editMessageModalOpen, setEditMessageModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<DialogMessage | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [uploadingMessageImage, setUploadingMessageImage] = useState(false);
  const [uploadingDialogBackground, setUploadingDialogBackground] = useState(false);
  const [activeDialogImageKey, setActiveDialogImageKey] = useState<string | null>(null);
  const [dayLabelTick, setDayLabelTick] = useState(Date.now());
  const [stickerDropdownOpen, setStickerDropdownOpen] = useState(false);

  const [hasActiveCall, setHasActiveCall] = useState(false);
  const activeCallTimeoutRef = useRef<number | null>(null);
  
  const dialogsInFlightRef = useRef(false);
  const dialogsLastFetchAtRef = useRef(0);
  const dialogSessionRef = useRef(0);
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const wsRefreshTimerRef = useRef<number | null>(null);
  const scrollActionRef = useRef<ScrollAction | null>(null);
  const currentDialogIdRef = useRef(0);
  const currentDialogHashRef = useRef('');
  const currentForeignUserRef = useRef<DialogUser | null>(null);
  const currentForeignUserIdRef = useRef(0);
  const currentMessageCacheKeyRef = useRef('');

  const timelineItems = buildTimelineItems(messages, lang);
  const dialogImageSlides = buildDialogImageSlides(messages);
  const activeDialogImageIndex = activeDialogImageKey
    ? dialogImageSlides.findIndex((image) => image.key === activeDialogImageKey)
    : -1;
  const resolvedActiveDialogImageIndex = activeDialogImageIndex >= 0 ? activeDialogImageIndex : null;
  void dayLabelTick;

  const dialogTitle = getDialogTitle(foreignUser);
  const dialogBackgroundUrl = normalizeAssetUrl(selectedDialog?.img, '');
  const selectedDialogId = toNumber(selectedDialog?.id);
  const wsPresencePayload = useSyncExternalStore<WsPayload | null>(
    globalWS.subscribePresenceStore,
    () => {
      const foreignUserId = toNumber(foreignUser?.id);
      return foreignUserId > 0 ? globalWS.getPresencePayload(foreignUserId) : null;
    },
    () => null,
  );
  const wsPresenceLastOnline: number | null = wsPresencePayload
    ? resolvePresenceLastOnline(wsPresencePayload)
    : null;
  const dialogOnline =
    wsPresenceLastOnline === null
      ? dialogPresenceOnline === null
        ? isOnline(foreignUser?.lastonlinetime)
        : dialogPresenceOnline
      : wsPresenceLastOnline > 0 && isOnline(wsPresenceLastOnline);
  const dialogStatusLabel = blockedDialog
    ? ''
    : dialogLoading || messagesLoading || loadingNewer
      ? lang?.['updating...'] || 'Обновление...'
      : dialogOnline
        ? lang?.online || 'В сети'
        : lang?.offline || 'Не в сети';

  useEffect(() => {
    if (!activeDialogImageKey) return;

    const hasActiveImage = dialogImageSlides.some((image) => image.key === activeDialogImageKey);
    if (!hasActiveImage) {
      setActiveDialogImageKey(null);
    }
  }, [activeDialogImageKey, dialogImageSlides]);

  useEffect(() => {
    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0,
        0,
      );

      const delay = Math.max(250, nextMidnight.getTime() - now.getTime() + 400);

      const timer = window.setTimeout(() => {
        setDayLabelTick(Date.now());
        scheduleMidnightRefresh();
      }, delay);

      return timer;
    };

    const timer = scheduleMidnightRefresh();
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    currentDialogIdRef.current = toNumber(selectedDialog?.id);
    currentDialogHashRef.current = normalizeHash(selectedDialog?.hash);
    currentForeignUserRef.current = foreignUser;
    currentForeignUserIdRef.current = toNumber(foreignUser?.id);
    currentMessageCacheKeyRef.current = currentDialogIdRef.current
      ? getMessageCacheKey(currentUserId, currentDialogIdRef.current)
      : '';
  }, [currentUserId, foreignUser, selectedDialog?.hash, selectedDialog?.id]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push(`/login?backurl=${encodeURIComponent(pathname)}`);
    }
  }, [authLoading, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    document.documentElement.classList.toggle('messages-dialog-open', Boolean(routeHash));
    document.body.classList.toggle('messages-dialog-open-body', Boolean(routeHash));
    return () => {
      document.documentElement.classList.remove('messages-dialog-open');
      document.body.classList.remove('messages-dialog-open-body');
    };
  }, [routeHash]);

  const notify = ({
    content,
    time = 3,
    type = 'info',
  }: {
    content: React.ReactNode;
    time?: number;
    type?: 'error' | 'info' | 'success';
  }) => {
    showNote({
      content,
      time,
      type,
    });
  };

  const teardownWs = () => {
    const dialogId = currentDialogIdRef.current;
    const foreignUserId = currentForeignUserIdRef.current;

    if (dialogId > 0) {
      globalWS.unsubscribeDialog(dialogId);
    }

    if (foreignUserId > 0) {
      globalWS.removePresenceListener(foreignUserId, handlePresenceUpdate);
    }
    globalWS.removeGlobalPresenceListener(handlePresenceUpdate);

    globalWS.removeDialogListener('message:new', handleWsMessageNew);
    globalWS.removeDialogListener('message:deleted', handleWsMessageDeleted);
    globalWS.removeDialogListener('message:edited', handleWsMessageEdited);
    globalWS.removeDialogListener('message:reaction', handleWsMessageReaction);
    globalWS.removeDialogListener('call:signal', handleWsCallSignal);

    if (wsRefreshTimerRef.current !== null) {
      window.clearTimeout(wsRefreshTimerRef.current);
      wsRefreshTimerRef.current = null;
    }
  };

  const resetDialogState = () => {
    teardownWs();
    setSelectedDialog(null);
    setForeignUser(null);
    currentForeignUserRef.current = null;
    setDialogPresenceOnline(null);
    setBlockedDialog(false);
    setDialogLoading(false);
    setDialogError('');
    setMessages([]);
    setMessagesLoading(false);
    setLoadingOlder(false);
    setLoadingNewer(false);
    setHasMoreMessages(true);
    setComposerText('');
    setSettingsModalOpen(false);
    setDeleteDialogModalOpen(false);
    setEditMessageModalOpen(false);
    setEditingMessage(null);
    setEditingValue('');
    setActiveDialogImageKey(null);
    setActiveDialogImageKey(null);
    scrollActionRef.current = null;
    setHasActiveCall(false);
    if (activeCallTimeoutRef.current !== null) {
      window.clearTimeout(activeCallTimeoutRef.current);
      activeCallTimeoutRef.current = null;
    }
  };

  const loadDialogs = async ({ force = false }: { force?: boolean } = {}) => {
    if (!isAuthenticated) return;

    const dialogCache = getDialogsCache();
    if (!force && dialogCache && Date.now() - dialogCache.time < DIALOGS_CACHE_TTL_MS) {
      setDialogs(dialogCache.dialogs);
      setDialogsLoading(false);
    }

    if (dialogsInFlightRef.current) return;
    if (!force && dialogsLastFetchAtRef.current && Date.now() - dialogsLastFetchAtRef.current < 5000) {
      return;
    }

    dialogsInFlightRef.current = true;
    dialogsLastFetchAtRef.current = Date.now();

    try {
      const result = await AncialAPI.getDialogList<DialogListResponse>();
      const nextDialogs = Array.isArray(result) ? result : Array.isArray((result as any).dialogs) ? (result as any).dialogs : [];
      setDialogs(nextDialogs);
      setDialogsError('');
      setDialogsLoading(false);
      writeDialogsCache(nextDialogs);
    } catch (error) {
      console.error('Failed to load dialogs', error);

      if (!dialogs.length) {
        setDialogsError(error instanceof Error ? error.message : 'Связь потеряна');
        setDialogsLoading(false);
      }
    } finally {
      dialogsInFlightRef.current = false;
    }
  };

  const persistMessages = ({
    foreignUserValue,
    keepSide,
    nextMessages,
  }: {
    foreignUserValue?: DialogUser | null;
    keepSide: 'newest' | 'oldest';
    nextMessages: DialogMessage[];
  }) => {
    const dialogId = currentDialogIdRef.current;
    const dialogHash = currentDialogHashRef.current;
    const cacheKey = currentMessageCacheKeyRef.current;
    if (!dialogId || !dialogHash || !cacheKey) return;

    writeMessageCache({
      cacheKey,
      dialogHash,
      dialogId,
      foreignUser: foreignUserValue ?? foreignUser,
      keepSide,
      messages: nextMessages,
    });
  };

  const loadMessagesInitial = async (session: number) => {
    const dialogId = currentDialogIdRef.current;
    const dialogHash = currentDialogHashRef.current;
    const cacheKey = currentMessageCacheKeyRef.current;

    if (!dialogId || !dialogHash || !cacheKey) return;

    setMessagesLoading(true);

    const cached = readMessageCache(cacheKey);
    const cachedMessages = cached?.messages ? sortMessages(cached.messages) : [];
    const lastCachedId = getLatestMessageId(cachedMessages);

    if (cachedMessages.length) {
      scrollActionRef.current = { type: 'bottom' };
      setMessages(cachedMessages);
      if (cached?.foreignUser) {
        setForeignUser((currentForeignUser) => {
          const nextForeignUser = mergeDialogUser(currentForeignUser, cached.foreignUser);
          currentForeignUserRef.current = nextForeignUser;
          return nextForeignUser;
        });
      }
    } else {
      scrollActionRef.current = { type: 'bottom' };
      setMessages([]);
    }

    try {
      const result = await AncialAPI.getDialog<DialogMessagesResponse>(dialogId, undefined, MESSAGE_PAGE_SIZE);

      if (session !== dialogSessionRef.current) return;

      const nextMessages = Array.isArray(result) ? result : Array.isArray((result as any).messages) ? (result as any).messages : [];
      const newForeignUser = (result as any).foreignUser;

      const freshMessages = sortMessages(nextMessages);
      const mergedMessages = mergeMessages(cachedMessages, freshMessages);
      const nextForeignUser = mergeDialogUser(currentForeignUserRef.current, newForeignUser);

      if (nextForeignUser) {
        currentForeignUserRef.current = nextForeignUser;
        setForeignUser(nextForeignUser);
      }

      setMessages(mergedMessages);
      setHasMoreMessages(getEarliestMessageId(mergedMessages) > 1);
      persistMessages({
        foreignUserValue: nextForeignUser,
        keepSide: 'newest',
        nextMessages: mergedMessages,
      });

      scrollActionRef.current = { type: 'bottom' };

      if (lastCachedId > getLatestMessageId(freshMessages)) {
        void loadMessagesNewer(session);
      }
    } catch (error) {
      console.error('Failed to load messages', error);

      if (!cachedMessages.length) {
        setDialogError(error instanceof Error ? error.message : 'Не удалось загрузить диалог');
      }
    } finally {
      if (session === dialogSessionRef.current) {
        setMessagesLoading(false);
      }
    }
  };

  const loadMessagesNewer = async (session = dialogSessionRef.current) => {
    const dialogId = currentDialogIdRef.current;
    const cacheKey = currentMessageCacheKeyRef.current;

    if (!dialogId || !cacheKey || loadingNewer) return;

    setLoadingNewer(true);

    const cached = readMessageCache(cacheKey);
    const currentMessages = cached?.messages ? sortMessages(cached.messages) : sortMessages(messages);
    const latestId = getLatestMessageId(currentMessages);
    const stickToBottom = shouldStickToBottom(messageScrollRef.current);

    try {
      const result = await AncialAPI.getDialog<DialogMessagesResponse>(
        dialogId,
        undefined,
        latestId ? 200 : MESSAGE_PAGE_SIZE,
        latestId
      );

      if (session !== dialogSessionRef.current) return;

      const nextMessages = Array.isArray(result) ? result : Array.isArray((result as any).messages) ? (result as any).messages : [];
      const newForeignUser = (result as any).foreignUser;

      const newerMessages = sortMessages(nextMessages);
      if (!newerMessages.length) return;

      const mergedMessages = mergeMessages(currentMessages, newerMessages);
      const nextForeignUser = mergeDialogUser(currentForeignUserRef.current, newForeignUser);
      setMessages(mergedMessages);

      if (nextForeignUser) {
        currentForeignUserRef.current = nextForeignUser;
        setForeignUser(nextForeignUser);
      }

      persistMessages({
        foreignUserValue: nextForeignUser,
        keepSide: 'newest',
        nextMessages: mergedMessages,
      });

      if (stickToBottom) {
        scrollActionRef.current = { type: 'bottom' };
      }
    } catch (error) {
      console.error('Failed to load newer messages', error);
    } finally {
      if (session === dialogSessionRef.current) {
        setLoadingNewer(false);
      }
    }
  };

  const loadMessagesOlder = async (session = dialogSessionRef.current) => {
    const dialogId = currentDialogIdRef.current;
    const cacheKey = currentMessageCacheKeyRef.current;

    if (!dialogId || !cacheKey || loadingOlder || !hasMoreMessages) return;

    const cached = readMessageCache(cacheKey);
    const currentMessages = cached?.messages ? sortMessages(cached.messages) : sortMessages(messages);
    const earliestId = getEarliestMessageId(currentMessages);

    if (!earliestId || earliestId <= 1) {
      setHasMoreMessages(false);
      return;
    }

    const scrollContainer = messageScrollRef.current;
    scrollActionRef.current = {
      prevHeight: scrollContainer?.scrollHeight ?? 0,
      prevTop: scrollContainer?.scrollTop ?? 0,
      type: 'preserve',
    };

    setLoadingOlder(true);

    try {
      const result = await AncialAPI.getDialog<DialogMessagesResponse>(
        dialogId,
        undefined,
        MESSAGE_PAGE_SIZE,
        undefined,
        earliestId
      );

      if (session !== dialogSessionRef.current) return;

      const nextMessages = Array.isArray(result) ? result : Array.isArray((result as any).messages) ? (result as any).messages : [];
      const newForeignUser = (result as any).foreignUser;

      const olderMessages = sortMessages(nextMessages);
      if (!olderMessages.length) {
        setHasMoreMessages(false);
        scrollActionRef.current = null;
        return;
      }

      const mergedMessages = mergeMessages(currentMessages, olderMessages);
      const nextForeignUser = mergeDialogUser(currentForeignUserRef.current, newForeignUser);
      setMessages(mergedMessages);
      currentForeignUserRef.current = nextForeignUser;
      setForeignUser(nextForeignUser);
      persistMessages({
        foreignUserValue: nextForeignUser,
        keepSide: 'oldest',
        nextMessages: mergedMessages,
      });
      setHasMoreMessages(getEarliestMessageId(mergedMessages) > 1);
    } catch (error) {
      console.error('Failed to load older messages', error);
      scrollActionRef.current = null;
    } finally {
      if (session === dialogSessionRef.current) {
        setLoadingOlder(false);
      }
    }
  };

  const loadDialogByHash = async (hash: string, session: number) => {
    setDialogLoading(true);
    setDialogError('');
    setBlockedDialog(false);
    setSelectedDialog(null);
    setForeignUser(null);
    setDialogPresenceOnline(null);
    setMessages([]);
    setHasMoreMessages(true);
    setLoadingOlder(false);
    setLoadingNewer(false);

    try {
      const result = await AncialAPI.getDialogByHash<DialogByHashResponse>(hash);

      if (session !== dialogSessionRef.current) return;

      const dialogMeta = (result as any).dialog || result;

      if (!dialogMeta || !dialogMeta.id) {
        if ((result as any).blocked) {
          setBlockedDialog(true);
          setDialogError((result as any).error || 'Диалог заблокирован');
          return;
        }

        throw new Error((result as any).error || 'Диалог не найден');
      }

      const nextDialog = dialogMeta;
      const nextForeignUser = mergeDialogUser(null, (result as any).foreignUser);

      setSelectedDialog(nextDialog);
      setForeignUser(nextForeignUser);
      currentForeignUserRef.current = nextForeignUser;
      setBlockedDialog(Boolean((result as any).blocked));

      currentDialogIdRef.current = toNumber(nextDialog.id);
      currentDialogHashRef.current = normalizeHash(nextDialog.hash ?? hash);
      currentForeignUserIdRef.current = toNumber(nextForeignUser?.id);
      currentMessageCacheKeyRef.current = currentDialogIdRef.current
        ? getMessageCacheKey(currentUserId, currentDialogIdRef.current)
        : '';

      await loadMessagesInitial(session);
    } catch (error) {
      console.error('Failed to load dialog by hash', error);

      if (session !== dialogSessionRef.current) return;

      setDialogError(error instanceof Error ? error.message : 'Не удалось открыть диалог');
      router.replace('/messages');
    } finally {
      if (session === dialogSessionRef.current) {
        setDialogLoading(false);
      }
    }
  };

  const handlePresenceUpdate = (userId: number, payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const currentForeignUserId = currentForeignUserIdRef.current;
    if (currentForeignUserId > 0 && userId !== currentForeignUserId) return;

    const nextLastOnline = resolvePresenceLastOnline(payload as WsPayload);
    if (nextLastOnline === null) return;
    const nextPresenceOnline = nextLastOnline > 0 && isOnline(nextLastOnline);

    if (currentForeignUserId === 0) {
      currentForeignUserIdRef.current = userId;
      globalWS.subscribePresence([userId]);
    }

    setDialogPresenceOnline(nextPresenceOnline);

    setForeignUser((currentForeignUser) => {
      if (!currentForeignUser) {
        return currentForeignUser;
      }

      const knownUserId = toNumber(currentForeignUser.id);
      if (knownUserId > 0 && knownUserId !== userId) return currentForeignUser;

      return {
        ...currentForeignUser,
        id: knownUserId || userId,
        lastonlinetime: nextLastOnline,
      };
    });

    setDialogs((currentDialogs) => {
      const currentDialogHash = currentDialogHashRef.current;
      if (!currentDialogHash) {
        return currentDialogs;
      }

      return currentDialogs.map((dialog) =>
        normalizeHash(dialog.hash) === currentDialogHash
          ? {
              ...dialog,
              Ulastonline: nextLastOnline,
            }
          : dialog,
      );
    });
  };

  const handleWsMessageDeleted = (payload?: unknown) => {
    const messageId = getPayloadMessageId(payload);
    if (!messageId) return;

    setMessages((currentMessages) => {
      const nextMessages = currentMessages.filter((message) => getMessageId(message) !== messageId);
      persistMessages({
        keepSide: 'newest',
        nextMessages,
      });
      return nextMessages;
    });

    void loadDialogs({ force: true });
  };

  const handleWsMessageEdited = (payload?: unknown) => {
    const messageId = getPayloadMessageId(payload);
    const newText = getPayloadMessageText(payload);
    if (!messageId || !newText) return;

    setMessages((currentMessages) => {
      const nextMessages = currentMessages.map((message) =>
        getMessageId(message) === messageId
          ? {
              ...message,
              message: escapeHtml(newText),
            }
          : message,
      );

      persistMessages({
        keepSide: 'newest',
        nextMessages,
      });

      return nextMessages;
    });

    void loadDialogs({ force: true });
  };

  const scheduleWsRefresh = () => {
    if (wsRefreshTimerRef.current !== null) return;

    wsRefreshTimerRef.current = window.setTimeout(() => {
      wsRefreshTimerRef.current = null;
      void loadMessagesNewer(dialogSessionRef.current);
      void loadDialogs({ force: true });
    }, 150);
  };

  const handleWsMessageNew = () => {
    scheduleWsRefresh();
  };

  const handleWsMessageReaction = () => {
    void loadMessagesInitial(dialogSessionRef.current);
    void loadDialogs({ force: true });
  };

  const handleWsCallSignal = () => {
    setHasActiveCall(true);
    if (activeCallTimeoutRef.current !== null) {
      window.clearTimeout(activeCallTimeoutRef.current);
    }
    // Keep the "active call" indication alive for 10 seconds after the last signal
    activeCallTimeoutRef.current = window.setTimeout(() => {
      setHasActiveCall(false);
      activeCallTimeoutRef.current = null;
    }, 10000);
  };

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    void loadDialogs();

    const timer = window.setInterval(() => {
      void loadDialogs();
    }, DIALOGS_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
    // Polling should restart only when auth state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    dialogSessionRef.current += 1;
    const session = dialogSessionRef.current;
    teardownWs();

    if (!routeHash) {
      resetDialogState();
      return;
    }

    setSettingsModalOpen(false);
    setDeleteDialogModalOpen(false);
    setEditMessageModalOpen(false);
    void loadDialogByHash(routeHash, session);

    return () => {
      teardownWs();
    };
    // The dialog session is driven by auth/hash changes; helpers read current refs/state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, routeHash]);

  useEffect(() => {
    const dialogId = currentDialogIdRef.current;
    if (!isAuthenticated || !dialogId || blockedDialog) return undefined;

    globalWS.subscribeDialog(dialogId);
    globalWS.addDialogListener('message:new', handleWsMessageNew);
    globalWS.addDialogListener('message:deleted', handleWsMessageDeleted);
    globalWS.addDialogListener('message:edited', handleWsMessageEdited);
    globalWS.addDialogListener('message:reaction', handleWsMessageReaction);
    globalWS.addDialogListener('call:signal', handleWsCallSignal);
    globalWS.addGlobalPresenceListener(handlePresenceUpdate);

    const foreignUserId = currentForeignUserIdRef.current;
    if (foreignUserId > 0) {
      globalWS.addPresenceListener(foreignUserId, handlePresenceUpdate);
      globalWS.subscribePresence([foreignUserId]);
    }

    return () => {
      teardownWs();
    };
    // WS subscriptions are keyed by dialog/user ids; handlers intentionally keep current state via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockedDialog, isAuthenticated, selectedDialog?.id, foreignUser?.id]);

  useLayoutEffect(() => {
    const scrollContainer = messageScrollRef.current;
    if (!scrollContainer) return;

    const pendingAction = scrollActionRef.current;
    if (!pendingAction) return;

    if (pendingAction.type === 'bottom') {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    } else {
      scrollContainer.scrollTop =
        scrollContainer.scrollHeight - pendingAction.prevHeight + pendingAction.prevTop;
    }

    scrollActionRef.current = null;
  }, [messages, routeHash]);

  useEffect(() => {
    if (!routeHash || !selectedDialogId) return;

    const frame = window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [routeHash, selectedDialogId]);

  const handleDialogOpen = (hash: string) => {
    const normalizedHash = normalizeHash(hash);
    if (!normalizedHash || normalizedHash === routeHash) return;
    setRouteHash(normalizedHash);
    window.history.pushState(null, '', `/messages/${encodeURIComponent(normalizedHash)}`);
  };

  const handleDialogClose = () => {
    setRouteHash('');
    window.history.pushState(null, '', '/messages');
  };

  const sendReaction = async (messageId: number, reaction: string, action: 'add' | 'delete') => {
    try {
      await AncialAPI.messageAction('reaction', { msg_id: messageId, reaction, action });

      await loadMessagesInitial(dialogSessionRef.current);
    } catch (error) {
      console.error('Failed to update reaction', error);
      notify({
        content: lang?.somethingwrong || 'Произошла ошибка =(',
        type: 'error',
      });
    }
  };

  const handleMessageDelete = async (message: DialogMessage) => {
    const messageId = getMessageId(message);
    if (!messageId) return;

    try {
      const response = await AncialAPI.messageAction<{ message?: string }>('delete', { msg_id: messageId });
      const text = response.message || '';

      setMessages((currentMessages) => {
        const nextMessages = currentMessages.filter((item) => getMessageId(item) !== messageId);
        persistMessages({
          keepSide: 'newest',
          nextMessages,
        });
        return nextMessages;
      });

      if (text) {
        notify({
          content: text,
          type: 'success',
        });
      }

      void loadDialogs({ force: true });
    } catch (error) {
      console.error('Failed to delete message', error);
      notify({
        content: lang?.somethingwrong || 'Произошла ошибка =(',
        type: 'error',
      });
    }
  };

  const handleMessageEditOpen = (message: DialogMessage) => {
    setEditingMessage(message);
    setEditingValue(getEditableMessageText(message));
    setEditMessageModalOpen(true);
  };

  const handleMessageEditSave = async () => {
    const messageId = getMessageId(editingMessage ?? {});
    const nextValue = editingValue.trim();

    if (!messageId || !nextValue) {
      notify({
        content: lang?.enter_new_message || 'Введите новый текст сообщения',
        type: 'error',
      });
      return;
    }

    try {
      const response = await AncialAPI.messageAction<{ message?: string }>('edit', { msg_id: messageId, msg_data: nextValue });
      const text = response.message || '';

      setMessages((currentMessages) => {
        const nextMessages = currentMessages.map((message) =>
          getMessageId(message) === messageId
            ? {
                ...message,
                message: escapeHtml(nextValue),
              }
            : message,
        );

        persistMessages({
          keepSide: 'newest',
          nextMessages,
        });

        return nextMessages;
      });

      setEditMessageModalOpen(false);
      setEditingMessage(null);
      setEditingValue('');

      notify({
        content: text || (lang?.edit_message || 'Сообщение обновлено'),
        type: 'success',
      });

      void loadDialogs({ force: true });
    } catch (error) {
      console.error('Failed to edit message', error);
      notify({
        content: lang?.somethingwrong || 'Произошла ошибка =(',
        type: 'error',
      });
    }
  };

  const handleDialogDelete = async () => {
    const dialogId = currentDialogIdRef.current;
    if (!dialogId) return;

    try {
      const response = await AncialAPI.dialogAction<{ message?: string }>('delete', dialogId);
      const text = response.message || '';

      try {
        window.localStorage.removeItem(DIALOGS_CACHE_KEY);
      } catch {
        // ignore cache removal failures
      }

      setDeleteDialogModalOpen(false);
      handleDialogClose();
      await loadDialogs({ force: true });

      if (text) {
        notify({
          content: text,
          type: 'success',
        });
      }
    } catch (error) {
      console.error('Failed to delete dialog', error);
      notify({
        content: lang?.somethingwrong || 'Произошла ошибка =(',
        type: 'error',
      });
    }
  };

  const uploadToImgbb = async (file: File) => {
    const form = new FormData();
    form.append('image', file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      body: form,
      method: 'POST',
    });

    const result = (await response.json()) as {
      data?: {
        url?: string;
      };
    };

    const imageUrl = normalizeText(result.data?.url);
    if (!imageUrl) {
      throw new Error('Upload failed');
    }

    return imageUrl;
  };

  const handleMessageImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const dialogId = currentDialogIdRef.current;
    if (!file || !dialogId) return;

    setUploadingMessageImage(true);
    notify({
      content: lang?.['loading...'] || 'Загрузка...',
      time: 5,
      type: 'info',
    });

    try {
      const imageUrl = await uploadToImgbb(file);
      await AncialAPI.sendMessage({ di_id: dialogId, img: imageUrl });

      notify({
        content: lang?.done || 'Готово',
        type: 'success',
      });

      await loadMessagesNewer(dialogSessionRef.current);
      await loadDialogs({ force: true });
    } catch (error) {
      console.error('Failed to send image message', error);
      notify({
        content: lang?.somethingwrong || 'Произошла ошибка =(',
        type: 'error',
      });
    } finally {
      setUploadingMessageImage(false);
      event.target.value = '';
    }
  };

  const handleDialogBackgroundSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const dialogId = currentDialogIdRef.current;
    if (!file || !dialogId) return;

    setUploadingDialogBackground(true);
    notify({
      content: lang?.['loading...'] || 'Загрузка...',
      time: 5,
      type: 'info',
    });

    try {
      const imageUrl = await uploadToImgbb(file);

      const result = await AncialAPI.updateDialogBackground<{ success?: boolean; error?: string }>(dialogId, imageUrl);
      const isSuccess = (result as any).success !== false;
      if (!isSuccess) {
        throw new Error((result as any).error || 'Не удалось обновить фон');
      }

      setSelectedDialog((currentDialog) =>
        currentDialog
          ? {
              ...currentDialog,
              img: imageUrl,
            }
          : currentDialog,
      );

      setSettingsModalOpen(false);

      notify({
        content: lang?.backgroundupdated || 'Фон обновлён',
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to update dialog background', error);
      notify({
        content:
          error instanceof Error && error.message
            ? error.message
            : lang?.somethingwrong || 'Произошла ошибка =(',
        type: 'error',
      });
    } finally {
      setUploadingDialogBackground(false);
      event.target.value = '';
    }
  };

  const handleDialogBackgroundClear = async () => {
    const dialogId = currentDialogIdRef.current;
    const dialogHash = currentDialogHashRef.current;
    if (!dialogId || !dialogHash) return;

    try {
      await AncialAPI.updateDialogBackground(dialogId, '""');

      setSelectedDialog((currentDialog) =>
        currentDialog
          ? {
              ...currentDialog,
              img: '',
            }
          : currentDialog,
      );
      setSettingsModalOpen(false);
    } catch (error) {
      console.error('Failed to clear dialog background', error);
      notify({
        content: lang?.somethingwrong || 'Произошла ошибка =(',
        type: 'error',
      });
    }
  };

  const handleMessageSend = async (event?: React.FormEvent) => {
    event?.preventDefault();

    const dialogId = currentDialogIdRef.current;
    const nextValue = composerText.trim();

    if (!dialogId) return;

    if (!nextValue) {
      notify({
        content:
          lang?.empty_message_warning || 'Ну хоть что-нибудь написали. Вот зачем так делать?',
        type: 'info',
      });
      return;
    }

    setSendingMessage(true);

    try {
      await AncialAPI.sendMessage({ di_id: dialogId, message: nextValue });

      setComposerText('');
      scrollActionRef.current = { type: 'bottom' };
      await loadMessagesNewer(dialogSessionRef.current);
      await loadDialogs({ force: true });
    } catch (error) {
      console.error('Failed to send message', error);
      notify({
        content: lang?.somethingwrong || 'Произошла ошибка =(',
        type: 'error',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStickerSend = async (stickerName: string) => {
    const dialogId = currentDialogIdRef.current;
    if (!dialogId) return;

    setSendingMessage(true);

    try {
      await AncialAPI.sendMessage({ di_id: dialogId, sticker: `:${stickerName}:` });

      setStickerDropdownOpen(false);
      scrollActionRef.current = { type: 'bottom' };
      await loadMessagesNewer(dialogSessionRef.current);
      await loadDialogs({ force: true });
    } catch (error) {
      console.error('Failed to send sticker', error);
      notify({
        content: lang?.somethingwrong || 'Произошла ошибка =(',
        type: 'error',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSevenTvStickerSend = async (sticker: SevenTvSticker) => {
    const dialogId = currentDialogIdRef.current;
    const normalizedStickerName = normalizeText(sticker.name);
    if (!dialogId || !normalizedStickerName) return;

    setSendingMessage(true);

    try {
      seedSevenTvStickerCache([sticker]);

      await AncialAPI.sendMessage({ di_id: dialogId, message: `:7tv-${normalizedStickerName}-${sticker.id}:` });

      setStickerDropdownOpen(false);
      scrollActionRef.current = { type: 'bottom' };
      await loadMessagesNewer(dialogSessionRef.current);
      await loadDialogs({ force: true });
    } catch (error) {
      console.error('Failed to send 7TV sticker', error);
      notify({
        content: lang?.somethingwrong || 'Произошла ошибка =(',
        type: 'error',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStartCall = () => {
    if (routeHash) {
      if (isPlaying) togglePlay();
      router.push(`/call/${routeHash}`);
    }
  };

  const handleMessagesScroll = () => {
    const scrollContainer = messageScrollRef.current;
    if (!scrollContainer) return;

    if (scrollContainer.scrollTop < 160 && hasMoreMessages && !loadingOlder) {
      void loadMessagesOlder(dialogSessionRef.current);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Icon name="IC-loader" className="h-16 w-16 animate-spin fill-purple-500" />
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'messages-route flex h-[100dvh] w-full items-center justify-center bg-center bg-cover',
          routeHash && 'no-mobile-nav-padding',
        )}
      >
        <div className="flex h-full w-full items-stretch justify-center">
          <div
            id="dialogs-pane"
            className={cn(
              'flex h-full w-full max-w-3xl flex-col duration-300 lg:max-w-sm lg:bg-zinc-900 lg:shadow',
              routeHash && 'hidden lg:flex',
            )}
          >
            <span className="w-full px-3 pb-3 pt-3 text-3xl font-extralight lg:hidden">
              {lang?.chats || 'Чаты'}
            </span>

            <div className="relative flex h-full flex-col">
              <div className="flex h-full flex-col">
                {dialogsLoading && dialogs.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <Icon name="IC-loader" className="h-16 w-16 animate-spin fill-purple-500" />
                  </div>
                ) : dialogsError && dialogs.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                    <img
                      src="/includes/img/stickers/sponge.gif"
                      alt=""
                      className="mb-3 h-40 w-40 object-contain"
                    />
                    <span className="text-lg text-zinc-200">Связь потеряна!</span>
                    <span className="text-zinc-400">
                      {lang?.refresh_page || 'Попробуйте обновить страницу'}
                    </span>
                    <span className="mt-1 text-xs text-zinc-500">{dialogsError}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDialogsError('');
                        setDialogsLoading(true);
                        void loadDialogs({ force: true });
                      }}
                      className="mt-3 rounded-full border border-zinc-600/30 bg-purple-500 px-4 py-2 text-white duration-300 hover:bg-purple-600 active:scale-95"
                    >
                      Попробовать ещё
                    </button>
                  </div>
                ) : dialogs.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-0.5 pb-3 text-center">
                    <img src={NOTHING_FOUND_IMAGE} alt="" className="h-56 w-56 object-contain" />
                    <span className="w-full text-base font-black text-zinc-100">
                      {lang?.emptycomments || 'Пока ничего нет'}
                    </span>
                    <span className="w-full text-sm font-medium text-zinc-300">
                      {lang?.emptymessagesdesc || 'Здесь появятся ваши диалоги'}
                    </span>
                  </div>
                ) : (
                  <>
                    <div id="dialog-list-container" className="flex min-h-0 flex-1 flex-col lg:overflow-y-auto">
                      {dialogs.map((dialog) => {
                        const dialogHash = normalizeHash(dialog.hash);
                        const active = dialogHash === routeHash;
                        const preview = formatDialogPreview(dialog.Mmessage, lang);
                        const dialogName = decodeText(dialog.Uname);
                        const previewStatusIcon = getDialogPreviewStatusIconName(dialog.Mstatus);

                        return (
                          <button
                            key={dialogHash || String(dialog.id)}
                            type="button"
                            onClick={() => handleDialogOpen(dialogHash)}
                            className={cn(
                              'cursor-pointer flex items-center gap-3 p-3 text-left duration-300 hover:bg-zinc-800 active:scale-95 active:rounded-2xl',
                              active && 'bg-zinc-800/90',
                            )}
                          >
                            <div className="shrink-0">
                              <img
                                className={cn(
                                  'h-16 w-16 rounded-full object-cover shadow',
                                  isOnline(dialog.Ulastonline) && 'ring-2 ring-lime-500',
                                )}
                                src={normalizeAssetUrl(dialog.Uimg, FALLBACK_AVATAR)}
                                alt={dialogName || 'Dialog avatar'}
                              />
                            </div>

                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-base font-medium text-zinc-100 lg:text-lg">
                                {dialogName || 'Пользователь'}
                                {String(dialog.Uverify ?? '0') === '1' ? (
                                  <Icon name="IC-verify" className="ml-1 inline h-5 w-5 fill-blue-500" />
                                ) : null}
                              </span>
                              <span className="truncate text-sm text-zinc-300 lg:text-base">
                                {preview || (lang?.write_message || 'Напишите сообщение')}
                              </span>
                            </div>

                            <div className="flex shrink-0 flex-col items-end text-xs text-zinc-400 lg:text-sm">
                              <span>{normalizeText(dialog.Mtime)}</span>
                              <Icon
                                name={previewStatusIcon}
                                className={cn(
                                  'h-5 w-5',
                                  String(dialog.Mstatus ?? '0') === '0'
                                    ? 'fill-white'
                                    : 'fill-purple-500',
                                )}
                              />
                            </div>
                          </button>
                        );
                      })}
                      <div className="lg:hidden pb-64">
                        
                      </div>
                    </div>
                    <YandexRtb
                      blockId="R-A-3636730-16"
                      className="hidden w-full max-h-24 items-center justify-center lg:flex"
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          <div
            id="dialog-pane"
            className={cn(
              'w-full max-w-screen-lg',
              routeHash ? 'flex h-full flex-col' : 'hidden lg:flex lg:h-full lg:flex-col',
            )}
          >
            {!routeHash ? (
              <div
                id="welcome-pane"
                className="hidden h-full w-full flex-col items-center justify-center gap-3 p-3 text-center lg:flex lg:flex-row"
              >
                <img
                  src={FALLBACK_WELCOME_IMAGE}
                  alt=""
                  className="-rotate-45 w-64 animate-pulse object-contain"
                />
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-white">
                    {lang?.welcometochats || 'Добро пожаловать в чаты'}
                  </span>
                  <span className="text-xl text-zinc-300">
                    {lang?.welcometochatsdesc || 'Выберите диалог слева, чтобы начать общение.'}
                  </span>
                </div>
              </div>
            ) : blockedDialog ? (
              <div
                id="blocked-pane"
                className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center"
              >
                <Icon name="IC-lock" className="h-20 w-20 fill-zinc-500" />
                <div className="max-w-lg text-zinc-300">
                  {dialogError || lang?.blockedaccdialogdesc || 'Этот диалог сейчас недоступен.'}
                </div>
              </div>
            ) : (
              <div
                id="dialog-bg"
                className="relative flex h-full w-full flex-col overflow-hidden bg-cover bg-center"
                style={
                  dialogBackgroundUrl
                    ? {
                        backgroundImage: `url(${dialogBackgroundUrl})`,
                      }
                    : undefined
                }
              >
                <div className="absolute inset-x-0 top-0 z-[20] flex items-center justify-center bg-gradient-to-b from-black via-black/90 to-transparent p-2">
                  <div className="flex w-23 shrink-0">
                    <button
                      type="button"
                      onClick={handleDialogClose}
                      className="flex h-10 w-10 cursor-pointer items-center justify-start text-lg font-medium duration-300 hover:scale-95 lg:hidden"
                    >
                      <Icon name="IC-chevron-left" className="h-8 w-8 fill-white" />
                    </button>
                  </div>

                  <span className="flex min-w-0 flex-1 flex-col items-center justify-center px-2 text-center">
                    <span className="max-w-full truncate text-base font-bold lg:text-lg">
                      {dialogTitle || '...'}
                    </span>
                    <span className="max-w-full truncate text-xs text-zinc-300 lg:text-sm">{dialogStatusLabel}</span>
                  </span>

                  <div className="flex w-23 shrink-0 items-center justify-end gap-3">
                    <button
                      id="call-button"
                      type="button"
                      onClick={handleStartCall}
                      className={cn(
                        'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full duration-300 active:scale-95',
                        hasActiveCall ? 'bg-lime-500 hover:bg-lime-400 animate-pulse' : 'hover:bg-zinc-700'
                      )}
                    >
                      <Icon name="IC-call" className="h-8 w-8 fill-white" />
                    </button>

                    <Dropdown
                      position="bottom"
                      align="end"
                      triggerSize="sm"
                      width="auto"
                      menuClassName="min-w-[13rem]"
                      triggerAriaLabel={lang?.chat_settings || 'Настройки чата'}
                      triggerClassName="h-10 w-10 overflow-hidden rounded-full p-0 shadow hover:bg-zinc-700/80"
                      triggerNode={
                        <img
                          id="dialog-avatar"
                          src={normalizeAssetUrl(foreignUser?.img, FALLBACK_AVATAR)}
                          alt={dialogTitle || 'Dialog avatar'}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      }
                    >
                      <DropdownItem
                        icon="IC-user"
                        onClick={() => {
                          const username = normalizeText(currentForeignUserRef.current?.username);
                          if (!hasMeaningfulValue(username)) {
                            return;
                          }

                          router.push(`/@${username}`);
                        }}
                      >
                        {lang?.userpage || 'Страница'}
                      </DropdownItem>
                      <DropdownItem
                        icon="IC-settings"
                        onClick={() => {
                          setSettingsModalOpen(true);
                        }}
                      >
                        {lang?.chat_settings || 'Настройки чата'}
                      </DropdownItem>
                      <DropdownItem
                        icon="IC-trash"
                        onClick={() => {
                          setDeleteDialogModalOpen(true);
                        }}
                      >
                        {lang?.dialogdelete || 'Удалить диалог'}
                      </DropdownItem>
                    </Dropdown>
                  </div>
                </div>

                <div
                  ref={messageScrollRef}
                  id="msg-scroll"
                  onScroll={handleMessagesScroll}
                  className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pt-[calc(100vh-116px)]"
                >
                  {dialogLoading && !selectedDialog ? (
                    <div className="flex h-full min-h-[50vh] items-center justify-center">
                      <Icon name="IC-loader" className="h-16 w-16 animate-spin fill-purple-500" />
                    </div>
                  ) : dialogError && !messages.length ? (
                    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center text-center text-zinc-300">
                      <span>{dialogError}</span>
                    </div>
                  ) : (
                    <div id="msgbox" className="flex min-h-full flex-col">
                      <div className="mt-auto pb-[72px]">
                        {loadingOlder ? (
                          <div className="mb-3 flex items-center justify-center">
                            <Icon name="IC-loader" className="h-8 w-8 animate-spin fill-purple-500" />
                          </div>
                        ) : null}

                        {timelineItems.map((item) =>
                          item.kind === 'separator' ? (
                            <div key={`sep:${item.dayKey}`} className="my-3 flex w-full justify-center">
                              <span className="rounded-full border border-zinc-600/30 bg-zinc-900/70 px-3 py-1 text-xs text-zinc-200 shadow backdrop-blur-md backdrop-saturate-200">
                                {item.label}
                              </span>
                            </div>
                          ) : (
                            <MessageBubble
                              key={`msg:${getMessageId(item.message)}`}
                              authUserImage={authUserImage}
                              currentUserId={currentUserId}
                              foreignUser={foreignUser}
                              lang={lang}
                              message={item.message}
                              onAddReaction={(messageId, reaction) => {
                                void sendReaction(messageId, reaction, 'add');
                              }}
                              onDeleteMessage={(message) => {
                                void handleMessageDelete(message);
                              }}
                              onDeleteReaction={(messageId, reaction) => {
                                void sendReaction(messageId, reaction, 'delete');
                              }}
                              onEditMessage={handleMessageEditOpen}
                              onOpenImage={setActiveDialogImageKey}
                            />
                          ),
                        )}

                        {!dialogLoading && !messages.length ? (
                          <div className="flex min-h-[50vh] items-center justify-center">
                            <span className="rounded-full border border-zinc-600/30 bg-zinc-900/70 px-4 py-2 text-sm text-zinc-300 shadow backdrop-blur-md backdrop-saturate-200">
                              {lang?.write_message || 'Напишите первое сообщение'}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>

                <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-1.5 p-3 pt-0">
                  <form
                    onSubmit={handleMessageSend}
                    className="relative flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-900/20 p-1"
                  >
                    <div className="absolute inset-0 rounded-full backdrop-blur-md backdrop-saturate-200"></div>

                    <input
                      ref={messageInputRef}
                      value={composerText}
                      onChange={(event) => setComposerText(event.target.value)}
                      placeholder={lang?.write_message || 'Напишите сообщение'}
                      autoComplete="off"
                      disabled={!selectedDialog || sendingMessage}
                      className="relative z-[1] w-full bg-transparent pl-2 text-white placeholder-zinc-600/80 focus:border-0 focus:outline-none focus:ring-0"
                    />

                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleMessageImageSelect}
                    />

                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={!selectedDialog || uploadingMessageImage}
                      className="relative z-[1] flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full duration-300 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
                    >
                      {uploadingMessageImage ? (
                        <Icon name="IC-loader" className="h-8 w-8 animate-spin fill-zinc-300" />
                      ) : (
                        <Icon name="IC-image" className="h-8 w-8 fill-zinc-300" />
                      )}
                    </button>

                    {!selectedDialog ? (
                      <button
                        type="button"
                        disabled
                        className="relative z-[1] flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-full opacity-50"
                      >
                        <Icon name="IC-emoji" className="h-8 w-8 fill-zinc-300" />
                      </button>
	                    ) : (
	                      <Dropdown
	                        closeOnChildClick={false}
	                        open={stickerDropdownOpen}
	                        onOpenChange={setStickerDropdownOpen}
	                        position="top"
	                        align="end"
	                        triggerSize="sm"
	                        width="auto"
	                        menuClassName="w-[17rem] overflow-hidden !p-0 text-zinc-300"
	                        triggerAriaLabel={lang?.stickers || 'Стикеры'}
	                        triggerClassName="relative z-[1] h-10 w-10 rounded-full hover:bg-zinc-700"
	                        triggerNode={<Icon name="IC-emoji" className="h-8 w-8 fill-zinc-300" />}
	                      >
	                        <StickerPickerDropdownContent
	                          isOpen={stickerDropdownOpen}
	                          isSending={sendingMessage}
	                          onSendNativeSticker={(stickerName) => {
	                            void handleStickerSend(stickerName);
	                          }}
	                          onSendSevenTvSticker={(sticker) => {
	                            void handleSevenTvStickerSend(sticker);
	                          }}
	                        />
	                      </Dropdown>
	                    )}

                    <button
                      type="submit"
                      disabled={!selectedDialog || sendingMessage}
                      className="relative z-[1] flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full duration-300 hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-zinc-500/50 disabled:opacity-70 active:scale-95"
                    >
                      {sendingMessage ? (
                        <Icon name="IC-loader" className="h-8 w-8 animate-spin fill-white" />
                      ) : (
                        <Icon name="IC-send" className="h-8 w-8 fill-white" />
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <DialogImageViewerModal
        activeImageIndex={resolvedActiveDialogImageIndex}
        images={dialogImageSlides}
        isOpen={resolvedActiveDialogImageIndex !== null}
        onClose={() => {
          setActiveDialogImageKey(null);
        }}
        onNext={() => {
          if (resolvedActiveDialogImageIndex === null || dialogImageSlides.length < 2) {
            return;
          }

          const nextIndex = (resolvedActiveDialogImageIndex + 1) % dialogImageSlides.length;
          setActiveDialogImageKey(dialogImageSlides[nextIndex]?.key ?? null);
        }}
        onPrev={() => {
          if (resolvedActiveDialogImageIndex === null || dialogImageSlides.length < 2) {
            return;
          }

          const nextIndex =
            (resolvedActiveDialogImageIndex - 1 + dialogImageSlides.length) % dialogImageSlides.length;
          setActiveDialogImageKey(dialogImageSlides[nextIndex]?.key ?? null);
        }}
        onSelect={(nextIndex) => {
          setActiveDialogImageKey(dialogImageSlides[nextIndex]?.key ?? null);
        }}
      />

      <Modal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        title={lang?.chat_settings || 'Настройки чата'}
      >
        <div className="flex flex-col gap-3">
          <h2 className="text-sm text-zinc-300">{lang?.change_bg || 'Изменить фон'}</h2>
          <div className="drag-scroll viewport -my-3 flex gap-3 overflow-auto px-1 py-3">
            <button
              type="button"
              onClick={() => {
                void handleDialogBackgroundClear();
              }}
              className={cn(
                'flex h-32 w-20 shrink-0 flex-col items-center rounded-2xl bg-zinc-800 p-3 shadow duration-300 active:scale-95',
                !dialogBackgroundUrl && 'ring-2 ring-purple-500',
              )}
            >
              <div className="mb-1.5 w-full rounded-2xl rounded-bl-none bg-zinc-700 px-1.5 text-sm text-zinc-200">
                Hello
              </div>
              <div className="w-full rounded-2xl rounded-br-none bg-purple-700 px-1.5 text-sm text-white">
                Hi!
              </div>
            </button>

            <button
              type="button"
              onClick={() => backgroundInputRef.current?.click()}
              className={cn(
                'flex h-32 w-20 shrink-0 flex-col items-center rounded-2xl bg-gradient-to-br from-purple-700 to-blue-700 bg-cover bg-center p-3 shadow duration-300 active:scale-95',
                dialogBackgroundUrl && 'ring-2 ring-purple-500',
              )}
              style={
                dialogBackgroundUrl
                  ? {
                      backgroundImage: `url(${dialogBackgroundUrl})`,
                    }
                  : undefined
              }
            >
              <div className="mb-1.5 w-full rounded-2xl rounded-bl-none bg-zinc-800/80 px-1.5 text-sm text-zinc-200">
                Hello
              </div>
              <div className="w-full rounded-2xl rounded-br-none bg-purple-700/80 px-1.5 text-sm text-white">
                Hi!
              </div>
              <div className="flex h-full flex-grow items-end">
                {uploadingDialogBackground ? (
                  <Icon name="IC-loader" className="h-12 w-12 animate-spin fill-purple-100" />
                ) : (
                  <Icon name="IC-image" className="h-12 w-12 fill-purple-100" />
                )}
              </div>
            </button>
          </div>
          <input
            ref={backgroundInputRef}
            type="file"
            accept="image/*"
            onChange={handleDialogBackgroundSelect}
            className="hidden"
          />
        </div>
      </Modal>

      <Modal
        isOpen={deleteDialogModalOpen}
        onClose={() => setDeleteDialogModalOpen(false)}
        title={lang?.dialogdelete || 'Удалить диалог'}
      >
        <div className="flex flex-col gap-3">
          <h2 className="text-zinc-200">
            {lang?.durwdialogdelete || 'Вы действительно хотите удалить этот диалог?'}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                void handleDialogDelete();
              }}
              className="rounded-3xl border border-zinc-600/30 bg-red-500 px-3 py-2 text-white duration-300 hover:bg-red-600 active:scale-95"
            >
              {lang?.durwdialogdeleteYES || 'Удалить'}
            </button>
            <button
              type="button"
              onClick={() => setDeleteDialogModalOpen(false)}
              className="rounded-3xl border border-zinc-600/30 bg-zinc-700 px-3 py-2 text-white duration-300 hover:bg-zinc-800 active:scale-95"
            >
              {lang?.durwdialogdeleteNO || 'Отмена'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={editMessageModalOpen}
        onClose={() => setEditMessageModalOpen(false)}
        title={lang?.edit_message || 'Редактировать сообщение'}
      >
        <div className="flex flex-col gap-3">
          <input
            value={editingValue}
            onChange={(event) => setEditingValue(event.target.value)}
            placeholder={lang?.enter_new_message || 'Введите новый текст'}
            className="focus:outline-0 focus:ring-0 h-12 w-full rounded-3xl border border-zinc-600/30 bg-zinc-800 px-4 text-zinc-100 placeholder-zinc-500"
          />
          <button
            type="button"
            onClick={() => {
              void handleMessageEditSave();
            }}
            className="w-full rounded-3xl border border-zinc-600/30 bg-purple-500 px-3 py-2 text-white duration-300 hover:bg-purple-600 active:scale-95"
          >
            {lang?.edit || 'Сохранить'}
          </button>
        </div>
      </Modal>
    </>
  );
}
