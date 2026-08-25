// Единый источник версии приложения Zypo.
// Версия задаётся ТОЛЬКО в package.json ("version") и импортируется отсюда.
import pkg from '../../package.json';

export const APP_VERSION: string = pkg.version;

// Публичное имя клиента (бренд): Ancial → Zypo.
export const CLIENT_NAME = 'ZypoClient';
