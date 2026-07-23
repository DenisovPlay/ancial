import { AncialAPI } from './api-v2';
import { cache } from './cache.ts';

export type NetStatusState = 'hidden' | 'reconnecting';

type WsPayload = {
  type?: string;
  event?: string;
  user_id?: number | string;
  [key: string]: unknown;
};

type PresenceListener = (userId: number, payload: WsPayload) => void;
type DialogListener = (payload?: unknown) => void;
type NetStatusListener = () => void;
type PresenceStoreListener = () => void;

export interface GlobalWSClient {
  init: () => void;
  isConnected: () => boolean;
  isReady: () => boolean;
  send: (payload: Record<string, unknown>) => void;
  subscribeDialog: (dialogId: number | string) => void;
  unsubscribeDialog: (dialogId: number | string) => void;
  subscribePresence: (userIds: Array<number | string>) => void;
  addPresenceListener: (userId: number | string, listener: PresenceListener) => void;
  removePresenceListener: (userId: number | string, listener: PresenceListener) => void;
  addGlobalPresenceListener: (listener: PresenceListener) => void;
  removeGlobalPresenceListener: (listener: PresenceListener) => void;
  getPresencePayload: (userId: number | string) => WsPayload | null;
  subscribePresenceStore: (listener: PresenceStoreListener) => () => void;
  addDialogListener: (eventName: string, listener: DialogListener) => void;
  removeDialogListener: (eventName: string, listener: DialogListener) => void;
  clearDialogListeners: () => void;
  reconnect: () => void;
  getNetStatus: () => NetStatusState;
  subscribeNetStatus: (listener: NetStatusListener) => () => void;
}

declare global {
  interface Window {
    GlobalWS?: GlobalWSClient;
  }
}

const MIN_TOKEN_LENGTH = 5;
const HEARTBEAT_INTERVAL_MS = 120_000;
const PING_INTERVAL_MS = 15_000;
const WATCHDOG_INTERVAL_MS = 5_000;
const PONG_TIMEOUT_MS = 45_000;

let ws: WebSocket | null = null;
let token = '';
let isAuthed = false;
let authSent = false;
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let watchdogTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let lastPongAt = 0;
let hasConnectedOnce = false;
let netStatus: NetStatusState = 'hidden';
let suppressCloseHandling = false;

const presenceListeners = new Map<number, Set<PresenceListener>>();
const globalPresenceListeners = new Set<PresenceListener>();
const eventListeners = new Map<string, Set<DialogListener>>();
const pendingSubscriptions = new Set<number>();
const pendingPresence = new Set<number>();
const presencePayloads = new Map<number, WsPayload>();
const netStatusListeners = new Set<NetStatusListener>();
const presenceStoreListeners = new Set<PresenceStoreListener>();

function normalizeUserId(value: number | string) {
  const nextValue = Number.parseInt(String(value), 10);
  return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 0;
}

function getStoredToken() {
  return (cache.get<string>('token') || '').trim();
}

function hasBrowserWebSocket() {
  return typeof window !== 'undefined' && 'WebSocket' in window;
}

function resolveWebSocketUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (explicitUrl) return explicitUrl;

  const apiBase = process.env.NEXT_PUBLIC_API_BASE?.trim();
  let base = apiBase || 'https://api.ancial.ru';

  if (!base) return '';

  try {
    if (typeof window !== 'undefined') {
      if (base.startsWith('/')) {
        base = window.location.origin + base;
      } else if (!/^https?:\/\//i.test(base)) {
        base = window.location.protocol + '//' + base;
      }
    }

    const wsPath = base.endsWith('/') ? base + 'ws' : base + '/ws';
    const url = new URL(wsPath);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch (err) {
    console.error('[GlobalWS] Failed to construct WS URL', err);
    return '';
  }
}

function emitNetStatus() {
  netStatusListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('[GlobalWS] Net status listener failed', error);
    }
  });
}

function setNetStatus(nextStatus: NetStatusState) {
  if (netStatus === nextStatus) return;
  netStatus = nextStatus;
  emitNetStatus();
}

