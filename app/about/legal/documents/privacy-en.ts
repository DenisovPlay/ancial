import type { LegalDoc } from './types';

export const PRIVACY_EN: LegalDoc = {
  slug: 'privacy-en',
  lang: 'en',
  title: 'Privacy Policy',
  summary: 'What data we process, why and with whom we share it',
  version: '2.0',
  effective: 'Version of 27 September 2026, effective upon publication.',
  intro: [
    'Operator: ZeniFlow (the "Operator"). This Policy covers personal data of users of zypo.cc and the Zypo mobile apps (the "Services") and is based on Russian Federal Law No. 152-FZ "On Personal Data". The [[/about/legal/privacy|Russian version]] prevails in case of discrepancies.',
    'Contact for personal data matters: contact@zypo.cc, subject [Personal Data].',
  ],
  sections: [
    {
      id: 'data',
      title: '1. Data we process',
      blocks: [
        {
          list: [
            'Account: username, first and last name (as entered), email, phone number, password (hashed only), profile picture and cover, bio, country.',
            'Sign-in and security: session data (IP address, browser, device and OS, country by IP, sign-in time), security event log, two-factor settings, passkey public keys. Passkeys and authenticator codes stay on your device.',
            'Third-party sign-in: Telegram ID and name; Yandex ID email, phone and ID — to the extent you allowed.',
            'Content and communication: posts, comments, reactions, chat messages and attachments, uploaded images, audio and lyrics, communities, subscriptions, friends; unsent drafts of messages and posts (kept on the device and on our servers so they can be shown on the User\'s other devices, and deleted when sent or published, when the cache is cleared in settings, or when the account is deleted).',
            'Usage: Pulse listening history and likes, playlists, bookmarks, presence status (visibility is configurable), Cinema viewing data.',
            'Wallet: accounts, balances and transaction history of anci tokens, top-up and withdrawal orders (payout details as required by the chosen method).',
            'Calls: technical connection data (time, participants, IP addresses used to connect). Call content is not recorded.',
            'Device and notifications: push token, device model and OS, app settings.',
            'Location — only if you allow it, to show the weather. Coordinates are used for the forecast request and not stored in your profile.',
            'Anonymous visit statistics: cookies and Yandex Metrica — see the [[/about/legal/cookies-en|Cookie Policy]].',
            'Support requests: email correspondence.',
          ],
        },
        'We do not intentionally collect special categories of data (race, political views, religion, health, sex life) or biometric data.',
      ],
    },
    {
      id: 'purposes',
      title: '2. Purposes and legal grounds',
      blocks: [
        'We process data to register and protect your account; operate the Services (publishing, message and notification delivery, calls, music playback, Wallet operations); provide personalised recommendations; moderate content and handle complaints; comply with the law; compile anonymous statistics; and inform you about the Services. Legal grounds: your consent, performance of the [[/about/legal/terms|Terms of Service]], legal obligations, and data you made public yourself.',
      ],
    },
    {
      id: 'sharing',
      title: '3. Sharing',
      blocks: [
        'We do not sell personal data. Data is shared only as needed to operate the Services:',
        {
          table: {
            head: ['Recipient', 'Purpose', 'Data'],
            rows: [
              ['Hosting and storage providers (incl. VK Cloud)', 'hosting the Services, storing files', 'Service data over encrypted connections'],
              ['Google LLC (Firebase Cloud Messaging), USA', 'push notifications', 'device token, notification text'],
              ['Yandex LLC', 'visit statistics (Yandex Metrica), Yandex ID sign-in', 'cookies, anonymous visit data; sign-in data'],
              ['Telegram FZ-LLC, UAE', 'Telegram sign-in', 'sign-in data provided by Telegram'],
              ['Payment partners', 'Wallet top-ups and withdrawals', 'order data and payment details'],
              ['Competent authorities', 'upon lawful request', 'as required'],
            ],
          },
        },
        'Transfers to Google LLC (USA) and Telegram FZ-LLC (UAE) are cross-border and are based on your consent. You can avoid them by turning off push notifications and not using Telegram sign-in. Personal data of Russian citizens is recorded and stored in databases located in the Russian Federation.',
      ],
    },
    {
      id: 'retention',
      title: '4. Retention',
      blocks: [
        'Account data and content — while the account exists, deleted within 30 days after account deletion (except data we must keep by law); session data — until sign-out, at most 60 days of inactivity; security log — up to 1 year; complaints and moderation records — up to 3 years; Wallet transaction records — as required by law; support requests — up to 3 years.',
      ],
    },
    {
      id: 'rights',
      title: '5. Your rights',
      blocks: [
        'You may request information about and a copy of your data, have inaccurate or unnecessary data corrected, blocked or deleted, withdraw consent, delete your account ([[/about/legal/account-deletion|how]]), and complain to Roskomnadzor or a court. Send requests to contact@zypo.cc with the subject [Personal Data]; we reply within 10 business days (extendable by 5 business days with notice).',
      ],
    },
    {
      id: 'app',
      title: '6. Mobile apps',
      blocks: [
        'The apps ask for permissions only when a feature needs them and work without them if you decline: notifications (push), camera and microphone (calls, QR scanning in Wallet), location (weather), background playback (Pulse). The app stores your sign-in token, page and image cache and offline tracks on the device; clear them in Settings → Cache or by uninstalling the app.',
      ],
    },
    {
      id: 'final',
      title: '7. Children and changes',
      blocks: [
        'The Services are for users aged 14 and over. We may update this Policy; a new version takes effect upon publication.',
      ],
    },
  ],
};
