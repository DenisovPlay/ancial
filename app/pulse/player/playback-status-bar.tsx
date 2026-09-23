'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import { useAuth } from '../../context/AuthContext';
import { usePulsePlayer } from '../../context/PulsePlayerContext';
import { cn } from '../../lib/cn';
import {
  getListenAlongSnapshot,
  getServerListenAlongSnapshot,
  leaveListenAlong,
  subscribeListenAlong } from './listen-along';
import { useRemoteDevices } from './remote-devices';
import AppImage from '../../components/app-image';
import Icon from '../../components/svg-icon';

const FALLBACK_AVATAR = '/img/placeholders/user.png';
/** Сколько аватарок показываем, остальные — числом (как у «прочитали» в групповых чатах). */
const VISIBLE_AVATARS = 4;
/** Длительность сворачивания — столько же держим блок в разметке, чтобы анимация доиграла. */
const EXIT_MS = 300;


/**
 * Полоска состояния плеера: где идёт звук и с кем он общий.
 * У ведомого — «Слушаете вместе с …» и выход, у хоста — аватарки слушающих,
 * на пульте — «Играет на …» и перенос звука сюда.
 * Появляется и исчезает разворачиванием по высоте: соседние блоки плеера не дёргаются.
 */
export function PlaybackStatusBar({ className }: { className?: string }) {
  const { lang, user } = useAuth();
  const { transferPlaybackHere } = usePulsePlayer();
  const listenAlong = useSyncExternalStore(subscribeListenAlong, getListenAlongSnapshot, getServerListenAlongSnapshot);
  const devices = useRemoteDevices();

  const isFollower = listenAlong.followingHostId > 0;
  const currentUserId = Number(user?.id) || 0;
  // Себя в списке не показываем: важно, с кем ты слушаешь, а не что ты тут есть.
  const others = listenAlong.listeners.filter((listener) => listener.id !== currentUserId);
  const people = isFollower && listenAlong.host ? [listenAlong.host, ...others] : others;

  const activeDevice = devices.devices.find((device) => device.active) ?? null;
  // Звук у другой вкладки этого же устройства — про «другое устройство» писать нечестно.
  const isSameDevice = Boolean(activeDevice?.self);
  const visible = isFollower || others.length > 0 || devices.isRemote;

  // Держим блок в разметке, пока идёт сворачивание, иначе он пропадал бы рывком.
  const [mounted, setMounted] = useState(visible);
  const [leaving, setLeaving] = useState(false);
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setMounted(true);
      setLeaving(false);
    } else {
      setLeaving(true);
    }
  }

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => {
      setMounted(false);
      setLeaving(false);
    }, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (!mounted) return null;

  const shownPeople = people.slice(0, VISIBLE_AVATARS);
  const restCount = people.length - shownPeople.length;
  const hostName = listenAlong.host?.name?.trim();
  // Пока едет первый трек хоста, показываем «подключаемся».
  const isConnecting = isFollower && !listenAlong.state;

  // «на Windows · Chrome» или «в другой вкладке» — хвост, который дописываем к любому тексту.
  const deviceSuffix = isSameDevice
    ? lang?.pulse_device_in_other_tab || 'в другой вкладке'
    : `${lang?.pulse_device_on || 'на'} ${activeDevice?.name || lang?.pulse_device_other || 'другом устройстве'}`;

  const listenLabel = isConnecting
    ? `${lang?.listen_along_connecting || 'Подключаемся'}${hostName ? ` ${lang?.listen_along_to || 'к'} ${hostName}` : ''}…`
    : isFollower
      ? `${lang?.listen_along_with || 'Слушаете вместе с'} ${hostName || ''}`.trim()
      : `${people.length} ${lang?.listen_along_listeners || 'слушают вместе'}`;

  // Слушаем вместе и звук на другом устройстве — человеку важны оба факта сразу.
  const label = !devices.isRemote
    ? listenLabel
    : isFollower || others.length > 0
      ? `${listenLabel} ${deviceSuffix}`
      : isSameDevice
        ? lang?.pulse_device_other_tab || 'Играет в другой вкладке'
        : `${lang?.pulse_device_playing_on || 'Играет на'} ${activeDevice?.name || lang?.pulse_device_other || 'другом устройстве'}`;

  return (
    <div
      className={cn(
        'grid w-full transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
        'starting:grid-rows-[0fr] starting:opacity-0',
        leaving ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
      )}
    >
      <div className="min-h-0 overflow-hidden">
        {/* Внешний отступ живёт внутри, иначе у свёрнутого блока оставался бы пустой зазор. */}
        <div className={cn('flex w-full items-center gap-1.5 text-xs text-zinc-400', className)}>
          {devices.isRemote && !people.length ? (
            <Icon
              name={activeDevice?.kind === 'mobile' ? 'IC-mobile' : 'IC-laptop'}
              className="h-4 w-4 shrink-0 fill-zinc-400"
            />
          ) : (
            <span className="flex shrink-0 items-center">
              {shownPeople.map((person, index) => (
                <AppImage
                  width={20}
                  height={20}
                  fallbackSrc={FALLBACK_AVATAR}
                  key={person.id}
                  src={person.img || FALLBACK_AVATAR}
                  alt=""
                  title={person.name}
                  // Кольцо нужно только чтобы разделять налезающие аватарки: для одной это лишний контур.
                  className={cn('h-5 w-5 rounded-full object-cover', people.length > 1 && 'ring-1 ring-black/60', index > 0 && '-ml-1.5')}
                />
              ))}
              {restCount > 0 ? <span className="ml-1">+{restCount}</span> : null}
            </span>
          )}

          <span className="min-w-0 flex-1 truncate">{label}</span>

          {isFollower ? (
            <button
              type="button"
              onClick={leaveListenAlong}
              className="ml-auto shrink-0 cursor-pointer rounded-full border border-transparent px-3 py-1 text-xs text-zinc-300 duration-300 hover:border-zinc-600/30 hover:bg-zinc-700/80 hover:text-white active:scale-95"
            >
              {lang?.listen_along_leave || 'Отключиться'}
            </button>
          ) : devices.isRemote ? (
            <button
              type="button"
              onClick={transferPlaybackHere}
              className="ml-auto shrink-0 cursor-pointer rounded-full border border-transparent px-3 py-1 text-xs text-zinc-300 duration-300 hover:border-zinc-600/30 hover:bg-zinc-700/80 hover:text-white active:scale-95"
            >
              {lang?.pulse_device_play_here || 'Перенести сюда'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