function emitPresenceStoreUpdate() {
  presenceStoreListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('[GlobalWS] Presence store listener failed', error);
    }
  });
}

function notifyEvent(eventName: string, payload?: unknown) {
  if (typeof window !== 'undefined') {
    if (eventName === 'message:new') {
      const data = (payload as any)?.data ?? payload;
      const currentUserId = Number(cache.get<any>('user_profile')?.id || 0);
      const senderId = Number(data?.sender_id || 0);
      const msgDialogId = Number(data?.dialog_id || (payload as any)?.dialog_id || 0);
      const activeDialogId = Number((window as any).__activeDialogId || 0);

      // Увеличиваем счетчик сообщений в навигации, только если:
      // 1. Сообщение отправлено кем-то другим
      // 2. Этот диалог в данный момент НЕ открыт у пользователя
      if ((!senderId || senderId !== currentUserId) && (!activeDialogId || activeDialogId !== msgDialogId)) {
        window.dispatchEvent(
          new CustomEvent('ancial:unread_update', {
            detail: { type: 'messages', delta: 1, payload }
          })
        );
      }
    } else if (eventName === 'notification:new') {
      window.dispatchEvent(
        new CustomEvent('ancial:unread_update', {
          detail: { type: 'notifications', delta: 1, payload }
        })
      );
    }
  }

  const listeners = eventListeners.get(eventName);
  if (!listeners?.size) return;

  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.error(`[GlobalWS] "${eventName}" listener failed`, error);
    }
  });
}

function getPresenceUserId(payload: WsPayload) {
  const data = payload.data && typeof payload.data === 'object' ? payload.data : null;
  const userId =
    payload.user_id ??
    (data && 'user_id' in data ? (data.user_id as number | string | undefined) : undefined) ??
    0;

  return normalizeUserId(userId);
}

function isPresenceEventName(eventName: string) {
  return (
    eventName === 'user:presence' ||
    eventName === 'presence' ||
    eventName === 'presence:update' ||
    eventName === 'presence:state'
  );
}

function stopReconnect() {
  if (!reconnectTimer) return;
  clearTimeout(reconnectTimer);
  reconnectTimer = null;
}

function stopHealth() {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }

  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
}

function doHeartbeat() {
  void AncialAPI.request('/info/Ping.php', {
    method: 'POST',
    keepalive: true,
  }).catch(() => {});
}

function stopHeartbeat() {
  if (!heartbeatTimer) return;
  clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

function startHeartbeat() {
  stopHeartbeat();
  doHeartbeat();
  heartbeatTimer = setInterval(doHeartbeat, HEARTBEAT_INTERVAL_MS);
}

function sendRaw(payload: Record<string, unknown>) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  try {
    ws.send(JSON.stringify(payload));
  } catch (error) {
    console.error('[GlobalWS] Failed to send payload', error);
  }
}

function startHealth() {
  stopHealth();
  lastPongAt = Date.now();

  pingTimer = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      sendRaw({ type: 'ping' });
    }
  }, PING_INTERVAL_MS);

  watchdogTimer = setInterval(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (Date.now() - lastPongAt <= PONG_TIMEOUT_MS) return;

    try {
      ws.close();
    } catch {
      // ignore close failures
    }
  }, WATCHDOG_INTERVAL_MS);
}

