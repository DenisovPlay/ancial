/** Цвет настроения трека (переменные палитры Tailwind). Тот же набор, что у getPulseBackgroundColorByMood; без настроения — розовый Pulse. */
const MOOD_COLORS: Record<string, string> = {
  aggressive: 'red-600',
  calm: 'teal-500',
  chill: 'cyan-500',
  dark: 'zinc-500',
  dreamy: 'indigo-500',
  energetic: 'red-500',
  funny: 'orange-500',
  happy: 'amber-500',
  romantic: 'rose-500',
  sad: 'blue-500',
  scary: 'stone-600',
  sexy: 'fuchsia-500',
};

export function getPulseMoodColor(mood: string | null | undefined): string {
  return `var(--color-${MOOD_COLORS[mood?.toLowerCase().trim() ?? ''] ?? 'pink-500'})`;
}
