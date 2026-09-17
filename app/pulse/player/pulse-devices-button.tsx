'use client';

import type { ComponentType } from 'react';
import { useState } from 'react';

import { usePulsePlayer } from '../../context/PulsePlayerContext';
import { cn } from '../pulse-components';
import { PulseModal } from '../pulse-modal';
import { sendTakeoverCommand, useRemoteDevices } from './remote-devices';

type PlayerIcon = ComponentType<{ className?: string; name: string }>;

/**
 * Выбор устройства, на котором играет звук. На аккаунте он всегда один:
 * выбрали другое — туда и переезжает воспроизведение, остальные становятся пультами.
 */
export function PulseDevicesButton({ Icon, lang }: { Icon: PlayerIcon; lang: Record<string, string> | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const devices = useRemoteDevices();
  const { transferPlaybackHere } = usePulsePlayer();

  // Одно устройство — выбирать не из чего.
  if (devices.devices.length < 2) return null;

  const activeDevice = devices.devices.find((device) => device.active) ?? null;

  const handleSelect = (deviceId: string, isSelf: boolean, isActive: boolean) => {
    setIsOpen(false);
    if (isActive) return;
    // Своё устройство забирает звук само: очередь и позиция у него уже есть.
    if (isSelf) {
      transferPlaybackHere();
      return;
    }
    sendTakeoverCommand(deviceId);
  };

  return (
    <>
      <button
        title={lang?.pulse_devices || 'Устройства'}
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-transparent duration-300 active:scale-95 hover:border-zinc-600/30 hover:bg-white/10',
          devices.isRemote && 'bg-white/10',
        )}
      >
        <Icon
          name={activeDevice?.kind === 'mobile' ? 'IC-mobile' : 'IC-laptop'}
          className={cn('h-6 w-6 duration-300', devices.isRemote ? 'fill-purple-400' : 'fill-white')}
        />
      </button>

      <PulseModal isOpen={isOpen} onClose={() => setIsOpen(false)} title={lang?.pulse_devices || 'Устройства'}>
        <div className="flex flex-col gap-1">
          <p className="px-1 pb-3 text-sm text-zinc-400">
            {lang?.pulse_devices_hint || 'Звук играет только на одном устройстве, остальные управляют им.'}
          </p>

          {devices.devices.map((device) => (
            <button
              key={device.id}
              type="button"
              onClick={() => handleSelect(device.id, device.self, device.active)}
              className={cn(
                'flex w-full items-center gap-3 rounded-3xl border border-transparent px-3 py-3 text-left duration-300 active:scale-95',
                device.active
                  ? 'border-zinc-600/30 bg-zinc-800/60'
                  : 'cursor-pointer hover:border-zinc-600/30 hover:bg-zinc-800/60',
              )}
            >
              <Icon
                name={device.kind === 'mobile' ? 'IC-mobile' : 'IC-laptop'}
                className={cn('h-6 w-6 shrink-0 duration-300', device.active ? 'fill-purple-400' : 'fill-zinc-400')}
              />

              <span className="flex min-w-0 flex-grow flex-col">
                <span className="truncate text-sm font-medium text-zinc-100">
                  {device.name || lang?.pulse_device_unknown || 'Устройство'}
                </span>
                <span className="truncate text-xs text-zinc-500">
                  {device.active
                    ? lang?.pulse_device_playing || 'Играет здесь'
                    : device.self
                      ? lang?.pulse_device_this || 'Это устройство'
                      : lang?.pulse_device_available || 'Доступно'}
                </span>
              </span>

              {device.active ? <Icon name="IC-speaker" className="h-5 w-5 shrink-0 fill-purple-400" /> : null}
            </button>
          ))}
        </div>
      </PulseModal>
    </>
  );
}