function scheduleReconnect() {
  if (reconnectTimer) return;

  reconnectAttempt += 1;
  const delay = Math.min(15_000, 500 + reconnectAttempt * 800);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

function closeSocket(options?: { suppressReconnect?: boolean }) {
  stopReconnect();
  stopHealth();
  stopHeartbeat();

  if (!ws) return;

  suppressCloseHandling = Boolean(options?.suppressReconnect);

  try {
    ws.close();
  } catch {
    suppressCloseHandling = false;
  }
}

function handlePresenceEvent(payload: WsPayload) {
  const userId = getPresenceUserId(payload);
  if (!userId) return;

  presencePayloads.set(userId, payload);
  emitPresenceStoreUpdate();

  presenceListeners.get(userId)?.forEach((listener) => {
    try {
      listener(userId, payload);
    } catch (error) {
      console.error('[GlobalWS] Presence listener failed', error);
    }
  });

  globalPresenceListeners.forEach((listener) => {
    try {
      listener(userId, payload);
    } catch (error) {
      console.error('[GlobalWS] Global presence listener failed', error);
    }
  });
}

function flushPendingSubscriptions() {
  pendingSubscriptions.forEach((dialogId) => {
    sendRaw({ type: 'subscribe', dialog_id: dialogId });
  });

  if (pendingPresence.size > 0) {
    sendRaw({
      type: 'presence:subscribe',
      user_ids: Array.from(pendingPresence),
    });
  }
}

function handleMessage(payload: WsPayload) {
  lastPongAt = Date.now();

  switch (payload.type) {
    case 'hello': {
      if (!authSent && !isAuthed && token.length >= MIN_TOKEN_LENGTH) {
        authSent = true;
        sendRaw({ type: 'auth', token });
      }
      return;
    }
    case 'pong':
      return;
    case 'auth_ok':
      isAuthed = true;
      if (hasConnectedOnce) {
        setNetStatus('hidden');
      } else {
        hasConnectedOnce = true;
      }
      flushPendingSubscriptions();
      startHeartbeat();
      notifyEvent('auth_ok');
      return;
    case 'auth_error':
      isAuthed = false;
      authSent = false;
      return;
    case 'error':
      isAuthed = false;
      authSent = false;
      try {
        ws?.close();
      } catch {
        // ignore close failures
      }
      return;
    case 'subscribed':
      notifyEvent('subscribed');
      return;
    case 'call:signal':
      notifyEvent('call:signal', { data: payload });
      return;
    case 'presence':
    case 'presence:update':
    case 'presence:state':
      handlePresenceEvent(payload);
      return;
    case 'event':
      if (isPresenceEventName(String(payload.event ?? ''))) {
        handlePresenceEvent(payload);
        return;
      }

      if (payload.event) {
        notifyEvent(payload.event, payload);
      }
      return;
    default:
      return;
  }
}

function connect() {
  if (!hasBrowserWebSocket()) {
    return;
  }

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  token = getStoredToken();
  if (token.length < MIN_TOKEN_LENGTH) {
    return;
  }

  const socketUrl = resolveWebSocketUrl();
  if (!socketUrl) {
    return;
  }

  isAuthed = false;
  authSent = false;

  try {
    ws = new WebSocket(socketUrl);
  } catch (error) {
    console.error('[GlobalWS] Failed to create socket', error);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    reconnectAttempt = 0;
    stopReconnect();
    startHealth();
  };

  ws.onmessage = (event) => {
    let payload: WsPayload | null = null;

    try {
      payload = JSON.parse(event.data) as WsPayload;
    } catch {
      return;
    }

    if (payload && typeof payload === 'object') {
      handleMessage(payload);
    }
  };

  ws.onerror = (err) => {
    console.error('[GlobalWS] Socket error event:', err);
  };

  ws.onclose = (event) => {
    ws = null;
    isAuthed = false;
    authSent = false;
    stopHealth();
    stopHeartbeat();

    const shouldSuppress = suppressCloseHandling;
    suppressCloseHandling = false;

    if (!shouldSuppress) {
      const hasToken = getStoredToken().length >= MIN_TOKEN_LENGTH;

      if (hasConnectedOnce && hasToken) {
        setNetStatus('reconnecting');
      }

      notifyEvent('ws:close');

      if (hasToken) {
        scheduleReconnect();
      }
    }
  };
}

export const globalWS: GlobalWSClient = {
  init() {
    const nextToken = getStoredToken();

    if (nextToken.length < MIN_TOKEN_LENGTH || !hasBrowserWebSocket()) {
      token = nextToken;
      closeSocket({ suppressReconnect: true });
      ws = null;
      isAuthed = false;
      authSent = false;
      setNetStatus('hidden');
      return;
    }

    if (token && token !== nextToken) {
      token = nextToken;
      pendingSubscriptions.clear();
      pendingPresence.clear();
      presencePayloads.clear();
      emitPresenceStoreUpdate();
      presenceListeners.clear();
      globalPresenceListeners.clear();
      isAuthed = false;
      authSent = false;
      setNetStatus('hidden');
      closeSocket({ suppressReconnect: true });
      ws = null;
      connect();
      return;
    }

    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    connect();
  },

  isConnected() {
    return Boolean(ws) && ws?.readyState === WebSocket.OPEN;
  },

  isReady() {
    return isAuthed;
  },

  send(payload) {
    sendRaw(payload);
  },

  subscribeDialog(dialogId) {
    const normalizedId = normalizeUserId(dialogId);
    if (!normalizedId) return;

    pendingSubscriptions.add(normalizedId);
    if (isAuthed) {
      sendRaw({ type: 'subscribe', dialog_id: normalizedId });
    }
  },

  unsubscribeDialog(dialogId) {
    const normalizedId = normalizeUserId(dialogId);
    if (!normalizedId) return;

    pendingSubscriptions.delete(normalizedId);
    if (isAuthed) {
      sendRaw({ type: 'unsubscribe', dialog_id: normalizedId });
    }
  },

  subscribePresence(userIds) {
    const normalizedIds = userIds
      .map((userId) => normalizeUserId(userId))
      .filter(Boolean);

    if (!normalizedIds.length) return;

    normalizedIds.forEach((userId) => {
      pendingPresence.add(userId);
    });

    if (isAuthed) {
      sendRaw({ type: 'presence:subscribe', user_ids: normalizedIds });
    }
  },

  addPresenceListener(userId, listener) {
    const normalizedId = normalizeUserId(userId);
    if (!normalizedId) return;

    if (!presenceListeners.has(normalizedId)) {
      presenceListeners.set(normalizedId, new Set());
    }

    presenceListeners.get(normalizedId)?.add(listener);

    const cachedPayload = presencePayloads.get(normalizedId);
    if (!cachedPayload) return;

    queueMicrotask(() => {
      try {
        listener(normalizedId, cachedPayload);
      } catch (error) {
        console.error('[GlobalWS] Presence listener replay failed', error);
      }
    });
  },

  removePresenceListener(userId, listener) {
    const normalizedId = normalizeUserId(userId);
    const listeners = presenceListeners.get(normalizedId);
    if (!listeners) return;

    listeners.delete(listener);
    if (listeners.size === 0) {
      presenceListeners.delete(normalizedId);
    }
  },

  addGlobalPresenceListener(listener) {
    globalPresenceListeners.add(listener);
  },

  removeGlobalPresenceListener(listener) {
    globalPresenceListeners.delete(listener);
  },

  getPresencePayload(userId) {
    const normalizedId = normalizeUserId(userId);
    if (!normalizedId) return null;
    return presencePayloads.get(normalizedId) ?? null;
  },

  subscribePresenceStore(listener) {
    presenceStoreListeners.add(listener);
    return () => {
      presenceStoreListeners.delete(listener);
    };
  },

  addDialogListener(eventName, listener) {
    if (!eventName) return;

    if (!eventListeners.has(eventName)) {
      eventListeners.set(eventName, new Set());
    }

    eventListeners.get(eventName)?.add(listener);
  },

  removeDialogListener(eventName, listener) {
    if (!eventName) return;
    const listeners = eventListeners.get(eventName);
    if (!listeners) return;

    listeners.delete(listener);
    if (listeners.size === 0) {
      eventListeners.delete(eventName);
    }
  },

  clearDialogListeners() {
    eventListeners.clear();
  },

  reconnect() {
    closeSocket();
  },

  getNetStatus() {
    return netStatus;
  },

  subscribeNetStatus(listener) {
    netStatusListeners.add(listener);
    return () => {
      netStatusListeners.delete(listener);
    };
  },
};
