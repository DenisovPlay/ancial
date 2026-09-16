'use client';
/* eslint-disable @next/next/no-img-element */

import { useSyncExternalStore } from 'react';

import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/cn';
import {
  getListenAlongSnapshot,
  getServerListenAlongSnapshot,
  leaveListenAlong,
  subscribeListenAlong,
} from './listen-along';

const FALLBACK_AVATAR = '/img/placeholders/user.png';
/** Сколько аватарок показываем, остальные — числом (как у «прочитали» в групповых чатах). */
const VISIBLE_AVATARS = 4;

/**
 * Полоска совместного прослушивания: у ведомого — «Слушаете вместе с …» и выход,
 * у хоста — аватарки тех, кто слушает вместе. Комнаты нет — ничего не рисуем.
 */
export function ListenAlongBar({ className }: { className?: string }) {
  const { lang, user } = useAuth();
  const listenAlong = useSyncExternalStore(subscribeListenAlong, getListenAlongSnapshot, getServerListenAlongSnapshot);

  const isFollower = listenAlong.followingHostId > 0;
  const currentUserId = Number(user?.id) || 0;
  // Себя в списке не показываем: важно, с кем ты слушаешь, а не что ты тут есть.
  const others = listenAlong.listeners.filter((listener) => listener.id !== currentUserId);
  const people = isFollower && listenAlong.host ? [listenAlong.host, ...others] : others;

  if (people.length === 0) return null;

  const visible = people.slice(0, VISIBLE_AVATARS);
  const restCount = people.length - visible.length;
  const hostName = listenAlong.host?.name?.trim();

  return (
    <div className={cn('flex w-full items-center gap-1.5 text-xs text-zinc-400', className)}>
      <span className="flex shrink-0 items-center">
        {visible.map((person, index) => (
          <img
            key={person.id}
            src={person.img || FALLBACK_AVATAR}
            alt=""
            title={person.name}
            // Кольцо нужно только чтобы разделять налезающие аватарки: для одной это просто лишний контур.
            className={cn('h-5 w-5 rounded-full object-cover', people.length > 1 && 'ring-1 ring-black/60', index > 0 && '-ml-1.5')}
          />
        ))}
        {restCount > 0 ? <span className="ml-1">+{restCount}</span> : null}
      </span>

      <span className="min-w-0 flex-1 truncate">
        {isFollower
          ? `${lang?.listen_along_with || 'Слушаете вместе с'} ${hostName || ''}`.trim()
          : `${people.length} ${lang?.listen_along_listeners || 'слушают вместе'}`}
      </span>

      {isFollower ? (
        <button
          type="button"
          onClick={leaveListenAlong}
          className="shrink-0 cursor-pointer text-zinc-300 underline-offset-2 duration-300 hover:text-white hover:underline"
        >
          {lang?.listen_along_leave || 'Отключиться'}
        </button>
      ) : null}
    </div>
  );
}
