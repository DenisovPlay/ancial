/**
 * Настройки Вейва — чистая логика без React и без импортов (покрыта node-тестами).
 * Серверная проверка — php-v2-api/.../modules/pulse/wave_prefs.php (pulse_wave_normalize): менять только вместе.
 */

export type WaveCharacter = 'familiar' | 'balanced' | 'discover';

export interface PulseWavePrefs {
  genres: string[];
  moods: string[];
  /** Пусто или any — любой язык; иначе ru / en / other / instrumental. */
  langs: string[];
  character: WaveCharacter;
  explicit: boolean;
  preset: string | null;
}

export const DEFAULT_WAVE: PulseWavePrefs = { genres: [], moods: [], langs: [], character: 'balanced', explicit: true, preset: null };

/** Пресеты «Утро / Дорога / …» заполняют настроения (жанры и язык не трогают). */
export const WAVE_PRESETS: Record<string, string[]> = {
  morning: ['energetic', 'happy', 'funny'],
  commute: ['happy', 'energetic', 'chill'],
  workout: ['energetic', 'aggressive'],
  focus: ['calm', 'chill', 'dreamy'],
  evening: ['chill', 'romantic', 'calm'],
  night: ['dark', 'chill', 'sexy', 'dreamy'],
};

export const WAVE_LANGS = ['any', 'ru', 'en', 'other', 'instrumental'] as const;
export const WAVE_CHARACTERS: WaveCharacter[] = ['familiar', 'balanced', 'discover'];

export function normalizeWave(raw: Partial<PulseWavePrefs> | null | undefined): PulseWavePrefs {
  const langs = Array.isArray(raw?.langs) ? raw.langs.filter((lang) => (WAVE_LANGS as readonly string[]).includes(lang)) : [];
  const character = WAVE_CHARACTERS.includes(raw?.character as WaveCharacter) ? (raw?.character as WaveCharacter) : 'balanced';
  return {
    genres: Array.isArray(raw?.genres) ? [...new Set(raw.genres.map(String))] : [],
    moods: Array.isArray(raw?.moods) ? [...new Set(raw.moods.map(String))] : [],
    langs: langs.includes('any') ? [] : [...new Set(langs)],
    character,
    explicit: raw?.explicit !== false,
    preset: typeof raw?.preset === 'string' && raw.preset in WAVE_PRESETS ? raw.preset : null,
  };
}

export function toggleInList(list: readonly string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/** Язык: «Любой» исключает остальные, выбор конкретного снимает «Любой». */
export function toggleWaveLang(langs: readonly string[], value: string): string[] {
  if (value === 'any') return [];
  return toggleInList(langs.filter((lang) => lang !== 'any'), value);
}

/** Пресет: повторное нажатие снимает его вместе с настроениями. */
export function applyWavePreset(wave: PulseWavePrefs, preset: string): PulseWavePrefs {
  if (!(preset in WAVE_PRESETS)) return wave;
  if (wave.preset === preset) return { ...wave, preset: null, moods: [] };
  return { ...wave, preset, moods: [...WAVE_PRESETS[preset]] };
}

/** Ручная правка настроений делает пресет «своим»: он больше не подсвечивается. */
export function withMoods(wave: PulseWavePrefs, moods: string[]): PulseWavePrefs {
  return { ...wave, moods, preset: null };
}

export function isDefaultWave(wave: PulseWavePrefs): boolean {
  return wave.genres.length === 0 && wave.moods.length === 0 && wave.langs.length === 0 && wave.character === 'balanced' && wave.explicit;
}

/** Краткая подпись для карточки и плеера: «Rap, Phonk · Грусть · Русский»; пусто — вызывающий подставит «по вкусу». */
export function summarizeWave(wave: PulseWavePrefs, label: (group: 'mood' | 'lang' | 'character', id: string) => string, limit = 3): string {
  const parts: string[] = [];
  if (wave.genres.length) parts.push(wave.genres.slice(0, limit).join(', ') + (wave.genres.length > limit ? '…' : ''));
  if (wave.moods.length) parts.push(wave.moods.slice(0, limit).map((id) => label('mood', id)).join(', ') + (wave.moods.length > limit ? '…' : ''));
  if (wave.langs.length) parts.push(wave.langs.map((id) => label('lang', id)).join(', '));
  if (wave.character !== 'balanced') parts.push(label('character', wave.character));
  return parts.join(' · ');
}
