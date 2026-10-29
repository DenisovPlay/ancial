'use client';

import type { CSSProperties } from 'react';

import { useAppearanceMotion } from '../../lib/use-appearance';
import { getPulseMoodColor } from '../mood-color';
import { getPulseBackgroundColorByMood } from '../pulse-components';
import { useCoverColorState } from './cover-color';
import { getPlayerTrackArtwork } from './player-utils';
import type { PulseTrack } from '../../context/PulsePlayerContext';

/**
 * Цвет подкраски Pulse по настройке «Цвет Pulse» (Интерфейс → Анимации): обложка, настроение или ничего.
 * null — подкрашивать нечем (выключено или цвет обложки ещё считается).
 */
export function usePulseTint(artwork: string | null | undefined, mood: string | null | undefined): string | null {
  const { pulseColor } = useAppearanceMotion();
  const { color, failed } = useCoverColorState(artwork, pulseColor === 'cover');
  // Цвет обложки достать нельзя (чужой хост без CORS) — подкрашиваем настроением, чтобы интерфейс не оставался без цвета.
  if (pulseColor === 'cover') return color ?? (failed ? getPulseMoodColor(mood) : null);
  if (pulseColor === 'mood') return getPulseMoodColor(mood);
  return null;
}

/**
 * Фон страниц Pulse под играющий трек. По настроению — прежние классы Tailwind (вид не меняется), по обложке —
 * тот же прозрачный слой цветом обложки (плавно: transition-colors у страницы). Нет трека — розовый Pulse.
 */
export function usePulsePageTint(track: PulseTrack | null | undefined): { className: string; style: CSSProperties | undefined } {
  const { pulseColor } = useAppearanceMotion();
  const { color, failed } = useCoverColorState(track ? getPlayerTrackArtwork(track) : null, pulseColor === 'cover' && Boolean(track));
  if (pulseColor === 'off') return { className: '', style: undefined };
  if (pulseColor === 'cover' && track) {
    // Не достали цвет обложки — настроение (прежний вид), пока цвет считается — без слоя.
    if (failed && !color) return { className: getPulseBackgroundColorByMood(track.mood), style: undefined };
    return { className: '', style: color ? { backgroundColor: `color-mix(in srgb, ${color} 35%, transparent)` } : undefined };
  }
  return { className: getPulseBackgroundColorByMood(track?.mood), style: undefined };
}
