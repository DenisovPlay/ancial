/**
 * Движение волны Вейва — только по метаданным (играет ли, настроение и жанр трека). К аудио не подключается:
 * Web Audio ломал воспроизведение в iOS PWA (эквалайзер выключен), поэтому здесь ни AudioContext, ни timeupdate.
 * Чистые функции: цель по состоянию → плавное приближение (step) → высота линии волны (waveOffset).
 */

export type Rgb = [number, number, number];

export interface WaveTarget {
  /** Амплитуда 0…1 */
  amp: number;
  /** Скорость фазы, рад/с */
  speed: number;
  from: Rgb;
  to: Rgb;
}

export interface WaveState extends WaveTarget {
  /** «Перекат» при смене трека: 1 → 0 */
  kick: number;
  phase: number;
}

/** Постоянная времени сближения с целью, с (≈ плавное перетекание за 1–2 с). */
export const WAVE_TAU = 0.6;
const KICK_TAU = 0.45;

const PALETTE_DEFAULT: [Rgb, Rgb] = [[99, 102, 241], [168, 85, 247]];
const PALETTE_WARM: [Rgb, Rgb] = [[236, 72, 153], [249, 115, 22]];
const PALETTE_COLD: [Rgb, Rgb] = [[56, 189, 248], [99, 102, 241]];
const PALETTE_DEEP: [Rgb, Rgb] = [[79, 70, 229], [109, 40, 217]];
const PALETTE_SEXY: [Rgb, Rgb] = [[190, 24, 93], [126, 34, 206]];

/** Настроение → [энергия -1…1, палитра]. */
const MOODS: Record<string, [number, [Rgb, Rgb]]> = {
  energetic: [0.9, PALETTE_WARM],
  aggressive: [1, PALETTE_WARM],
  funny: [0.5, PALETTE_WARM],
  happy: [0.45, PALETTE_WARM],
  sexy: [0.1, PALETTE_SEXY],
  romantic: [-0.1, PALETTE_SEXY],
  chill: [-0.4, PALETTE_COLD],
  dreamy: [-0.5, PALETTE_COLD],
  calm: [-0.7, PALETTE_COLD],
  sad: [-0.5, PALETTE_DEEP],
  dark: [-0.1, PALETTE_DEEP],
};

const FAST_GENRES = ['phonk', 'metal', 'hardbass', 'dubstep', 'drum & bass', 'techno', 'punk', 'trap', 'trance', 'house'];
const MID_GENRES = ['rap', 'russian rap', 'hip-hop', 'rock', 'russian rock', 'dance', 'pop', 'russian pop', 'k-pop', 'hyperpop', 'electronic'];
const SLOW_GENRES = ['lo-fi', 'ambient', 'classical', 'acoustic', 'jazz', 'soul', 'blues', 'folk', 'soundtrack'];

function genreEnergy(genre: string): number | null {
  const key = genre.trim().toLowerCase();
  if (!key) return null;
  if (FAST_GENRES.includes(key)) return 0.8;
  if (MID_GENRES.includes(key)) return 0.3;
  if (SLOW_GENRES.includes(key)) return -0.5;
  return 0;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function waveTarget(input: { playing: boolean; mood?: string; genre?: string }): WaveTarget {
  const mood = MOODS[(input.mood ?? '').trim().toLowerCase()];
  const byGenre = genreEnergy(input.genre ?? '');
  const energies = [mood?.[0], byGenre].filter((value): value is number => typeof value === 'number');
  const energy = energies.length ? energies.reduce((sum, value) => sum + value, 0) / energies.length : 0;
  const [from, to] = mood?.[1] ?? PALETTE_DEFAULT;
  if (!input.playing) return { amp: 0.22, speed: 0.25, from, to };
  return { amp: clamp(0.55 + 0.3 * energy, 0.3, 0.9), speed: clamp(0.9 + 0.6 * energy, 0.4, 1.6), from, to };
}

export function initialWaveState(target: WaveTarget): WaveState {
  return { ...target, from: [...target.from], to: [...target.to], kick: 0, phase: 0 };
}

const approach = (value: number, target: number, k: number) => value + (target - value) * k;
const approachRgb = (value: Rgb, target: Rgb, k: number): Rgb => [approach(value[0], target[0], k), approach(value[1], target[1], k), approach(value[2], target[2], k)];

/** Шаг по времени dt (с): всё плавно подтягивается к цели, перекат затухает, фаза едет. */
export function stepWave(state: WaveState, target: WaveTarget, dt: number): WaveState {
  const step = clamp(dt, 0, 0.1);
  const k = 1 - Math.exp(-step / WAVE_TAU);
  const speed = approach(state.speed, target.speed, k);
  return {
    amp: approach(state.amp, target.amp, k),
    speed,
    from: approachRgb(state.from, target.from, k),
    to: approachRgb(state.to, target.to, k),
    kick: state.kick * Math.exp(-step / KICK_TAU),
    phase: state.phase + speed * step,
  };
}

/** Эффективная амплитуда с учётом переката при смене трека. */
export const effectiveAmp = (state: WaveState) => clamp(state.amp * (1 + 0.35 * state.kick), 0, 1);

/** Смещение линии волны −1…1 в точке x (0…1): две синусоиды разной частоты, второй слой идёт навстречу. */
export function waveOffset(x: number, phase: number, layer: number, amp: number): number {
  const direction = layer % 2 === 0 ? 1 : -1;
  const f1 = 1.4 + layer * 0.7;
  const f2 = 2.9 + layer * 1.1;
  const y = 0.6 * Math.sin(x * Math.PI * 2 * f1 + phase * direction + layer * 1.7) + 0.4 * Math.sin(x * Math.PI * 2 * f2 - phase * 0.7 * direction + layer * 0.9);
  return clamp(y * amp, -1, 1);
}

export const rgbCss = (color: Rgb, alpha: number) => `rgba(${Math.round(color[0])},${Math.round(color[1])},${Math.round(color[2])},${alpha})`;
