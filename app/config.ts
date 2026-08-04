// Центральная конфигурация проекта — единственное место, где задаются домены.
// Все остальные файлы обязаны импортировать значения отсюда, а не хардкодить URL.

/** Бэкенд (PHP V2-API), на который next.config.ts проксирует /api, /includes, /pay и т.д. */
export const API_BASE = 'https://backend.ru.zypo.cc/';

/** WebSocket-endpoint (мессенджер, звонки) */
export const WS_BASE = 'wss://ws.ru.zypo.cc/';

/** Публичный (канонический) адрес сайта — SEO, ссылки-шары, OAuth redirect */
export const SITE_URL = 'https://zypo.cc';

/** Домен сайта без протокола — используется в регэкспах и подписях */
export const SITE_DOMAIN = 'zypo.cc';

/** Внешний сервис текстов песен (Pulse) */
export const PULSE_LYRICS_BASE = 'https://lyrics.pulse.zypo.cc';

/** Базовый URL бэкенда Кинотеатра (Cinema / PHP V2 API) */
export const CINEMA_API_BASE = 'https://backend.ru.zypo.cc/api/V2/cinema';

/** Внешний прокси/кэш изображений Cinema */
export const CINEMA_IMAGE_PROXY_BASE = `${CINEMA_API_BASE}/image-proxy.php`;
