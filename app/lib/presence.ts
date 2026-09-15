'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { AncialAPI } from './api-v2';
import { globalWS } from './global-ws';
import { formatRelativeTime } from './time';

export type PresenceMusicMeta = {
  artist?: string;
  cover?: string;
  song_id?: string;
  title?: string;
};

/** Статус пользователя глазами текущего зрителя — сервер уже применил все настройки приватности. */
export type UserPresence = {
  activity_key?: string | null;
  activity_label?: string | null;
  activity_meta?: PresenceMusicMeta | null;
  activity_type: 'none' | 'page' | 'music' | 'chat' | 'call' | 'custom' | string;
  activity_url?: string | null;
  /** Групповой звонок, зритель — участник чата и владелец разрешил подключаться. */
  can_join?: boolean;
  last_seen?: number | null;
  status: 'online' | 'idle' | 'dnd' | 'offline' | string;
};

type PresenceLang = Record<string, string> | null | undefined;

/** Разделы сайта, которые попадают в активность «страница» — без путей, ID и хешей. */
const PRESENCE_SECTION_PREFIXES: Array<[prefix: string, section: string]> = [
  ['/feed', 'feed'],
  ['/pulse', 'pulse'],
  ['/cinema', 'cinema'],
  ['/@', 'profile'],
  ['/profile', 'profile'],
  ['/group', 'groups'],
  ['/friends', 'friends'],
  ['/apps', 'apps'],
  ['/about', 'about'],
];

const PRESENCE_SECTION_FALLBACK: Record<string, string> = {
  home: 'На главной',
  feed: 'Смотрит ленту',
  pulse: 'В Pulse',
  cinema: 'В кинотеатре',
  profile: 'Смотрит профили',
  groups: 'В сообществах',
  friends: 'В друзьях',
  apps: 'В приложениях',
  about: 'Читает о Zypo',
};

/** Раздел для репортера. null — страницу не сообщаем вовсе (настройки, кошелёк, вход и т.п.). */
export function getPresenceSection(pathname: string | null | undefined): string | null {
  const path = pathname || '/';
  if (path === '/') return 'home';
  const match = PRESENCE_SECTION_PREFIXES.find(([prefix]) => path.startsWith(prefix));
  return match ? match[1] : null;
}

// ---- Пакетный стор статусов ------------------------------------------------------------------

const PRESENCE_BATCH_SIZE = 100; // лимит presence/Status.php

const presenceById = new Map<number, UserPresence>();
const storeListeners = new Set<() => void>();
const pendingIds = new Set<number>();
let flushScheduled = false;
let storeVersion = 0;

function emitStoreChange() {
  storeVersion += 1;
  storeListeners.forEach((listener) => listener());
}

function flushPresenceRequests() {
  flushScheduled = false;
  const ids = Array.from(pendingIds);
  pendingIds.clear();

  for (let index = 0; index < ids.length; index += PRESENCE_BATCH_SIZE) {
    const chunk = ids.slice(index, index + PRESENCE_BATCH_SIZE);
    void AncialAPI.getPresence<{ statuses?: Record<string, UserPresence> }>(chunk)
      .then((result) => {
        const entries = Object.entries(result?.statuses ?? {});
        if (!entries.length) return;
        entries.forEach(([id, presence]) => presenceById.set(Number(id), presence));
        emitStoreChange();
      })
      .catch(() => { });
  }
}

/** Ставит пользователей в очередь; все вызовы в одном тике склеиваются в один запрос на пачку. */
export function requestPresence(userIds: number[]) {
  userIds.forEach((id) => {
    if (id > 0) pendingIds.add(id);
  });
  if (!flushScheduled && pendingIds.size > 0) {
    flushScheduled = true;
    queueMicrotask(flushPresenceRequests);
  }
}

function subscribeStore(listener: () => void) {
  storeListeners.add(listener);
  return () => {
    storeListeners.delete(listener);
  };
}

const getStoreVersion = () => storeVersion;
const getServerStoreVersion = () => 0;

// WS присылает только сигнал «статус изменился» — сам статус с учётом приватности дозапрашиваем.
const handleWsPresenceSignal = (userId: number) => requestPresence([userId]);

function normalizeIds(userIds: Array<number | string | null | undefined>) {
  const unique = new Set<number>();
  userIds.forEach((raw) => {
    const id = Number(raw);
    if (Number.isFinite(id) && id > 0) unique.add(Math.floor(id));
  });
  return Array.from(unique).sort((a, b) => a - b).join(',');
}

/** Статусы списка пользователей: загрузка пачкой + живое обновление по WS. */
export function usePresences(userIds: Array<number | string | null | undefined>): Record<number, UserPresence | undefined> {
  const idsKey = normalizeIds(userIds);
  const version = useSyncExternalStore(subscribeStore, getStoreVersion, getServerStoreVersion);

  useEffect(() => {
    if (!idsKey) return;
    const ids = idsKey.split(',').map(Number);
    requestPresence(ids);
    ids.forEach((id) => globalWS.addPresenceListener(id, handleWsPresenceSignal));
    globalWS.subscribePresence(ids);
    return () => ids.forEach((id) => globalWS.removePresenceListener(id, handleWsPresenceSignal));
  }, [idsKey]);

  return useMemo(() => {
    const result: Record<number, UserPresence | undefined> = {};
    if (!idsKey) return result;
    idsKey.split(',').forEach((rawId) => {
      const id = Number(rawId);
      result[id] = presenceById.get(id);
    });
    return result;
    // version — сигнал, что стор обновился (Map мутируется на месте).
  }, [idsKey, version]);
}

export function usePresence(userId: number | string | null | undefined): UserPresence | undefined {
  const id = Number(userId) || 0;
  return usePresences([id])[id];
}

// ---- Подписи ---------------------------------------------------------------------------------

export function isPresenceOnline(presence: UserPresence | null | undefined) {
  return Boolean(presence && presence.status !== 'offline');
}

export function getPresenceMusicLabel(presence: UserPresence) {
  const meta = presence.activity_meta;
  return [meta?.title, meta?.artist].filter(Boolean).join(' — ') || presence.activity_label || 'Pulse';
}

/** Одна строка статуса: активность, «в сети» или «был(а) в сети N назад». */
export function getPresenceText(presence: UserPresence | null | undefined, lang: PresenceLang): string {
  if (!presence || presence.status === 'offline') {
    if (presence?.last_seen) {
      const ago = formatRelativeTime(new Date(presence.last_seen * 1000), lang);
      return `${lang?.presence_last_seen || 'Был(а) в сети'} ${ago}`.trim();
    }
    return lang?.offline || 'Не в сети';
  }

  switch (presence.activity_type) {
    case 'music':
      return `${lang?.presence_listening || 'Слушает'}: ${getPresenceMusicLabel(presence)}`;
    case 'call':
      return presence.activity_label
        ? `${lang?.presence_calling || 'Участвует в звонке'}: ${presence.activity_label}`
        : (lang?.presence_calling || 'Участвует в звонке');
    case 'chat':
      return lang?.presence_chatting || 'Общается в чате';
    case 'page': {
      const section = presence.activity_key || '';
      if (section && PRESENCE_SECTION_FALLBACK[section]) {
        return lang?.[`presence_section_${section}`] || PRESENCE_SECTION_FALLBACK[section];
      }
      return lang?.presence_on_site || 'На сайте';
    }
    default:
      return presence.status === 'idle'
        ? (lang?.presence_idle || 'Нет на месте')
        : (lang?.online || 'В сети');
  }
}
