import type { LegalDoc } from './types';

export const COOKIES_EN: LegalDoc = {
  slug: 'cookies-en',
  lang: 'en',
  title: 'Cookie Policy',
  summary: 'Cookies, local storage and analytics',
  version: '2.0',
  effective: 'Version of 27 September 2026, effective upon publication.',
  intro: [
    'The [[/about/legal/cookies|Russian version]] prevails in case of discrepancies.',
  ],
  sections: [
    {
      id: 'list',
      title: '1. What we use',
      blocks: [
        {
          table: {
            head: ['What', 'Why', 'Can be turned off'],
            rows: [
              ['Sign-in session cookie', 'signing in on the website', 'no — required for sign-in'],
              ['Language cookie', 'showing the site in your language', 'no — required'],
              ['localStorage', 'sign-in token, interface settings, feed/chat/music cache for speed and offline mode', 'clear in Settings → Cache or in the browser'],
              ['IndexedDB', 'tracks saved for offline listening', 'clear in Settings → Cache'],
              ['Service Worker cache', 'pages and images for speed and offline mode', 'clear in Settings → Cache'],
              ['Yandex Metrica (_ym* cookies)', 'anonymous visit statistics and click map', 'yes — in browser settings or with a blocker'],
            ],
          },
        },
        'We do not use cookies for advertising and do not sell visit data.',
      ],
    },
    {
      id: 'third',
      title: '2. Third-party services',
      blocks: [
        'Third-party services embedded in Zypo (Cinema players, built-in apps and games, the Telegram sign-in widget) may set their own cookies under their own policies, which we do not control.',
      ],
    },
    {
      id: 'manage',
      title: '3. Managing cookies',
      blocks: [
        'Delete or block cookies in your browser settings and clear app data in Settings → Cache. Disabling required cookies breaks sign-in and some features. Settings apply per device and browser. By continuing to use the site you agree to the required technologies above; you can opt out of Yandex Metrica as described.',
      ],
    },
  ],
};
