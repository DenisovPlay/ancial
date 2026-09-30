'use client';

import { usePathname } from 'next/navigation';

import { isPlayerDisabledPath } from '../lib/player-routes';
import { PulsePlayerProvider } from './PulsePlayerContext';

/**
 * На страницах без плеера (кино) провайдер не монтируется совсем: нет аудиоэлемента, Media Session,
 * подписок на устройства аккаунта и «пульта». Скрытием интерфейса это не решалось.
 * При переходе через границу дерево под ней пересоздаётся один раз.
 */
export default function PulsePlayerBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isPlayerDisabledPath(pathname)) return <>{children}</>;
  return <PulsePlayerProvider>{children}</PulsePlayerProvider>;
}
