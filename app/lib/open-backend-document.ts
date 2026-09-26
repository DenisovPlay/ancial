import { API_BASE } from '../config';
import { backendFetch } from './auth-fetch';
import { IS_NATIVE_APP } from './platform';

/** Событие для AppDocumentViewer: показать HTML-документ бэкенда внутри приложения. */
export const APP_DOCUMENT_EVENT = 'zypo:app-document';

export type AppDocumentDetail = { html: string; title: string };

/**
 * Открыть HTML-документ бэкенда, требующий авторизации (чек транзакции).
 * Сайт: новая вкладка, как было (сессия по куке). Приложение: у системного браузера нет токена —
 * документ запрашивается с Bearer и показывается в окне внутри приложения.
 */
export async function openBackendDocument(path: string, title: string): Promise<void> {
  if (!IS_NATIVE_APP) {
    window.open(path, '_blank');
    return;
  }
  const response = await backendFetch(path);
  if (!response.ok) throw new Error(`Document request failed with status ${response.status}`);
  const body = await response.text();
  // Относительные стили и картинки документа — с бэкенда.
  const base = `<base href="${API_BASE}">`;
  const html = /<head[^>]*>/i.test(body) ? body.replace(/<head([^>]*)>/i, `<head$1>${base}`) : `${base}${body}`;
  window.dispatchEvent(new CustomEvent<AppDocumentDetail>(APP_DOCUMENT_EVENT, { detail: { html, title } }));
}
