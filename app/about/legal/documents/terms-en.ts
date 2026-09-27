import type { LegalDoc } from './types';

export const TERMS_EN: LegalDoc = {
  slug: 'terms',
  lang: 'en',
  title: 'Terms of Service',
  summary: 'How to use Zypo services',
  version: '2.0',
  effective: 'Version of 27 September 2026. Applies to new users upon acceptance and to existing users from 4 October 2026.',
  intro: [
    'These Terms are an agreement between ZeniFlow (the "Administration") and everyone who uses Zypo services at https://zypo.cc and in the Zypo mobile apps (the "User"). This is a translation; in case of discrepancies, the [[/about/legal/rules|Russian version]] prevails.',
    { note: 'Official correspondence — only via contact@zypo.cc. Put the subject in square brackets, e.g. [Content Complaint]; see section 14 for the list.' },
  ],
  sections: [
    {
      id: 'general',
      title: '1. General',
      blocks: [
        'Zypo includes: Feed (posts), Communities, Chats and calls, Pulse (music), Cinema (video), Wallet (anci tokens), built-in apps and games, and the Zypo mobile apps.',
        'By registering or continuing to use Zypo, the User accepts these Terms, the [[/about/legal/privacy-en|Privacy Policy]], the [[/about/legal/cookies-en|Cookie Policy]] and the rules of individual services ([[/about/legal/pulse-rules|Pulse Publishing Rules]], [[/about/legal/wallet|Wallet Terms]], in Russian). Consent to personal data processing is given separately at registration.',
        'The Administration may change these Terms. A new version takes effect 7 calendar days after publication unless stated otherwise. Continued use means acceptance.',
        'These Terms are governed by the laws of the Russian Federation.',
        'Zypo may be used from the age of 14. Some content is intended for adults and carries an age mark (e.g. "E" on Pulse tracks). Users under 18 use Zypo under the supervision of parents or legal guardians.',
      ],
    },
    {
      id: 'account',
      title: '2. Account and security',
      blocks: [
        '2.1. Registration requires a unique username, a password, and an email address and/or phone number. You can also sign up and sign in with Yandex ID or Telegram (where available).',
        '2.2. Two-factor authentication (authenticator app codes) and passkeys are available. Active sessions are listed under Security and can be terminated.',
        '2.3. The User must provide accurate data; not create accounts to evade bans; not share account access; keep passwords, codes and passkeys secret; report compromises to contact@zypo.cc with the subject [Security].',
        '2.4. The Administration may refuse registration, request email or phone verification if fraud or spam is suspected, and restrict or block accounts that violate these Terms.',
        '2.5. How to delete an account: see [[/about/legal/account-deletion|Account deletion]] (in Russian) or email contact@zypo.cc with the subject [Account Deletion].',
      ],
    },
    {
      id: 'content',
      title: '3. User content',
      blocks: [
        '3.1. Everything the User publishes or sends (posts, comments, messages, images, audio, lyrics) is the User\'s content and the User\'s responsibility.',
        '3.2. By publishing content, the User confirms the right to distribute it and grants the Administration a free, non-exclusive licence to store, process, reproduce and display it in Zypo services for as long as it is published, to the extent needed to operate the services. The licence ends when the content is deleted, except for copies the Administration must keep by law.',
        '3.3. Prohibited everywhere in Zypo: pornography and sexual content; violence and cruelty, calls for violence, extremism, terrorism, incitement of hatred; promotion of drugs, suicide and dangerous practices; insults, threats, harassment, defamation, publishing other people\'s personal data without consent (doxxing); knowingly false socially significant information; spam, fraud, phishing, malware, fake engagement and bots; content infringing third-party rights; any other information prohibited by the laws of the Russian Federation.',
        '3.4. Any topic, including politics and religion, may be discussed without insults, threats and incitement of hostility.',
      ],
    },
    {
      id: 'feed',
      title: '4. Feed and communities',
      blocks: [
        'Posts are published on the User\'s own behalf or on behalf of a community where the User is a Creator or Editor. Creators appoint Editors and may set additional community rules; Creators and Editors are responsible for content they publish on behalf of the community. Communities may not impersonate authorities, brands or the Administration, be used for spam or fraud, or be sold without the Administration\'s permission. Posts are not pre-moderated; violating content is removed upon complaints, and communities may be deleted for gross or repeated violations.',
      ],
    },
    {
      id: 'chats',
      title: '5. Chats and calls',
      blocks: [
        'Messages are stored on Zypo servers to deliver them, keep chat history and sync devices; Users can delete their messages. The Administration does not read or pre-moderate chats; messages may be accessed only when reviewing a complaint about specific messages or upon a lawful request of competent authorities. Voice and video calls are not recorded by the Administration. Spam, fraudulent links, insults, threats, harassment, prohibited content and coordinating violations are prohibited in chats and calls.',
      ],
    },
    {
      id: 'services',
      title: '6–8. Pulse, Cinema, Wallet',
      blocks: [
        'Music uploads are governed by the [[/about/legal/pulse-rules|Pulse Publishing Rules]]. Cinema shows films and series through third-party players; the Administration does not host the video files and is not responsible for their content or availability. anci tokens, top-ups, transfers, withdrawals and merchants are governed by the [[/about/legal/wallet|Wallet Terms]].',
      ],
    },
    {
      id: 'copyright',
      title: '9. Copyright and complaints',
      blocks: [
        'Rights holders send notices to contact@zypo.cc with the subject [Copyright], including contact details, a description of the work, a link to the material on Zypo, proof of rights with a good-faith statement, and a signature (electronic or scanned). Valid notices are handled within 72 hours of receipt (within 24 hours for Pulse). The author is notified and may object with the subject [Appeal]. Repeated infringements lead to account blocking.',
      ],
    },
    {
      id: 'sanctions',
      title: '10. Prohibited actions and sanctions',
      blocks: [
        'Prohibited: evading bans with new accounts; bots and automation without consent; scraping user data; selling accounts; impersonating the Administration or others; organising mass attacks and harassment; interfering with the services. Sanctions: content removal, feature restrictions, temporary or permanent account blocking, Wallet suspension. Where the law is broken, data may be disclosed to competent authorities upon lawful request. Obvious violations are sanctioned without prior warning.',
      ],
    },
    {
      id: 'moderation',
      title: '11. Moderation and appeals',
      blocks: [
        'Report content with the "Report" button or by email with the subject [Content Complaint] ([Community Complaint] for communities, [Illegal Content] for unlawful information). Moderation is carried out by Administration staff and, in some cases, trained volunteers under their supervision. Decisions may be appealed within 30 days by email with the subject [Appeal]; appeals are reviewed within 5 business days, and the appeal decision is final.',
      ],
    },
    {
      id: 'data',
      title: '12. Personal data',
      blocks: [
        'See the [[/about/legal/privacy-en|Privacy Policy]], the [[/about/legal/cookies-en|Cookie Policy]] and the [[/about/legal/recommendations|Recommendation Technologies Rules]] (in Russian).',
      ],
    },
    {
      id: 'liability',
      title: '13. Liability',
      blocks: [
        'The services are provided "as is". The Administration strives for uninterrupted operation but does not guarantee it and is not liable for losses caused by outages, other users\' actions, third-party services and links, or force majeure (including military action, mobilisation, terrorist acts, civil unrest, epidemics, natural disasters, fires and accidents, states of emergency or counter-terrorist operation regimes, decisions and actions of authorities (including access restrictions and communication shutdowns), sanctions and other restrictive measures, failures of power, telecommunications and third-party infrastructure, and cyberattacks). If any provision is held invalid, the rest remain in force. Disputes are resolved through negotiation and, failing that, in court under the laws of the Russian Federation; claims are sent to contact@zypo.cc and answered within 30 days.',
      ],
    },
    {
      id: 'contacts',
      title: '14. Contacts and email subjects',
      blocks: [
        'All requests go to contact@zypo.cc. Russian subjects from the Russian version are also accepted.',
        {
          table: {
            head: ['Subject', 'When'],
            rows: [
              ['[Content Complaint]', 'content violating these Terms'],
              ['[Community Complaint]', 'violations in a community or by its Editors'],
              ['[Illegal Content]', 'drugs, extremism, other unlawful information'],
              ['[Copyright]', 'rights holder notice'],
              ['[Appeal]', 'appealing a block or removal'],
              ['[Security]', 'account compromise, suspicious activity'],
              ['[Account Deletion]', 'deleting your account'],
              ['[Personal Data]', 'requests about your data, withdrawing consent'],
              ['[Wallet]', 'top-ups, transfers, withdrawals, suspension'],
              ['[Clarification]', 'replying to an Administration request'],
            ],
          },
        },
      ],
    },
  ],
};
