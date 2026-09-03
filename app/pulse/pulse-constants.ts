export const PULSE_GENRES = [
  'Russian Rap',
  'Hip-Hop',
  'Pop',
  'Rock',
  'Electronic',
  'Dance',
  'R&B',
  'Soul',
  'Jazz',
  'Blues',
  'Indie',
  'Alternative',
  'Metal',
  'Punk',
  'Classical',
  'Acoustic',
  'Folk',
  'Lo-Fi',
  'Phonk',
  'Trap',
  'Hyperpop',
  'Ambient',
  'Soundtrack',
  'Reggae',
  'House',
  'Techno',
  'Drum & Bass',
] as const;

export type PulseGenre = (typeof PULSE_GENRES)[number];

export interface PulseMoodOption {
  id: string;
  labelKey: string;
  bgClass: string;
  dotColor: string;
}

export const PULSE_MOODS: PulseMoodOption[] = [
  { id: 'happy', labelKey: 'pulse_mood_happy', bgClass: 'bg-amber-500/25', dotColor: 'bg-amber-400' },
  { id: 'sad', labelKey: 'pulse_mood_sad', bgClass: 'bg-blue-500/25', dotColor: 'bg-blue-400' },
  { id: 'funny', labelKey: 'pulse_mood_funny', bgClass: 'bg-orange-500/25', dotColor: 'bg-orange-400' },
  { id: 'energetic', labelKey: 'pulse_mood_energetic', bgClass: 'bg-red-500/25', dotColor: 'bg-red-400' },
  { id: 'calm', labelKey: 'pulse_mood_calm', bgClass: 'bg-teal-500/25', dotColor: 'bg-teal-400' },
  { id: 'romantic', labelKey: 'pulse_mood_romantic', bgClass: 'bg-rose-500/25', dotColor: 'bg-rose-400' },
  { id: 'dark', labelKey: 'pulse_mood_dark', bgClass: 'bg-zinc-500/25', dotColor: 'bg-zinc-400' },
  { id: 'aggressive', labelKey: 'pulse_mood_aggressive', bgClass: 'bg-red-600/25', dotColor: 'bg-red-500' },
  { id: 'dreamy', labelKey: 'pulse_mood_dreamy', bgClass: 'bg-indigo-500/25', dotColor: 'bg-indigo-400' },
  { id: 'chill', labelKey: 'pulse_mood_chill', bgClass: 'bg-cyan-500/25', dotColor: 'bg-cyan-400' },
  { id: 'sexy', labelKey: 'pulse_mood_sexy', bgClass: 'bg-fuchsia-500/25', dotColor: 'bg-fuchsia-400' },
  { id: 'scary', labelKey: 'pulse_mood_scary', bgClass: 'bg-stone-600/25', dotColor: 'bg-stone-400' },
];

export interface PulseTrackLanguage {
  code: string;
  label: string;
}

export const PULSE_TRACK_LANGUAGES: PulseTrackLanguage[] = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
  { code: 'be', label: 'Беларуская' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
  { code: 'instrumental', label: 'Инструментал (без слов)' },
];
