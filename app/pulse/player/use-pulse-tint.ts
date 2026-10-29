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

export interface PulseLayerTint {
  className: string;
  /** Цвет обложки (CSS), если подкраска по обложке и цвет достался; иначе null. */
  color: string | null;
  mode: 'cover' | 'mood' | 'off';
  style: CSSProperties | undefined;
}

/**
 * Прозрачный цветной слой под блоком Pulse (страница, Вейв). По настроению — прежние классы Tailwind (вид не меняется),
 * по обложке — тот же слой цветом обложки (плавно: transition-colors у слоя). Нет трека — розовый Pulse.
 */
export function usePulseLayerTint(artwork: string | null | undefined, mood: string | null | undefined, hasTrack: boolean): PulseLayerTint {
  const { pulseColor } = useAppearanceMotion();
  const { color, failed } = useCoverColorState(hasTrack ? artwork : null, pulseColor === 'cover' && hasTrack);
  if (pulseColor === 'off') return { className: '', color: null, mode: 'off', style: undefined };
  if (pulseColor === 'cover' && hasTrack) {
    // Не достали цвет обложки — настроение (прежний вид), пока цвет считается — без слоя.
    if (failed && !color) return { className: getPulseBackgroundColorByMood(mood), color: null, mode: 'mood', style: undefined };
    return { className: '', color, mode: 'cover', style: color ? { backgroundColor: `color-mix(in srgb, ${color} 35%, transparent)` } : undefined };
  }
  return { className: getPulseBackgroundColorByMood(mood), color: null, mode: 'mood', style: undefined };
}

/** Фон страниц Pulse под играющий трек. */
export function usePulsePageTint(track: PulseTrack | null | undefined): { className: string; style: CSSProperties | undefined } {
  const { className, style } = usePulseLayerTint(track ? getPlayerTrackArtwork(track) : null, track?.mood, Boolean(track));
  return { className, style };
}
