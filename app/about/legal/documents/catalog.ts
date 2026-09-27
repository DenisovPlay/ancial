import type { LegalDocMeta } from './types';

/**
 * Список документов для страницы /about/legal (без текстов — они грузятся на странице документа).
 * Порядок = порядок карточек. slug = адрес /about/legal/<slug>; менять нельзя — на них ссылаются
 * магазины приложений, письма и сами документы.
 */
export const LEGAL_CATALOG: LegalDocMeta[] = [
  { slug: 'rules', lang: 'ru', title: 'Правила Zypo', summary: 'Пользовательское соглашение: как пользоваться сервисами' },
  { slug: 'privacy', lang: 'ru', title: 'Политика обработки персональных данных', summary: 'Какие данные мы обрабатываем, зачем и кому передаём' },
  { slug: 'consent', lang: 'ru', title: 'Согласие на обработку персональных данных', summary: 'Даётся при регистрации' },
  { slug: 'pulse-rules', lang: 'ru', title: 'Правила публикации в Pulse', summary: 'Загрузка музыки, авторские права, санкции' },
  { slug: 'wallet', lang: 'ru', title: 'Условия Кошелька', summary: 'Токены anci, пополнение, переводы, вывод, мерчанты' },
  { slug: 'recommendations', lang: 'ru', title: 'Правила применения рекомендательных технологий', summary: 'Как формируются подборки в Pulse и ленте' },
  { slug: 'cookies', lang: 'ru', title: 'Политика использования cookie', summary: 'Cookie, локальное хранилище и аналитика' },
  { slug: 'account-deletion', lang: 'ru', title: 'Удаление аккаунта', summary: 'Как удалить аккаунт и что происходит с данными' },
  { slug: 'terms', lang: 'en', title: 'Terms of Service', summary: 'How to use Zypo services' },
  { slug: 'privacy-en', lang: 'en', title: 'Privacy Policy', summary: 'What data we process, why and with whom we share it' },
  { slug: 'cookies-en', lang: 'en', title: 'Cookie Policy', summary: 'Cookies, local storage and analytics' },
];

/**
 * Версия «Согласия на обработку персональных данных», которую пользователь принимает при регистрации:
 * уходит на бэкенд вместе с регистрацией и пишется в журнал (доказательство согласия). Должна совпадать
 * с версией документа consent — это проверяет legal-docs.test.mts.
 */
export const LEGAL_CONSENT_VERSION = '1.0';
