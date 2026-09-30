import { AncialAPI, AncialAPIError } from './api-v2';
import { cache } from './cache.ts';
import { type DraftRecord, nextDraftTs, resolveDraft } from './draft-sync.ts';
import { clearEntryNamespace } from './entry-nav';
import { globalWS } from './global-ws';

/**
 * Черновики сообщений (`dialog`, ref — id диалога) и постов (`post`, ref — id автора, `0` — от себя).
 * Локально — localStorage без срока жизни (чистится в /settings/cache), на сервере — user_drafts:
 * правки уходят с задержкой, остальные устройства получают их по WebSocket (`draft:update`).
 */

export type DraftKind = 'dialog' | 'post';
export type { DraftRecord };

const PUSH_DELAY_MS = 800;
/** Пространства имён черновиков в состоянии записи истории (см. entry-nav). */
const ENTRY_DRAFT_NAMESPACES = ['post-draft', 'post-edit-draft'];

type DraftListener = (draft: DraftRecord | null) => void;
interface PendingPush {
  kind: DraftKind;
  ref: string;
  payload: string;
  ts: number;
}

const listeners = new Map<string, Set<DraftListener>>();
/** Слушатели всего вида черновиков (список чатов): ref '' — очищены все. */
const kindListeners = new Map<DraftKind, Set<(ref: string, draft: DraftRecord | null) => void>>();
const pending = new Map<string, { item: PendingPush; timer: ReturnType<typeof setTimeout> }>();
const failed = new Map<string, PendingPush>();
let origin = '';
let bridgeReady = false;

const keyOf = (kind: DraftKind, ref: string) => `${kind}:${ref}`;

