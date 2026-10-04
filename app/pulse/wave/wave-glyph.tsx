/**
 * Линейные иконки пресетов и настроений Вейва (24×24, штрих currentColor): единый набор вместо эмодзи,
 * которые выглядят по-разному на разных устройствах. Размер и цвет — классами (`h-6 w-6`, `text-amber-300`).
 */
const SMILE_EYES = <path d="M9 9.5h.01M15 9.5h.01" />;

const GLYPHS: Record<string, React.ReactNode> = {
  // пресеты
  morning: (<><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></>),
  commute: (<><path d="m8 21 2-18M16 21l-2-18" /><path d="M12 5v2M12 11v2M12 17v2" /></>),
  workout: (<><path d="M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12" /></>),
  focus: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" /></>),
  evening: (<><path d="M5 17a7 7 0 0 1 14 0" /><path d="M3 20h18M12 5v2M5.6 9l1.4 1.4M18.4 9 17 10.4" /></>),
  night: (<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />),
  // настроения
  happy: (<><circle cx="12" cy="12" r="9" />{SMILE_EYES}<path d="M8 14c1 2 2.5 3 4 3s3-1 4-3" /></>),
  sad: (<><circle cx="12" cy="12" r="9" />{SMILE_EYES}<path d="M8 16.5c1-1.8 2.5-2.5 4-2.5s3 .7 4 2.5" /></>),
  funny: (<><circle cx="12" cy="12" r="9" />{SMILE_EYES}<path d="M7.5 13h9a4.5 4.5 0 0 1-9 0z" /></>),
  energetic: (<path d="M13 2 4 14h7l-1 8 10-13h-7z" />),
  calm: (<><path d="M5 19c0-8 5-14 15-14 0 9-5 14-13 14" /><path d="M5 19c3-4 6-7 10-9" /></>),
  romantic: (<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />),
  dark: (<><path d="M5 11a7 7 0 0 1 14 0c0 2-1 3-2 4v3H7v-3c-1-1-2-2-2-4z" /><path d="M9.5 11.5h.01M14.5 11.5h.01" /></>),
  aggressive: (<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z" />),
  dreamy: (<path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.5-1A4.5 4.5 0 0 1 17 18z" />),
  chill: (<><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><path d="M4 15h3v5H4zM17 15h3v5h-3z" /></>),
  sexy: (<path d="M12 3 20 10l-8 11L4 10z" />),
  scary: (<><path d="M6 20V11a6 6 0 0 1 12 0v9l-2.5-2-2 2-1.5-2-1.5 2-2-2z" /><path d="M9.5 11h.01M14.5 11h.01" /></>),
  // язык и характер
  any: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>),
  instrumental: (<><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></>),
  familiar: (<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />),
  balanced: (<path d="M4 9h16M4 15h16M9 5v8M15 11v8" />),
  discover: (<><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>),
};

export default function WaveGlyph({ className, name }: { className?: string; name: string }) {
  const glyph = GLYPHS[name];
  if (!glyph) return null;
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {glyph}
    </svg>
  );
}
