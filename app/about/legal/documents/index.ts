import { ACCOUNT_DELETION_RU } from './account-deletion-ru.ts';
import { CONSENT_RU } from './consent-ru.ts';
import { COOKIES_EN } from './cookies-en.ts';
import { COOKIES_RU } from './cookies-ru.ts';
import { PRIVACY_EN } from './privacy-en.ts';
import { PRIVACY_RU } from './privacy-ru.ts';
import { PULSE_RULES_RU } from './pulse-rules-ru.ts';
import { RECOMMENDATIONS_RU } from './recommendations-ru.ts';
import { RULES_RU } from './rules-ru.ts';
import { TERMS_EN } from './terms-en.ts';
import type { LegalDoc } from './types.ts';
import { WALLET_RU } from './wallet-ru.ts';

/** Тексты документов по slug — только для серверной страницы документа (в клиентский бандл не попадают). */
export const LEGAL_DOCS: Record<string, LegalDoc> = Object.fromEntries(
  [
    RULES_RU,
    PRIVACY_RU,
    CONSENT_RU,
    PULSE_RULES_RU,
    WALLET_RU,
    RECOMMENDATIONS_RU,
    COOKIES_RU,
    ACCOUNT_DELETION_RU,
    TERMS_EN,
    PRIVACY_EN,
    COOKIES_EN,
  ].map((doc) => [doc.slug, doc]),
);