/** Идентификатор этой вкладки: свои же правки, вернувшиеся по WebSocket, отбрасываем. */
function getOrigin() {
  if (!origin) {
    origin = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `o${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
  return origin;
}

function readLocal(kind: DraftKind, ref: string): DraftRecord | null {
  const value = cache.get<DraftRecord>(ref, { category: 'drafts', subcategory: kind });
  if (!value || typeof value !== 'object' || typeof value.payload !== 'string' || typeof value.ts !== 'number') return null;
  return value;
}

function writeLocal(kind: DraftKind, ref: string, record: DraftRecord | null) {
  if (!record || record.payload === '') {
    cache.remove(ref, { category: 'drafts', subcategory: kind });
    return;
  }
  cache.set(ref, record, { category: 'drafts', subcategory: kind, ttl: 0, isPersistent: true });
}

function notifyKind(kind: DraftKind, ref: string, draft: DraftRecord | null) {
  kindListeners.get(kind)?.forEach((listener) => {
    try {
      listener(ref, draft);
    } catch (error) {
      console.error('[drafts] kind listener failed', error);
    }
  });
}

function notify(kind: DraftKind, ref: string, draft: DraftRecord | null) {
  notifyKind(kind, ref, draft);
  listeners.get(keyOf(kind, ref))?.forEach((listener) => {
    try {
      listener(draft);
    } catch (error) {
      console.error('[drafts] listener failed', error);
    }
  });
}

async function push(item: PendingPush) {
  const key = keyOf(item.kind, item.ref);
  try {
    await AncialAPI.setDraft({ kind: item.kind, origin: getOrigin(), payload: item.payload, ref: item.ref, ts: item.ts });
    failed.delete(key);
  } catch (error) {
    // Отказ по правам/параметрам повторять бессмысленно; сеть — повторим при возвращении связи.
    if (error instanceof AncialAPIError && error.status >= 400 && error.status < 500) {
      failed.delete(key);
      return;
    }
    failed.set(key, item);
  }
}

function schedulePush(item: PendingPush, delay: number) {
  const key = keyOf(item.kind, item.ref);
  const previous = pending.get(key);
  if (previous) clearTimeout(previous.timer);
  const timer = setTimeout(() => {
    pending.delete(key);
    void push(item);
  }, delay);
  pending.set(key, { item, timer });
}

/** Отправляет отложенные правки сразу (уход со страницы, скрытие вкладки). */
export function flushDrafts() {
  for (const [key, { item, timer }] of pending) {
    clearTimeout(timer);
    pending.delete(key);
    void push(item);
  }
}

function retryFailed() {
  for (const item of [...failed.values()]) void push(item);
}

async function refreshSubscribed() {
  for (const key of listeners.keys()) {
    const at = key.indexOf(':');
    const kind = key.slice(0, at) as DraftKind;
    const ref = key.slice(at + 1);
    try {
      notify(kind, ref, await loadDraft(kind, ref));
    } catch {
      // Сеть недоступна — останется то, что есть локально.
    }
  }
}

function readEvent(payload: unknown) {
  const envelope = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  return (envelope.data && typeof envelope.data === 'object' ? envelope.data : envelope) as Record<string, unknown>;
}

function ensureBridge() {
  if (bridgeReady || typeof window === 'undefined') return;
  bridgeReady = true;

  globalWS.addDialogListener('draft:update', (payload) => {
    const data = readEvent(payload);
    if (data.origin === getOrigin()) return;
    const kind = data.kind === 'dialog' || data.kind === 'post' ? data.kind : null;
    const ref = String(data.ref ?? '');
    const ts = Number(data.ts);
    if (!kind || !ref || !Number.isFinite(ts)) return;
    const local = readLocal(kind, ref);
    if (local && local.ts >= ts) return;
    const record: DraftRecord = { payload: typeof data.payload === 'string' ? data.payload : '', ts };
    writeLocal(kind, ref, record);
    notify(kind, ref, record.payload === '' ? null : record);
  });

  globalWS.addDialogListener('draft:clear', (payload) => {
    if (readEvent(payload).origin === getOrigin()) return;
    clearLocalDrafts();
    (['dialog', 'post'] as const).forEach((kind) => notifyKind(kind, '', null));
    for (const key of listeners.keys()) {
      const at = key.indexOf(':');
      notify(key.slice(0, at) as DraftKind, key.slice(at + 1), null);
    }
  });

  // После обрыва связи: догоняем отправку и подтягиваем то, что правили на других устройствах.
  globalWS.addDialogListener('auth_ok', () => {
    retryFailed();
    void refreshSubscribed();
  });
  window.addEventListener('online', retryFailed);
  window.addEventListener('pagehide', flushDrafts);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushDrafts();
  });
}

/** Локальный черновик (мгновенно, без сети). */
export function getLocalDraft(kind: DraftKind, ref: string): DraftRecord | null {
  const record = readLocal(kind, ref);
  return record && record.payload !== '' ? record : null;
}

/** Сохраняет правку: локально сразу, на сервер — с задержкой (пустой payload — удаление, сразу). */
export function saveDraft(kind: DraftKind, ref: string, payload: string): number {
  ensureBridge();
  const ts = nextDraftTs(Date.now(), readLocal(kind, ref)?.ts ?? 0);
  writeLocal(kind, ref, { payload, ts });
  notifyKind(kind, ref, payload === '' ? null : { payload, ts });
  schedulePush({ kind, ref, payload, ts }, payload === '' ? 0 : PUSH_DELAY_MS);
  return ts;
}

/** Черновик с учётом сервера: побеждает более поздняя правка; локальная, если новее, уходит на сервер. */
export async function loadDraft(kind: DraftKind, ref: string): Promise<DraftRecord | null> {
  ensureBridge();
  const local = readLocal(kind, ref);
  const { draft } = await AncialAPI.getDraft(kind, ref);
  const resolution = resolveDraft(local, draft ? { payload: draft.payload, ts: draft.ts } : null);
  if (resolution.pushLocal && local) schedulePush({ kind, ref, payload: local.payload, ts: local.ts }, 0);
  writeLocal(kind, ref, draft && (!local || draft.ts > local.ts) ? { payload: draft.payload, ts: draft.ts } : local);
  return resolution.draft;
}

/** Правки этого черновика с других устройств. Возвращает отписку. */
export function subscribeDraft(kind: DraftKind, ref: string, listener: DraftListener) {
  ensureBridge();
  const key = keyOf(kind, ref);
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)?.add(listener);
  return () => {
    const set = listeners.get(key);
    set?.delete(listener);
    if (set && set.size === 0) listeners.delete(key);
  };
}

/** Изменения любых черновиков вида: свои правки и чужие. Возвращает отписку. */
export function subscribeDraftKind(kind: DraftKind, listener: (ref: string, draft: DraftRecord | null) => void) {
  ensureBridge();
  if (!kindListeners.has(kind)) kindListeners.set(kind, new Set());
  kindListeners.get(kind)?.add(listener);
  return () => {
    kindListeners.get(kind)?.delete(listener);
  };
}

/** Превью черновиков чатов для списка диалогов: ref → текст. */
export async function listDialogDraftPreviews(): Promise<Record<string, string>> {
  const { drafts } = await AncialAPI.listDrafts('dialog');
  return Object.fromEntries((drafts ?? []).map((draft) => [draft.ref, draft.text]));
}

function clearLocalDrafts() {
  cache.clear({ category: 'drafts', keepPersistent: false });
  ENTRY_DRAFT_NAMESPACES.forEach((ns) => clearEntryNamespace(ns));
}

/** Очистка кэша в настройках: черновики стираются на этом устройстве и на сервере (иначе вернулись бы). */
export async function clearAllDrafts() {
  for (const { timer } of pending.values()) clearTimeout(timer);
  pending.clear();
  failed.clear();
  clearLocalDrafts();
  try {
    await AncialAPI.clearDrafts(getOrigin());
  } catch (error) {
    console.error('[drafts] clear on server failed', error);
  }
}
