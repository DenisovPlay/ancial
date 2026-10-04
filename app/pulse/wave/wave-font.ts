import { Fira_Sans_Extra_Condensed } from 'next/font/google';

/** Тот же плотный узкий гротеск, что у заголовков /app/mobile: ВЕЙВ рисуем им (один экземпляр шрифта на сайт). */
export const waveFont = Fira_Sans_Extra_Condensed({ display: 'swap', style: ['normal', 'italic'], subsets: ['latin', 'cyrillic'], weight: ['800', '900'] });
