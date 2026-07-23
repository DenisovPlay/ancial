/* eslint-disable @next/next/no-img-element */
'use client';

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';

import Modal from '../components/modal';
import { Dropdown, DropdownItem } from '../components/navigation';
import YandexRtb from '../components/yandex-rtb';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { usePulsePlayer } from '../context/PulsePlayerContext';
import ImageViewerModal from '../components/image-viewer-modal';
import { AncialAPI } from '../lib/api-v2';
import { cache } from '../lib/cache.ts';
import { globalWS } from '../lib/global-ws';
import CreateGroupModal from './components/create-group-modal';
import GroupInfoModal from './components/group-info-modal';
import MessageBubble from './components/message-bubble';
import StickerPickerDropdownContent from './components/sticker-picker-dropdown-content';
import {
  applyCachedDialogs,
  buildDialogImageSlides,
  buildTimelineItems,
  cn,
  decodeText,
  escapeHtml,
  type DialogByHashResponse,
  type DialogListItem,
  type DialogListResponse,
  type DialogMessage,
  type DialogMessagesResponse,
  type DialogMeta,
  type DialogUser,
  DIALOGS_CACHE_KEY,
  DIALOGS_REFRESH_INTERVAL_MS,
  FALLBACK_AVATAR,
  FALLBACK_WELCOME_IMAGE,
  getDialogPreviewStatusIconName,
  getDialogTitle,
  getDialogsCache,
  getEarliestMessageId,
  getEditableMessageText,
  getLatestMessageId,
  getMessageCacheKey,
  getMessageId,
  getPayloadMessageId,
  getPayloadMessageText,
  formatDialogPreview,
  hasMeaningfulValue,
  Icon,
  IMGBB_API_KEY,
  isOnline,
  mapDialogListItemToUser,
  mergeDialogUser,
  mergeMessages,
  MESSAGE_PAGE_SIZE,
  normalizeAssetUrl,
  normalizeHash,
  normalizeText,
  NOTHING_FOUND_IMAGE,
  parseReactions,
  readMessageCache,
  readMessageCacheByHash,
  resolvePresenceLastOnline,
  seedSevenTvStickerCache,
  type ScrollAction,
  type SevenTvSticker,
  shouldStickToBottom,
  sortMessages,
  toNumber,
  writeDialogsCache,
  writeMessageCache,
  type WsPayload,
} from './lib/messages-shared';

export default function MessagesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading: authLoading, lang, user } = useAuth();
  const { showNote } = useNotification();
  const { currentSongId, currentTrackObj, isPlaying, togglePlay } = usePulsePlayer();
  const isPulsePlayerActive = Boolean(currentSongId || currentTrackObj);

  // Next.js useParams in a layout might not see child segment params.
  // So we extract it from the pathname directly.
  const pathParts = pathname.split('/').filter(Boolean);
  const hashFromPath = pathParts[1] || '';
  const paramsHash = normalizeHash(hashFromPath);

  const [routeHash, setRouteHash] = useState(paramsHash);

  useEffect(() => {
    setRouteHash(paramsHash);
  }, [paramsHash]);
  const currentUserId = toNumber(user?.id);
  const authUserImage = normalizeAssetUrl(user?.img, FALLBACK_AVATAR);

  const [dialogs, setDialogs] = useState<DialogListItem[]>([]);
  const [dialogsLoading, setDialogsLoading] = useState(true);
  const [dialogsError, setDialogsError] = useState('');
  const [selectedDialog, setSelectedDialog] = useState<DialogMeta | null>(null);
  const [foreignUser, setForeignUser] = useState<DialogUser | null>(null);
  const [dialogPresenceOnline, setDialogPresenceOnline] = useState<boolean | null>(null);
  const [blockedDialog, setBlockedDialog] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [messages, setMessages] = useState<DialogMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadingNewer, setLoadingNewer] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [composerText, setComposerText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [groupInfoModalOpen, setGroupInfoModalOpen] = useState(false);
  const [deleteDialogModalOpen, setDeleteDialogModalOpen] = useState(false);
  const [editMessageModalOpen, setEditMessageModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<DialogMessage | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [uploadingMessageImage, setUploadingMessageImage] = useState(false);
  const [uploadingDialogBackground, setUploadingDialogBackground] = useState(false);
  const [activeDialogImageKey, setActiveDialogImageKey] = useState<string | null>(null);
  const [dayLabelTick, setDayLabelTick] = useState(Date.now());
  const [stickerDropdownOpen, setStickerDropdownOpen] = useState(false);

  const [hasActiveCall, setHasActiveCall] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [replyingTo, setReplyingTo] = useState<DialogMessage | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [composerHeight, setComposerHeight] = useState(60);
  const activeCallTimeoutRef = useRef<number | null>(null);

  const dialogsInFlightRef = useRef(false);
  const dialogsLastFetchAtRef = useRef(0);
  const dialogSessionRef = useRef(0);
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const composerPaneRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const wsRefreshTimerRef = useRef<number | null>(null);
  const scrollActionRef = useRef<ScrollAction | null>(null);
  const currentDialogMetaRef = useRef<DialogMeta | null>(null);
  const currentDialogIdRef = useRef(0);
  const currentDialogHashRef = useRef('');
  const currentForeignUserRef = useRef<DialogUser | null>(null);
  const currentForeignUserIdRef = useRef(0);
  const currentMessageCacheKeyRef = useRef('');

  const timelineItems = useMemo(() => buildTimelineItems(messages, lang), [messages, lang]);
  const dialogImageSlides = useMemo(() => buildDialogImageSlides(messages), [messages]);
  const activeDialogImageIndex = useMemo(() => {
    return activeDialogImageKey
      ? dialogImageSlides.findIndex((image) => image.key === activeDialogImageKey)
      : -1;
  }, [activeDialogImageKey, dialogImageSlides]);
  const resolvedActiveDialogImageIndex = activeDialogImageIndex >= 0 ? activeDialogImageIndex : null;
  void dayLabelTick;

  const dialogListItem = dialogs.find((dialog) => normalizeHash(dialog.hash) === routeHash) ?? null;
  const fallbackForeignUser = mapDialogListItemToUser(dialogListItem);
  const effectiveForeignUser = mergeDialogUser(fallbackForeignUser, foreignUser);
  const isGroupDialog = selectedDialog?.type === 'group' || dialogListItem?.type === 'group';
  const groupMembersCount = selectedDialog?.members?.length || (selectedDialog as any)?.members_count || (dialogListItem as any)?.members_count || 0;

  const dialogTitle = isGroupDialog
    ? (selectedDialog?.title || dialogListItem?.title || (lang?.group_chat || 'Групповой чат'))
    : getDialogTitle(effectiveForeignUser);

  const dialogAvatarUrl = isGroupDialog
    ? normalizeAssetUrl(selectedDialog?.avatar || (dialogListItem as any)?.avatar, FALLBACK_AVATAR)
    : normalizeAssetUrl(effectiveForeignUser?.img, FALLBACK_AVATAR);

  const dialogBackgroundUrl = normalizeAssetUrl(selectedDialog?.img, '');
  const selectedDialogId = toNumber(selectedDialog?.id);
  const wsPresencePayload = useSyncExternalStore<WsPayload | null>(
    globalWS.subscribePresenceStore,
    () => {
      const foreignUserId = toNumber(effectiveForeignUser?.id);
      return foreignUserId > 0 ? globalWS.getPresencePayload(foreignUserId) : null;
    },
    () => null,
  );
  const wsPresenceLastOnline: number | null = wsPresencePayload
    ? resolvePresenceLastOnline(wsPresencePayload)
    : null;
  const dialogOnline =
    wsPresenceLastOnline === null
      ? dialogPresenceOnline === null
        ? isOnline(effectiveForeignUser?.lastonlinetime)
        : dialogPresenceOnline
      : wsPresenceLastOnline > 0 && isOnline(wsPresenceLastOnline);

  const getGroupMembersCountText = (count: number) => {
    if (count === 1) return `${count} ${lang?.group_members_1 || 'участник'}`;
    if (count > 1 && count < 5) return `${count} ${lang?.group_members_2_4 || 'участника'}`;
    return `${count} ${lang?.group_members_5 || 'участников'}`;
  };

  const dialogStatusLabel = isGroupDialog
    ? (groupMembersCount > 0 ? getGroupMembersCountText(groupMembersCount) : (lang?.group_chat || 'Групповой чат'))
    : blockedDialog
      ? (lang?.unknown || 'неизвестно')
      : dialogLoading || messagesLoading || loadingNewer
        ? lang?.['updating...'] || 'Обновление...'
        : dialogOnline
          ? lang?.online || 'В сети'
          : lang?.offline || 'Не в сети';

  useEffect(() => {
    if (!activeDialogImageKey) return;

    const hasActiveImage = dialogImageSlides.some((image) => image.key === activeDialogImageKey);
    if (!hasActiveImage) {
      setActiveDialogImageKey(null);
    }
  }, [activeDialogImageKey, dialogImageSlides]);

  useEffect(() => {
    if (messageInputRef.current) {
      messageInputRef.current.style.height = '40px';
      if (composerText) {
        const newHeight = Math.max(40, Math.min(messageInputRef.current.scrollHeight, 130));
        messageInputRef.current.style.height = `${newHeight}px`;
      }
    }
  }, [composerText]);

  useEffect(() => {
    if (!composerPaneRef.current) return;
    const updateHeight = () => {
      if (composerPaneRef.current) {
        setComposerHeight(composerPaneRef.current.offsetHeight);
      }
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(composerPaneRef.current);
    return () => observer.disconnect();
  }, [selectedDialog]);

  useEffect(() => {
    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0,
        0,
      );

      const delay = Math.max(250, nextMidnight.getTime() - now.getTime() + 400);

      const timer = window.setTimeout(() => {
        setDayLabelTick(Date.now());
        scheduleMidnightRefresh();
      }, delay);

      return timer;
    };

    const timer = scheduleMidnightRefresh();
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    currentDialogMetaRef.current = selectedDialog;
    currentDialogIdRef.current = toNumber(selectedDialog?.id);
    currentDialogHashRef.current = normalizeHash(selectedDialog?.hash);
    currentForeignUserRef.current = foreignUser;
    currentForeignUserIdRef.current = toNumber(foreignUser?.id);
    currentMessageCacheKeyRef.current = currentDialogIdRef.current
      ? getMessageCacheKey(currentUserId, currentDialogIdRef.current)
      : '';
  }, [currentUserId, foreignUser, selectedDialog]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push(`/login?backurl=${encodeURIComponent(pathname)}`);
    }
  }, [authLoading, isAuthenticated, pathname, router]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    document.documentElement.classList.toggle('messages-dialog-open', Boolean(routeHash));
    document.body.classList.toggle('messages-dialog-open-body', Boolean(routeHash));
    return () => {
      document.documentElement.classList.remove('messages-dialog-open');
      document.body.classList.remove('messages-dialog-open-body');
    };
  }, [routeHash]);

  const notify = ({
    content,
    time = 3,
    type = 'info',
  }: {
    content: React.ReactNode;
    time?: number;
    type?: 'error' | 'info' | 'success';
  }) => {
    showNote({
      content,
      time,
      type,
    });
  };

  const teardownWs = () => {
    const dialogId = currentDialogIdRef.current;
    const foreignUserId = currentForeignUserIdRef.current;

    if (dialogId > 0) {
      globalWS.unsubscribeDialog(dialogId);
    }

    if (foreignUserId > 0) {
      globalWS.removePresenceListener(foreignUserId, handlePresenceUpdate);
    }
    globalWS.removeGlobalPresenceListener(handlePresenceUpdate);

    globalWS.removeDialogListener('message:new', handleWsMessageNew);
    globalWS.removeDialogListener('message:deleted', handleWsMessageDeleted);
    globalWS.removeDialogListener('message:edited', handleWsMessageEdited);
    globalWS.removeDialogListener('message:reaction', handleWsMessageReaction);
    globalWS.removeDialogListener('call:signal', handleWsCallSignal);

    if (wsRefreshTimerRef.current !== null) {
      window.clearTimeout(wsRefreshTimerRef.current);
      wsRefreshTimerRef.current = null;
    }
  };

  const resetDialogState = () => {
    teardownWs();
    setSelectedDialog(null);
    currentDialogMetaRef.current = null;
    setForeignUser(null);
    currentForeignUserRef.current = null;
    setDialogPresenceOnline(null);
    setBlockedDialog(false);
    setDialogLoading(false);
    setDialogError('');
    setMessages([]);
    setMessagesLoading(false);
    setLoadingOlder(false);
    setLoadingNewer(false);
    setHasMoreMessages(true);
    setComposerText('');
    setSettingsModalOpen(false);
    setDeleteDialogModalOpen(false);
    setEditMessageModalOpen(false);
    setEditingMessage(null);
    setEditingValue('');
    setActiveDialogImageKey(null);
    setActiveDialogImageKey(null);
    scrollActionRef.current = null;
    setHasActiveCall(false);
    if (activeCallTimeoutRef.current !== null) {
      window.clearTimeout(activeCallTimeoutRef.current);
      activeCallTimeoutRef.current = null;
    }
  };

  const loadDialogs = async ({ force = false }: { force?: boolean } = {}) => {
    if (!isAuthenticated) return;

    const dialogCache = getDialogsCache();
    if (!force && dialogCache) {
      setDialogs(applyCachedDialogs(dialogCache.dialogs));
      setDialogsLoading(false);
    }

    if (dialogsInFlightRef.current) return;
    if (!force && dialogsLastFetchAtRef.current && Date.now() - dialogsLastFetchAtRef.current < 5000) {
      return;
    }

    dialogsInFlightRef.current = true;
    dialogsLastFetchAtRef.current = Date.now();

    try {
      const result = await AncialAPI.getDialogList<DialogListResponse>();
      const nextDialogs = Array.isArray(result) ? result : Array.isArray((result as any).dialogs) ? (result as any).dialogs : [];
      setDialogs(nextDialogs);
      setDialogsError('');
      setDialogsLoading(false);
      writeDialogsCache(nextDialogs);
    } catch (error) {
      console.error('Failed to load dialogs', error);

      if (!dialogs.length) {
        setDialogsError(error instanceof Error ? error.message : (lang?.connection_lost || 'Связь потеряна'));
        setDialogsLoading(false);
      }
    } finally {
      dialogsInFlightRef.current = false;
    }
  };

  // Перезагружает только метаданные текущего диалога (title, avatar, members)
  // без перезагрузки сообщений. Используется после GroupInfoModal-действий.
  const reloadCurrentDialogMeta = async () => {
    const hash = currentDialogHashRef.current;
    if (!hash) return;
    try {
      const result = await AncialAPI.getDialogByHash<any>(hash);
      const raw = result as any;
      const payload = raw.data ?? raw;
      const dialogMetaRaw = payload.dialog ?? null;
      if (!dialogMetaRaw?.id) return;
      const serverImg = (dialogMetaRaw as any).img || (dialogMetaRaw as any).bg || '';
      const dialogMeta = {
        ...dialogMetaRaw,
        img: normalizeAssetUrl(serverImg, ''),
      };
      setSelectedDialog(dialogMeta);
      currentDialogMetaRef.current = dialogMeta;
    } catch {
      // Тихая ошибка — не ломаем UX
    }
  };

  const persistMessages = ({
    foreignUserValue,
    dialogMetaValue,
    keepSide,
    nextMessages,
  }: {
    foreignUserValue?: DialogUser | null;
    dialogMetaValue?: DialogMeta | null;
    keepSide: 'newest' | 'oldest';
    nextMessages: DialogMessage[];
  }) => {
    const dialogId = currentDialogIdRef.current;
    const dialogHash = currentDialogHashRef.current;
    const cacheKey = currentMessageCacheKeyRef.current;
    if (!dialogId || !dialogHash || !cacheKey) return;

    writeMessageCache({
      cacheKey,
      dialogHash,
      dialogId,
      foreignUser: foreignUserValue ?? currentForeignUserRef.current ?? foreignUser,
      dialogMeta: dialogMetaValue ?? currentDialogMetaRef.current ?? selectedDialog,
      keepSide,
      messages: nextMessages,
      userId: currentUserId,
    });
  };

  const loadMessagesInitial = async (session: number, preserveScroll = false) => {
    const dialogId = currentDialogIdRef.current;
    const dialogHash = currentDialogHashRef.current;
    const cacheKey = currentMessageCacheKeyRef.current;

    if (!dialogId || !dialogHash || !cacheKey) return;

    setMessagesLoading(true);

    const cached = readMessageCache(cacheKey);
    const cachedMessages = cached?.messages ? sortMessages(cached.messages) : [];
    const lastCachedId = getLatestMessageId(cachedMessages);

    if (cachedMessages.length) {
      if (!preserveScroll) scrollActionRef.current = { type: 'bottom' };
      setMessages(cachedMessages);
      if (cached?.foreignUser) {
        setForeignUser((currentForeignUser) => {
          const nextForeignUser = mergeDialogUser(currentForeignUser, cached.foreignUser);
          currentForeignUserRef.current = nextForeignUser;
          return nextForeignUser;
        });
      }
    } else {
      if (!preserveScroll) scrollActionRef.current = { type: 'bottom' };
      setMessages([]);
    }

    try {
      const result = await AncialAPI.getDialog<DialogMessagesResponse>(dialogId, undefined, MESSAGE_PAGE_SIZE);

      if (session !== dialogSessionRef.current) return;

      const nextMessages = Array.isArray(result) ? result : Array.isArray((result as any).messages) ? (result as any).messages : [];
      const newForeignUser = (result as any).foreignUser;

      const freshMessages = sortMessages(nextMessages);
      const mergedMessages = mergeMessages(cachedMessages, freshMessages);
      const nextForeignUser = mergeDialogUser(currentForeignUserRef.current, newForeignUser);

      if (nextForeignUser) {
        currentForeignUserRef.current = nextForeignUser;
        setForeignUser(nextForeignUser);
      }

      setMessages(mergedMessages);
      setHasMoreMessages(getEarliestMessageId(mergedMessages) > 1);
      persistMessages({
        foreignUserValue: nextForeignUser,
        keepSide: 'newest',
        nextMessages: mergedMessages,
      });

      if (!preserveScroll) {
        scrollActionRef.current = { type: 'bottom' };
      }

      if (lastCachedId > getLatestMessageId(freshMessages)) {
        void loadMessagesNewer(session);
      }
    } catch (error) {
      console.error('Failed to load messages', error);

      if (!cachedMessages.length) {
        setDialogError(error instanceof Error ? error.message : (lang?.failed_to_load_dialog || 'Не удалось загрузить диалог'));
      }
    } finally {
      if (session === dialogSessionRef.current) {
        setMessagesLoading(false);
      }
    }
  };

  const loadMessagesNewer = async (session = dialogSessionRef.current) => {
    const dialogId = currentDialogIdRef.current;
    const cacheKey = currentMessageCacheKeyRef.current;

    if (!dialogId || !cacheKey || loadingNewer) return;

    setLoadingNewer(true);

    const cached = readMessageCache(cacheKey);
    const currentMessages = cached?.messages ? sortMessages(cached.messages) : sortMessages(messages);
    const latestId = getLatestMessageId(currentMessages);
    const stickToBottom = shouldStickToBottom(messageScrollRef.current);

    try {
      const result = await AncialAPI.getDialog<DialogMessagesResponse>(
        dialogId,
        undefined,
        latestId ? 200 : MESSAGE_PAGE_SIZE,
        latestId
      );

      if (session !== dialogSessionRef.current) return;

      const nextMessages = Array.isArray(result) ? result : Array.isArray((result as any).messages) ? (result as any).messages : [];
      const newForeignUser = (result as any).foreignUser;

      const newerMessages = sortMessages(nextMessages);
      if (!newerMessages.length) return;

      const mergedMessages = mergeMessages(currentMessages, newerMessages);
      const nextForeignUser = mergeDialogUser(currentForeignUserRef.current, newForeignUser);
      setMessages(mergedMessages);

      if (nextForeignUser) {
        currentForeignUserRef.current = nextForeignUser;
        setForeignUser(nextForeignUser);
      }

      persistMessages({
        foreignUserValue: nextForeignUser,
        keepSide: 'newest',
        nextMessages: mergedMessages,
      });

      if (stickToBottom) {
        scrollActionRef.current = { type: 'bottom' };
      } else {
        setUnreadCount((prev) => prev + newerMessages.length);
      }
    } catch (error) {
      console.error('Failed to load newer messages', error);
    } finally {
      if (session === dialogSessionRef.current) {
        setLoadingNewer(false);
      }
    }
  };

  const loadMessagesOlder = async (session = dialogSessionRef.current) => {
    const dialogId = currentDialogIdRef.current;
    const cacheKey = currentMessageCacheKeyRef.current;

    if (!dialogId || !cacheKey || loadingOlder || !hasMoreMessages) return;

    const cached = readMessageCache(cacheKey);
    const currentMessages = cached?.messages ? sortMessages(cached.messages) : sortMessages(messages);
    const earliestId = getEarliestMessageId(currentMessages);

    if (!earliestId || earliestId <= 1) {
      setHasMoreMessages(false);
      return;
    }

    const scrollContainer = messageScrollRef.current;
    scrollActionRef.current = {
      prevHeight: scrollContainer?.scrollHeight ?? 0,
      prevTop: scrollContainer?.scrollTop ?? 0,
      type: 'preserve',
    };

    setLoadingOlder(true);

    try {
      const result = await AncialAPI.getDialog<DialogMessagesResponse>(
        dialogId,
        undefined,
        MESSAGE_PAGE_SIZE,
        undefined,
        earliestId
      );

      if (session !== dialogSessionRef.current) return;

      const nextMessages = Array.isArray(result) ? result : Array.isArray((result as any).messages) ? (result as any).messages : [];
      const newForeignUser = (result as any).foreignUser;

      const olderMessages = sortMessages(nextMessages);
      if (!olderMessages.length) {
        setHasMoreMessages(false);
        scrollActionRef.current = null;
        return;
      }

      const mergedMessages = mergeMessages(currentMessages, olderMessages);
      const nextForeignUser = mergeDialogUser(currentForeignUserRef.current, newForeignUser);
      setMessages(mergedMessages);
      currentForeignUserRef.current = nextForeignUser;
      setForeignUser(nextForeignUser);
      persistMessages({
        foreignUserValue: nextForeignUser,
        keepSide: 'oldest',
        nextMessages: mergedMessages,
      });
      setHasMoreMessages(getEarliestMessageId(mergedMessages) > 1);
    } catch (error) {
      console.error('Failed to load older messages', error);
      scrollActionRef.current = null;
    } finally {
      if (session === dialogSessionRef.current) {
        setLoadingOlder(false);
      }
    }
  };

  const seekToMessage = async (replyToId: string | number) => {
    const targetId = `msg-${replyToId}`;
    let el = document.getElementById(targetId);

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-purple-500/30', 'transition-colors', 'duration-500');
      setTimeout(() => el.classList.remove('bg-purple-500/30'), 1500);
      return;
    }

    if (!currentDialogIdRef.current || loadingOlder) return;

    setLoadingOlder(true);
    let found = false;
    let currentEarliestId = getEarliestMessageId(messages);
    let currentMessages = messages;
    let newForeignUser: DialogUser | null = null;

    // Пытаемся подгрузить до 3 раз по 200 сообщений
    for (let i = 0; i < 3; i++) {
      if (!currentEarliestId || currentEarliestId <= 1) break;

      const result = await AncialAPI.getDialog<DialogMessagesResponse>(
        currentDialogIdRef.current,
        undefined,
        200,
        undefined,
        currentEarliestId
      );

      const nextMessages = Array.isArray(result) ? result : Array.isArray((result as any).messages) ? (result as any).messages : [];
      if (result && !Array.isArray(result) && (result as any).foreignUser) {
        newForeignUser = (result as any).foreignUser as DialogUser;
      }

      if (!nextMessages.length) break;

      const olderMessages = sortMessages(nextMessages);
      currentMessages = mergeMessages(currentMessages, olderMessages);
      currentEarliestId = getEarliestMessageId(currentMessages);

      if (currentMessages.some(m => getMessageId(m) == replyToId)) {
        found = true;
        break;
      }
    }

    if (currentMessages.length > messages.length) {
      const scrollContainer = messageScrollRef.current;
      scrollActionRef.current = {
        prevHeight: scrollContainer?.scrollHeight ?? 0,
        prevTop: scrollContainer?.scrollTop ?? 0,
        type: 'preserve',
      };

      if (newForeignUser) {
        const nextForeignUser = mergeDialogUser(currentForeignUserRef.current, newForeignUser);
        currentForeignUserRef.current = nextForeignUser;
        setForeignUser(nextForeignUser);
      }

      setMessages(currentMessages);

      const cacheKey = currentMessageCacheKeyRef.current;
      if (cacheKey) {
        writeMessageCache({
          cacheKey,
          dialogHash: currentDialogHashRef.current || '',
          dialogId: currentDialogIdRef.current,
          foreignUser: currentForeignUserRef.current,
          dialogMeta: currentDialogMetaRef.current,
          keepSide: 'oldest',
          messages: currentMessages,
        });
      }
      setHasMoreMessages(currentEarliestId > 1);
    }

    setLoadingOlder(false);

    if (found) {
      setTimeout(() => {
        const newEl = document.getElementById(targetId);
        if (newEl) {
          newEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          newEl.classList.add('bg-purple-500/30', 'transition-colors', 'duration-500');
          setTimeout(() => newEl.classList.remove('bg-purple-500/30'), 1500);
        }
      }, 100);
    }
  };

  const loadDialogByHash = async (hash: string, session: number) => {
    if (session !== dialogSessionRef.current) return;

    const normalizedHash = normalizeHash(hash);
    setDialogError('');
    setHasMoreMessages(true);
    setLoadingOlder(false);
    setLoadingNewer(false);

    const dialogFromList = dialogs.find((d) => normalizeHash(d.hash) === normalizedHash);
    let cached = readMessageCacheByHash(currentUserId, normalizedHash);
    if (!cached && dialogFromList?.id) {
      cached = readMessageCache(getMessageCacheKey(currentUserId, toNumber(dialogFromList.id)));
    }

    const rawImg = (cached?.dialogMeta as any)?.img || (cached?.dialogMeta as any)?.bg || (dialogFromList as any)?.bg || (dialogFromList as any)?.img || '';
    const cachedDialogMeta: DialogMeta | null = (cached?.dialogMeta || dialogFromList) ? ({
      id: cached?.dialogMeta?.id || dialogFromList?.id,
      hash: cached?.dialogMeta?.hash || dialogFromList?.hash || normalizedHash,
      img: normalizeAssetUrl(rawImg, ''),
      blocked: Boolean((cached?.dialogMeta as any)?.blocked ?? (dialogFromList as any)?.blocked),
    } as any) : null;

    const cachedForeignUser: DialogUser | null = cached?.foreignUser || mapDialogListItemToUser(dialogFromList);

    if (session !== dialogSessionRef.current) return;

    if (cachedDialogMeta && cachedForeignUser) {
      setSelectedDialog(cachedDialogMeta);
      currentDialogMetaRef.current = cachedDialogMeta;
      setForeignUser(cachedForeignUser);
      currentForeignUserRef.current = cachedForeignUser;
      currentDialogIdRef.current = toNumber(cachedDialogMeta.id);
      currentDialogHashRef.current = normalizedHash;
      currentForeignUserIdRef.current = toNumber(cachedForeignUser?.id);
      currentMessageCacheKeyRef.current = getMessageCacheKey(currentUserId, currentDialogIdRef.current);
      setBlockedDialog(Boolean((cachedDialogMeta as any).blocked));

      const cachedMsgs = cached?.messages ? sortMessages(cached.messages) : [];
      if (cachedMsgs.length) {
        setMessages(cachedMsgs);
        scrollActionRef.current = { type: 'bottom' };
      }
      setDialogLoading(false);
    } else {
      setDialogLoading(true);
      setBlockedDialog(false);
      setSelectedDialog(null);
      currentDialogMetaRef.current = null;
      setForeignUser(null);
      setDialogPresenceOnline(null);
      setMessages([]);
    }

    try {
      const result = await AncialAPI.getDialogByHash<DialogByHashResponse>(hash);

      if (session !== dialogSessionRef.current) return;

      const raw = result as any;
      const payload = raw.data ?? raw;
      const dialogMetaRaw = payload.dialog ?? null;

      if (!dialogMetaRaw?.id) {
        throw new Error(payload.error ?? (lang?.dialog_not_found || 'Диалог не найден'));
      }

      const serverImg = (dialogMetaRaw as any).img || (dialogMetaRaw as any).bg || (cachedDialogMeta as any)?.img || '';
      const dialogMeta: DialogMeta = {
        ...dialogMetaRaw,
        img: normalizeAssetUrl(serverImg, ''),
      };

      const nextForeignUser = mergeDialogUser(currentForeignUserRef.current, payload.foreignUser);

      setSelectedDialog(dialogMeta);
      currentDialogMetaRef.current = dialogMeta;
      setForeignUser(nextForeignUser);
      currentForeignUserRef.current = nextForeignUser;

      setBlockedDialog(Boolean(dialogMeta?.blocked ?? false));

      currentDialogIdRef.current = toNumber(dialogMeta.id);
      currentDialogHashRef.current = normalizeHash(dialogMeta.hash ?? hash);
      currentForeignUserIdRef.current = toNumber(nextForeignUser?.id);
      currentMessageCacheKeyRef.current = currentDialogIdRef.current
        ? getMessageCacheKey(currentUserId, currentDialogIdRef.current)
        : '';

      await loadMessagesInitial(session);
    } catch (error) {
      console.error('Failed to load dialog by hash', error);

      if (session !== dialogSessionRef.current) return;

      setDialogError(error instanceof Error ? error.message : (lang?.failed_to_open_dialog || 'Не удалось открыть диалог'));
      router.replace('/messages');
    } finally {
      if (session === dialogSessionRef.current) {
        setDialogLoading(false);
      }
    }
  };


  const handlePresenceUpdate = (userId: number, payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const currentForeignUserId = currentForeignUserIdRef.current;
    if (currentForeignUserId > 0 && userId !== currentForeignUserId) return;

    const nextLastOnline = resolvePresenceLastOnline(payload as WsPayload);
    if (nextLastOnline === null) return;
    const nextPresenceOnline = nextLastOnline > 0 && isOnline(nextLastOnline);

    if (currentForeignUserId === 0) {
      currentForeignUserIdRef.current = userId;
      globalWS.subscribePresence([userId]);
    }

    setDialogPresenceOnline(nextPresenceOnline);

    setForeignUser((currentForeignUser) => {
      if (!currentForeignUser) {
        return currentForeignUser;
      }

      const knownUserId = toNumber(currentForeignUser.id);
      if (knownUserId > 0 && knownUserId !== userId) return currentForeignUser;

      return {
        ...currentForeignUser,
        id: knownUserId || userId,
        lastonlinetime: nextLastOnline,
      };
    });

    setDialogs((currentDialogs) => {
      const currentDialogHash = currentDialogHashRef.current;
      if (!currentDialogHash) {
        return currentDialogs;
      }

      return currentDialogs.map((dialog) =>
        normalizeHash(dialog.hash) === currentDialogHash
          ? {
            ...dialog,
            Ulastonline: nextLastOnline,
          }
          : dialog,
      );
    });
  };

  const handleWsMessageDeleted = (payload?: unknown) => {
    const messageId = getPayloadMessageId(payload);
    if (!messageId) return;

    setMessages((currentMessages) => {
      const nextMessages = currentMessages.filter((message) => getMessageId(message) !== messageId);
      persistMessages({
        keepSide: 'newest',
        nextMessages,
      });
      return nextMessages;
    });

    void loadDialogs({ force: true });
  };

  const handleWsMessageEdited = (payload?: unknown) => {
    const messageId = getPayloadMessageId(payload);
    const newText = getPayloadMessageText(payload);
    if (!messageId || !newText) return;

    setMessages((currentMessages) => {
      const nextMessages = currentMessages.map((message) =>
        getMessageId(message) === messageId
          ? {
            ...message,
            message: escapeHtml(newText),
          }
          : message,
      );

      persistMessages({
        keepSide: 'newest',
        nextMessages,
      });

      return nextMessages;
    });

    void loadDialogs({ force: true });
  };

  const scheduleWsRefresh = () => {
    if (wsRefreshTimerRef.current !== null) return;

    wsRefreshTimerRef.current = window.setTimeout(() => {
      wsRefreshTimerRef.current = null;
      void loadMessagesNewer(dialogSessionRef.current);
      void loadDialogs({ force: true });
    }, 150);
  };

  const handleWsMessageNew = () => {
    scheduleWsRefresh();
  };

  const handleWsMessageReaction = (payload?: unknown) => {
    const wsPayload = payload as WsPayload | undefined;
    if (wsPayload?.data?.message_id && wsPayload.data.reaction && wsPayload.data.action) {
      const msgId = toNumber(wsPayload.data.message_id as string | number);
      const dataObj = wsPayload.data as Record<string, unknown>;
      const reactedByStr = String(dataObj.reacted_by ?? dataObj.user_id ?? 0);
      const reaction = String(wsPayload.data.reaction);
      const action = String(wsPayload.data.action);

      setMessages((currentMessages) =>
        currentMessages.map((msg) => {
          if (getMessageId(msg) !== msgId) return msg;
          const currentReactions = parseReactions(msg.reactions);
          let nextReactions = [...currentReactions];
          if (action === 'add') {
            const existingIndex = nextReactions.findIndex((r) => r.userId === reactedByStr);
            if (existingIndex !== -1) {
              nextReactions.splice(existingIndex, 1);
            }
            nextReactions.push({ userId: reactedByStr, emoji: reaction });
          } else {
            nextReactions = nextReactions.filter(
              (r) => !(r.userId === reactedByStr && r.emoji === reaction),
            );
          }
          return {
            ...msg,
            reactions: nextReactions.map((r) => `${r.userId}:${r.emoji}`).join('|'),
          };
        }),
      );
      return;
    }

    void loadMessagesInitial(dialogSessionRef.current, true);
    void loadDialogs({ force: true });
  };

  const handleWsCallSignal = () => {
    setHasActiveCall(true);
    if (activeCallTimeoutRef.current !== null) {
      window.clearTimeout(activeCallTimeoutRef.current);
    }
    // Keep the "active call" indication alive for 10 seconds after the last signal
    activeCallTimeoutRef.current = window.setTimeout(() => {
      setHasActiveCall(false);
      activeCallTimeoutRef.current = null;
    }, 10000);
  };

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    void loadDialogs();

    const timer = window.setInterval(() => {
      void loadDialogs();
    }, DIALOGS_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
    // Polling should restart only when auth state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    dialogSessionRef.current += 1;
    const session = dialogSessionRef.current;
    teardownWs();

    if (!routeHash) {
      resetDialogState();
      return;
    }

    setSettingsModalOpen(false);
    setDeleteDialogModalOpen(false);
    setEditMessageModalOpen(false);
    void loadDialogByHash(routeHash, session);

    return () => {
      teardownWs();
    };
    // The dialog session is driven by auth/hash changes; helpers read current refs/state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, routeHash]);

  useEffect(() => {
    const dialogId = currentDialogIdRef.current;
    if (!isAuthenticated || !dialogId || blockedDialog) return undefined;

    globalWS.subscribeDialog(dialogId);
    globalWS.addDialogListener('message:new', handleWsMessageNew);
    globalWS.addDialogListener('message:deleted', handleWsMessageDeleted);
    globalWS.addDialogListener('message:edited', handleWsMessageEdited);
    globalWS.addDialogListener('message:reaction', handleWsMessageReaction);
    globalWS.addDialogListener('call:signal', handleWsCallSignal);
    globalWS.addGlobalPresenceListener(handlePresenceUpdate);

    const foreignUserId = currentForeignUserIdRef.current;
    if (foreignUserId > 0) {
      globalWS.addPresenceListener(foreignUserId, handlePresenceUpdate);
      globalWS.subscribePresence([foreignUserId]);
    }

    return () => {
      teardownWs();
    };
    // WS subscriptions are keyed by dialog/user ids; handlers intentionally keep current state via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockedDialog, isAuthenticated, selectedDialog?.id, foreignUser?.id]);

  useLayoutEffect(() => {
    const scrollContainer = messageScrollRef.current;
    if (!scrollContainer) return;

    const pendingAction = scrollActionRef.current;
    if (!pendingAction) return;

    if (pendingAction.type === 'bottom') {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    } else {
      scrollContainer.scrollTop =
        scrollContainer.scrollHeight - pendingAction.prevHeight + pendingAction.prevTop;
    }

    scrollActionRef.current = null;
  }, [messages, routeHash]);

  useEffect(() => {
    if (!routeHash || !selectedDialogId) return;

    const frame = window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [routeHash, selectedDialogId]);

  const handleDialogOpen = (hash: string) => {
    const normalizedHash = normalizeHash(hash);
    if (!normalizedHash || normalizedHash === routeHash) return;
    setRouteHash(normalizedHash);
    window.history.pushState(null, '', `/messages/${encodeURIComponent(normalizedHash)}`);
  };

  const handleDialogClose = () => {
    setRouteHash('');
    window.history.pushState(null, '', '/messages');
  };

  const sendReaction = async (messageId: number, reaction: string, action: 'add' | 'delete') => {
    const currentUserIdStr = String(currentUserId);

    setMessages((currentMessages) =>
      currentMessages.map((msg) => {
        if (getMessageId(msg) !== messageId) return msg;
        const currentReactions = parseReactions(msg.reactions);
        let nextReactions = [...currentReactions];
        if (action === 'add') {
          const existingIndex = nextReactions.findIndex((r) => r.userId === currentUserIdStr);
          if (existingIndex !== -1) {
            const oldReaction = nextReactions[existingIndex].emoji;
            nextReactions.splice(existingIndex, 1);
            if (oldReaction !== reaction) {
              nextReactions.push({ userId: currentUserIdStr, emoji: reaction });
            }
          } else {
            nextReactions.push({ userId: currentUserIdStr, emoji: reaction });
          }
        } else {
          nextReactions = nextReactions.filter(
            (r) => !(r.userId === currentUserIdStr && r.emoji === reaction),
          );
        }
        return {
          ...msg,
          reactions: nextReactions.map((r) => `${r.userId}:${r.emoji}`).join('|'),
        };
      }),
    );

    try {
      await AncialAPI.messageAction('reaction', { msg_id: messageId, reaction, action });
    } catch (error) {
      console.error('Failed to update reaction', error);
      notify({
        content: lang?.somethingwrong || 'Произошла ошибка =(',
        type: 'error',
      });
      await loadMessagesInitial(dialogSessionRef.current, true);
    }
  };

  const handleMessageDelete = async (message: DialogMessage) => {
    const messageId = getMessageId(message);
    if (!messageId) return;

    try {
      const response = await AncialAPI.messageAction<{ message?: string }>('delete', { msg_id: messageId });
      const text = response.message || '';

      setMessages((currentMessages) => {
        const nextMessages = currentMessages.filter((item) => getMessageId(item) !== messageId);
        persistMessages({
          keepSide: 'newest',
          nextMessages,
        });
        return nextMessages;
      });

      if (text) {
        notify({
          content: text,
          type: 'success',
        });
      }

      void loadDialogs({ force: true });
    } catch (error) {
      console.error('Failed to delete message', error);
      notify({
        content: lang?.somethingwrong || 'Произошла ошибка =(',
        type: 'error',
      });
    }
  };

  const handleMessageEditOpen = (message: DialogMessage) => {
    setEditingMessage(message);
    setEditingValue(getEditableMessageText(message));
    setEditMessageModalOpen(true);
  };

  const handleMessageEditSave = async () => {
    const messageId = getMessageId(editingMessage ?? {});
    const nextValue = editingValue.trim();

    if (!messageId || !nextValue) {
      notify({
        content: lang?.enter_new_message || 'Введите новый текст сообщения',
        type: 'error',
      });
      return;
    }

    try {
      const response = await AncialAPI.messageAction<{ message?: string }>('edit', { msg_id: messageId, msg_data: nextValue });
      const text = response.message || '';

      setMessages((currentMessages) => {
        const nextMessages = currentMessages.map((message) =>
          getMessageId(message) === messageId
            ? {
              ...message,
              message: escapeHtml(nextValue),
            }
            : message,
        );

        persistMessages({
          keepSide: 'newest',
          nextMessages,
        });

        return nextMessages;
      });

      setEditMessageModalOpen(false);
      setEditingMessage(null);
      setEditingValue('');

      notify({
        content: text || (lang?.edit_message || 'Сообщение обновлено'),
        type: 'success',
      });

      void loadDialogs({ force: true });
    } catch (error) {
      console.error('Failed to edit message', error);
      notify({
        content: lang?.somethingwrong || 'Произошла ошибка =(',
        type: 'error',
      });
    }
  };

  const handleDialogDelete = async () => {
    const dialogId = currentDialogIdRef.current;
    if (!dialogId) return;

    try {
      const response = await AncialAPI.dialogAction<{ message?: string }>('delete', dialogId);
      const text = response.message || '';

      cache.remove(DIALOGS_CACHE_KEY, { category: 'chats', subcategory: 'dialogs' });

      setDeleteDialogModalOpen(false);
      handleDialogClose();
      await loadDialogs({ force: true });

      if (text) {
        notify({
          content: text,
          type: 'success',
        });
      }
    } catch (error) {
      console.error('Failed to delete dialog', error);
      notify({
        content: lang?.somethingwrong || 'Произошла ошибка =(',
        type: 'error',
      });
    }
  };

  const uploadToImgbb = async (file: File) => {
    const form = new FormData();
    form.append('image', file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      body: form,
      method: 'POST',
    });

    const result = (await response.json()) as {
      data?: {
        url?: string;
      };
    };

    const imageUrl = normalizeText(result.data?.url);
    if (!imageUrl) {
      throw new Error('Upload failed');
    }

    return imageUrl;
  };

  const handleMessageImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const dialogId = currentDialogIdRef.current;
    if (!file || !dialogId) return;

    setUploadingMessageImage(true);
    notify({
      content: lang?.['loading...'] || 'Загрузка...',
      time: 5,
      type: 'info',
    });

    let tempId: number | null = null;

    try {
      const imageUrl = await uploadToImgbb(file);
      tempId = Date.now();
      const currentReplyingTo = replyingTo;
      const imgHtml = `<img src="${imageUrl}" data-src="${imageUrl}" data-type="image" data-fancybox="images" class="max-h-48 lg:max-h-64 shrink-0 cursor-pointer duration-300 active:scale-95 overflow rounded-lg">`;

      const optimisticMsg: DialogMessage = {
        id: tempId,
        dialog_id: dialogId,
        sender_id: currentUserId,
        message: imgHtml,
        date: new Date().toISOString(),
        isSending: true,
        reply_to: currentReplyingTo ? currentReplyingTo.id : null,
        reply_author: currentReplyingTo ? currentReplyingTo.sender_id : null,
        reply_msg: currentReplyingTo ? currentReplyingTo.message : null,
        reply_type: currentReplyingTo ? currentReplyingTo.type : null,
        type: 1,
      };

      setReplyingTo(null);
      scrollActionRef.current = { type: 'bottom' };
      setMessages((prev) => [...prev, optimisticMsg]);

      window.requestAnimationFrame(() => {
        if (messageScrollRef.current) {
          messageScrollRef.current.scrollTop = messageScrollRef.current.scrollHeight;
        }
      });

      await AncialAPI.sendMessage({
        di_id: dialogId,
        img: imageUrl,
        ...(currentReplyingTo ? { reply_to: currentReplyingTo.id } : {}),
      });

      notify({
        content: lang?.done || 'Готово',
        type: 'success',
      });

      await loadMessagesNewer(dialogSessionRef.current);
      await loadDialogs({ force: true });
    } catch (error) {
      console.error('Failed to send image message', error);
      notify({
        content: lang?.somethingwrong || 'Произошла ошибка =(',
        type: 'error',
      });
    } finally {
      setUploadingMessageImage(false);
      event.target.value = '';
    }
  };

  const handleDialogBackgroundSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const dialogId = currentDialogIdRef.current;
    if (!file || !dialogId) return;

    setUploadingDialogBackground(true);
    notify({
      content: lang?.['loading...'] || 'Загрузка...',
      time: 5,
      type: 'info',
    });

    try {
      const imageUrl = await uploadToImgbb(file);

      const result = await AncialAPI.updateDialogBackground<{ success?: boolean; error?: string }>(dialogId, imageUrl);
      const isSuccess = (result as any).success !== false;
      if (!isSuccess) {
        throw new Error((result as any).error || (lang?.failed_to_update_background || 'Не удалось обновить фон'));
      }

      setSelectedDialog((currentDialog) =>
        currentDialog
          ? {
            ...currentDialog,
            img: imageUrl,
          }
          : currentDialog,
      );

      setSettingsModalOpen(false);

      notify({
        content: lang?.backgroundupdated || 'Фон обновлён',
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to update dialog background', error);
      notify({
        content:
          error instanceof Error && error.message
            ? error.message
            : lang?.somethingwrong || 'Произошла ошибка =(',
        type: 'error',
      });
    } finally {
      setUploadingDialogBackground(false);
      event.target.value = '';
    }
  };

  const handleDialogBackgroundClear = async () => {
    const dialogId = currentDialogIdRef.current;
    const dialogHash = currentDialogHashRef.current;
    if (!dialogId || !dialogHash) return;

    try {
      await AncialAPI.updateDialogBackground(dialogId, '""');

      setSelectedDialog((currentDialog) =>
        currentDialog
          ? {
            ...currentDialog,
            img: '',
          }
          : currentDialog,
      );
      setSettingsModalOpen(false);
    } catch (error) {
      console.error('Failed to clear dialog background', error);
      notify({
        content: lang?.somethingwrong || 'Произошла ошибка =(',
        type: 'error',
      });
    }
  };

  const handleMessageSend = async (event?: React.FormEvent) => {
    event?.preventDefault();

    const dialogId = currentDialogIdRef.current;
    const nextValue = composerText.trim();

    if (!dialogId) return;

    if (!nextValue) {
      notify({
        content:
          lang?.empty_message_warning || 'Ну хоть что-нибудь написали. Вот зачем так делать?',
        type: 'info',
      });
      return;
    }

    const tempId = Date.now();
    const currentReplyingTo = replyingTo;

    const optimisticMsg: DialogMessage = {
      id: tempId,
      dialog_id: dialogId,
      sender_id: currentUserId,
      message: escapeHtml(nextValue),
      date: new Date().toISOString(),
      isSending: true,
      reply_to: currentReplyingTo ? currentReplyingTo.id : null,
      reply_author: currentReplyingTo ? currentReplyingTo.sender_id : null,
      reply_msg: currentReplyingTo ? currentReplyingTo.message : null,
      reply_type: currentReplyingTo ? currentReplyingTo.type : null,
      type: 0,
    };

    setComposerText('');
    setReplyingTo(null);
    scrollActionRef.current = { type: 'bottom' };
    setMessages((prev) => [...prev, optimisticMsg]);

    window.requestAnimationFrame(() => {
      if (messageScrollRef.current) {
        messageScrollRef.current.scrollTop = messageScrollRef.current.scrollHeight;
      }
    });

    setSendingMessage(true);

    try {
      await AncialAPI.sendMessage({
        di_id: dialogId,
        message: nextValue,
        ...(currentReplyingTo ? { reply_to: currentReplyingTo.id } : {}),
      });

      await loadMessagesNewer(dialogSessionRef.current);
      await loadDialogs({ force: true });
    } catch (error) {
      console.error('Failed to send message', error);
      notify({
        content: lang?.somethingwrong || 'Произошла ошибка =(',
        type: 'error',
      });
    } finally {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setSendingMessage(false);
    }
  };

  const handleStickerSend = async (stickerName: string) => {
    const dialogId = currentDialogIdRef.current;
    if (!dialogId) return;

    const tempId = Date.now();
    const currentReplyingTo = replyingTo;

    const optimisticMsg: DialogMessage = {
      id: tempId,
      dialog_id: dialogId,
      sender_id: currentUserId,
      message: `:${stickerName}:`,
      date: new Date().toISOString(),
      isSending: true,
      reply_to: currentReplyingTo ? currentReplyingTo.id : null,
      reply_author: currentReplyingTo ? currentReplyingTo.sender_id : null,
      reply_msg: currentReplyingTo ? currentReplyingTo.message : null,
      reply_type: currentReplyingTo ? currentReplyingTo.type : null,
      type: 1,
    };

    setStickerDropdownOpen(false);
    setReplyingTo(null);
    scrollActionRef.current = { type: 'bottom' };
    setMessages((prev) => [...prev, optimisticMsg]);

    window.requestAnimationFrame(() => {
      if (messageScrollRef.current) {
        messageScrollRef.current.scrollTop = messageScrollRef.current.scrollHeight;
      }
    });

    setSendingMessage(true);

    try {
      await AncialAPI.sendMessage({
        di_id: dialogId,
        sticker: `:${stickerName}:`,
        ...(currentReplyingTo ? { reply_to: currentReplyingTo.id } : {}),
      });

      await loadMessagesNewer(dialogSessionRef.current);
      await loadDialogs({ force: true });
    } catch (error) {
      console.error('Failed to send sticker', error);
      notify({
        content: lang?.somethingwrong || 'Произошла ошибка =(',
        type: 'error',
      });
    } finally {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setSendingMessage(false);
    }
  };

  const handleSevenTvStickerSend = async (sticker: SevenTvSticker) => {
    const dialogId = currentDialogIdRef.current;
    const normalizedStickerName = normalizeText(sticker.name);
    if (!dialogId || !normalizedStickerName) return;

    const tempId = Date.now();
    const currentReplyingTo = replyingTo;

    const optimisticMsg: DialogMessage = {
      id: tempId,
      dialog_id: dialogId,
      sender_id: currentUserId,
      message: `:7tv-${normalizedStickerName}-${sticker.id}:`,
      date: new Date().toISOString(),
      isSending: true,
      reply_to: currentReplyingTo ? currentReplyingTo.id : null,
      reply_author: currentReplyingTo ? currentReplyingTo.sender_id : null,
      reply_msg: currentReplyingTo ? currentReplyingTo.message : null,
      reply_type: currentReplyingTo ? currentReplyingTo.type : null,
      type: 0,
    };

    setStickerDropdownOpen(false);
    setReplyingTo(null);
    scrollActionRef.current = { type: 'bottom' };
    setMessages((prev) => [...prev, optimisticMsg]);

    window.requestAnimationFrame(() => {
      if (messageScrollRef.current) {
        messageScrollRef.current.scrollTop = messageScrollRef.current.scrollHeight;
      }
    });

    setSendingMessage(true);

    try {
      seedSevenTvStickerCache([sticker]);

      await AncialAPI.sendMessage({
        di_id: dialogId,
        message: `:7tv-${normalizedStickerName}-${sticker.id}:`,
        ...(currentReplyingTo ? { reply_to: currentReplyingTo.id } : {}),
      });

      await loadMessagesNewer(dialogSessionRef.current);
      await loadDialogs({ force: true });
    } catch (error) {
      console.error('Failed to send 7TV sticker', error);
      notify({
        content: lang?.somethingwrong || 'Произошла ошибка =(',
        type: 'error',
      });
    } finally {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setSendingMessage(false);
    }
  };

  const handleStartCall = () => {
    if (routeHash) {
      if (isPlaying) togglePlay();
      router.push(`/call/${routeHash}`);
    }
  };

  const handleMessagesScroll = () => {
    const scrollContainer = messageScrollRef.current;
    if (!scrollContainer) return;

    if (scrollContainer.scrollTop < 160 && hasMoreMessages && !loadingOlder) {
      void loadMessagesOlder(dialogSessionRef.current);
    }

    const atBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 150;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setUnreadCount(0);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Icon name="IC-loader" className="h-16 w-16 animate-spin fill-purple-500" />
      </div>
    );
  }

  return (
    <>

      <div
        id="dialog-bg"
        className="z-[-1] absolute inset-0 w-full h-full object-cover opacity-40 duration-300 bg-cover bg-center"
        style={
          dialogBackgroundUrl
            ? {
              backgroundImage: `url(${dialogBackgroundUrl})`,
            }
            : undefined
        }
      ></div>

      <div className="flex h-[100dvh] w-full items-center justify-center">
        <div
          className={cn(
            'messages-route flex h-full w-full items-center justify-center bg-center bg-cover',
            routeHash && 'no-mobile-nav-padding',
          )}
        >
          <div className="flex h-full w-full items-stretch justify-center">
            <div
              id="dialogs-pane"
              className={cn(
                'flex h-full w-full max-w-3xl flex-col duration-300 lg:max-w-sm lg:flex-none lg:py-3',
                routeHash && 'hidden lg:flex',
              )}
            >
              <div className="flex flex-col h-full w-full lg:bg-zinc-900/50 lg:backdrop-blur-lg lg:shadow lg:rounded-3xl lg:overflow-hidden lg:border lg:border-zinc-600/30">

                <span className="w-full px-3 pb-3 pt-3 text-3xl font-extralight lg:hidden">
                  {lang?.chats || 'Чаты'}
                </span>

                <div className="relative flex h-full flex-col">
                  <div className="flex h-full flex-col">
                    {dialogsLoading && dialogs.length === 0 ? (
                      <div className="flex flex-col w-full">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 w-full animate-pulse">
                            <div className="h-16 w-16 shrink-0 rounded-full bg-zinc-800 shadow" />
                            <div className="flex min-w-0 flex-1 flex-col gap-2 justify-center">
                              <div className="h-4 w-1/2 rounded-full bg-zinc-800" />
                              <div className="h-3 w-3/4 rounded-full bg-zinc-800" />
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2 justify-center">
                              <div className="h-3 w-10 rounded-full bg-zinc-800" />
                              <div className="h-5 w-5 rounded-full bg-zinc-800" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : dialogsError && dialogs.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                        <img
                          src="/includes/img/stickers/sponge.gif"
                          alt=""
                          className="mb-3 h-40 w-40 object-contain"
                        />
                        <span className="text-lg text-zinc-200">Связь потеряна!</span>
                        <span className="text-zinc-400">
                          {lang?.refresh_page || 'Попробуйте обновить страницу'}
                        </span>
                        <span className="mt-1 text-xs text-zinc-500">{dialogsError}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setDialogsError('');
                            setDialogsLoading(true);
                            void loadDialogs({ force: true });
                          }}
                          className="mt-3 rounded-full border border-zinc-600/30 bg-purple-500 px-4 py-2 text-white duration-300 hover:bg-purple-600 active:scale-95"
                        >
                          Попробовать ещё
                        </button>
                      </div>
                    ) : dialogs.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-0.5 pb-3 text-center">
                        <img src={NOTHING_FOUND_IMAGE} alt="" className="h-56 w-56 object-contain" />
                        <span className="w-full text-base font-black text-zinc-100">
                          {lang?.emptycomments || 'Пока ничего нет'}
                        </span>
                        <span className="w-full text-sm font-medium text-zinc-300">
                          {lang?.emptymessagesdesc || 'Здесь появятся ваши диалоги'}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div id="dialog-list-container" className="flex min-h-0 flex-1 flex-col lg:overflow-y-auto">
                          {dialogs.map((dialog) => {
                            const dialogHash = normalizeHash(dialog.hash);
                            const active = dialogHash === routeHash;
                            const preview = formatDialogPreview(dialog.Mmessage, lang);
                            const dialogName = decodeText(dialog.Uname);
                            const previewStatusIcon = getDialogPreviewStatusIconName(dialog.Mstatus);

                            return (
                              <button
                                key={dialogHash || String(dialog.id)}
                                type="button"
                                onClick={() => handleDialogOpen(dialogHash)}
                                className={cn(
                                  'cursor-pointer flex items-center gap-3 p-3 text-left duration-300 hover:bg-zinc-800 active:scale-95 active:rounded-3xl',
                                  active && 'bg-zinc-800/90',
                                )}
                              >
                                <div className="shrink-0">
                                  <img
                                    className={cn(
                                      'h-16 w-16 rounded-full object-cover shadow',
                                      isOnline(dialog.Ulastonline) && 'ring-2 ring-lime-500',
                                    )}
                                    src={normalizeAssetUrl(dialog.Uimg, FALLBACK_AVATAR)}
                                    alt={dialogName || 'Dialog avatar'}
                                  />
                                </div>

                                <div className="flex min-w-0 flex-1 flex-col">
                                  <span className="truncate text-base font-medium text-zinc-100 lg:text-lg">
                                    {dialogName || 'Пользователь'}
                                    {String(dialog.Uverify ?? '0') === '1' ? (
                                      <Icon name="IC-verify" className="ml-1 inline h-5 w-5 fill-blue-500" />
                                    ) : null}
                                  </span>
                                  <span className="truncate text-sm text-zinc-300 lg:text-base">
                                    {preview || (lang?.write_message || 'Напишите сообщение')}
                                  </span>
                                </div>

                                <div className="flex shrink-0 flex-col items-end text-xs text-zinc-400 lg:text-sm">
                                  <span>{normalizeText(dialog.Mtime)}</span>
                                  <Icon
                                    name={previewStatusIcon}
                                    className={cn(
                                      'h-5 w-5',
                                      String(dialog.Mstatus ?? '0') === '0'
                                        ? 'fill-white'
                                        : 'fill-purple-500',
                                    )}
                                  />
                                </div>
                              </button>
                            );
                          })}
                          <div className={cn('lg:pb-20', isPulsePlayerActive ? 'pb-56' : 'pb-36')} />
                        </div>

                        <button
                          type="button"
                          onClick={() => setCreateGroupModalOpen(true)}
                          className={cn(
                            'fixed right-3 lg:absolute z-40 flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 text-white shadow-2xl hover:bg-purple-500 active:scale-95 duration-300 border border-zinc-600/30 cursor-pointer',
                            isPulsePlayerActive ? 'bottom-38 lg:bottom-22' : 'bottom-21 lg:bottom-3',
                          )}
                          title={lang?.create_group || 'Создать групповой чат'}
                        >
                          <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                          </svg>
                        </button>
                        <YandexRtb
                          blockId="R-A-3636730-16"
                          className="hidden w-full max-h-24 items-center justify-center lg:flex"
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div
              id="dialog-pane"
              className={cn(
                'w-full lg:min-w-0 lg:flex-1',
                routeHash ? 'flex h-full flex-col' : 'hidden w-full lg:flex lg:h-full lg:flex-col',
              )}
            >
              {!routeHash ? (
                <div
                  id="welcome-pane"
                  className="hidden h-full w-full flex-col items-center justify-center gap-3 p-3 text-center lg:flex lg:flex-row"
                >
                  <img
                    src={FALLBACK_WELCOME_IMAGE}
                    alt=""
                    className="-rotate-45 w-64 animate-pulse object-contain"
                  />
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-white">
                      {lang?.welcometochats || 'Добро пожаловать в чаты'}
                    </span>
                    <span className="text-xl text-zinc-300">
                      {lang?.welcometochatsdesc || 'Выберите диалог слева, чтобы начать общение.'}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  id="dialog-bg-old"
                  className="relative flex h-full w-full flex-col overflow-hidden bg-cover bg-center"
                >
                  <div className="absolute inset-x-0 top-0 z-[20] flex items-center justify-center bg-gradient-to-b from-black via-black/90 to-transparent lg:from-transparent lg:via-transparent p-2">
                    <div className="flex w-23 shrink-0">
                      <button
                        type="button"
                        onClick={handleDialogClose}
                        className="flex h-10 w-10 cursor-pointer items-center justify-start text-lg font-medium duration-300 hover:scale-95 lg:hidden"
                      >
                        <Icon name="IC-chevron-left" className="h-8 w-8 fill-white" />
                      </button>
                    </div>

                    <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (isGroupDialog) {
                            setGroupInfoModalOpen(true);
                          }
                        }}
                        className={cn(
                          'lg:h-10 flex flex-col lg:flex-row lg:gap-3 lg:shadow lg:border lg:border-zinc-600/30 items-center justify-center px-2 text-center lg:bg-zinc-900/80 lg:backdrop-blur-lg lg:backdrop-saturate-200 lg:rounded-3xl lg:px-3 lg:py-1.5 duration-300',
                          isGroupDialog && 'cursor-pointer active:scale-95 hover:text-purple-300'
                        )}
                      >
                        <span className="max-w-full truncate text-base font-bold">
                          {dialogTitle || '...'}
                        </span>
                        <span className="max-w-full truncate text-xs text-zinc-300 lg:text-sm">{dialogStatusLabel}</span>
                      </button>
                    </div>

                    <div className="flex w-23 shrink-0 items-center justify-end gap-3">
                      {!isGroupDialog && (
                        <button
                          id="call-button"
                          type="button"
                          onClick={handleStartCall}
                          className={cn(
                            'lg:shadow flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full duration-300 active:scale-95',
                            hasActiveCall ? 'bg-lime-500 hover:bg-lime-400 animate-pulse' : 'lg:bg-zinc-900/80 lg:backdrop-blur-lg lg:backdrop-saturate-200 lg:border lg:border-zinc-600/30 hover:bg-zinc-700'
                          )}
                        >
                          <Icon name="IC-call" className="h-7 w-7 fill-white" />
                        </button>
                      )}

                      <Dropdown
                        position="bottom"
                        align="end"
                        triggerSize="sm"
                        width="auto"
                        menuClassName="min-w-[13rem]"
                        triggerAriaLabel={lang?.chat_settings || 'Настройки чата'}
                        triggerClassName="h-10 w-10 overflow-hidden rounded-full p-0 shadow hover:bg-zinc-700/80"
                        triggerNode={
                          <img
                            id="dialog-avatar"
                            src={dialogAvatarUrl}
                            alt={dialogTitle || 'Dialog avatar'}
                            className="lg:shadow h-10 w-10 rounded-full object-cover"
                          />
                        }
                      >
                        {!isGroupDialog && (
                          <DropdownItem
                            icon="IC-user"
                            onClick={() => {
                              const username = normalizeText(currentForeignUserRef.current?.username);
                              if (!hasMeaningfulValue(username)) {
                                return;
                              }

                              router.push(`/@${username}`);
                            }}
                          >
                            {lang?.userpage || 'Страница'}
                          </DropdownItem>
                        )}
                        {!blockedDialog && (
                          <DropdownItem
                            icon="IC-settings"
                            onClick={() => {
                              if (isGroupDialog) {
                                setGroupInfoModalOpen(true);
                              } else {
                                setSettingsModalOpen(true);
                              }
                            }}
                          >
                            {isGroupDialog ? (lang?.group_settings || 'Настройки беседы') : (lang?.chat_settings || 'Настройки чата')}
                          </DropdownItem>
                        )}
                        {!isGroupDialog && (
                          <DropdownItem
                            icon="IC-trash"
                            onClick={() => {
                              setDeleteDialogModalOpen(true);
                            }}
                          >
                            {lang?.dialogdelete || 'Удалить диалог'}
                          </DropdownItem>
                        )}
                      </Dropdown>
                    </div>
                  </div>

                  <div
                    ref={messageScrollRef}
                    id="msg-scroll"
                    onScroll={handleMessagesScroll}
                    className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pt-[calc(100vh-116px)]"
                  >
                    {dialogLoading && !selectedDialog ? (
                      <div className="flex h-full min-h-[50vh] items-center justify-center">
                        <Icon name="IC-loader" className="h-16 w-16 animate-spin fill-purple-500" />
                      </div>
                    ) : dialogError && !messages.length ? (
                      <div className="flex h-full min-h-[50vh] flex-col items-center justify-center text-center text-zinc-300">
                        <span>{dialogError}</span>
                      </div>
                    ) : (
                      <div id="msgbox" className="flex min-h-full flex-col">
                        <div
                          className="mt-auto transition-all duration-200"
                          style={{ paddingBottom: `${composerHeight + (replyingTo ? 54 : 12)}px` }}
                        >
                          {loadingOlder ? (
                            <div className="mb-3 flex items-center justify-center">
                              <Icon name="IC-loader" className="h-8 w-8 animate-spin fill-purple-500" />
                            </div>
                          ) : null}

                          {timelineItems.map((item) =>
                            item.kind === 'separator' ? (
                              <div key={`sep:${item.dayKey}`} className="my-3 flex w-full justify-center">
                                <span className="rounded-full border border-zinc-600/30 bg-zinc-900/70 px-3 py-1 text-xs text-zinc-200 shadow">
                                  {item.label}
                                </span>
                              </div>
                            ) : (
                              (() => {
                                const senderMember = isGroupDialog
                                  ? selectedDialog?.members?.find((m) => Number(m.id) === Number(item.message.sender_id))
                                  : null;

                                const groupSenderName = isGroupDialog
                                  ? (senderMember
                                    ? ((senderMember as any).name || `${senderMember.fname || ''} ${senderMember.lname || ''}`.trim() || senderMember.username || (lang?.group_participant || 'Участник'))
                                    : (lang?.group_participant || 'Участник'))
                                  : undefined;

                                const groupSenderAvatarUrl = isGroupDialog
                                  ? (senderMember?.img || FALLBACK_AVATAR)
                                  : undefined;

                                return (
                                  <MessageBubble
                                    key={`msg:${getMessageId(item.message)}`}
                                    authUserImage={authUserImage}
                                    currentUserId={currentUserId}
                                    foreignUser={foreignUser}
                                    lang={lang}
                                    message={item.message}
                                    senderName={groupSenderName}
                                    senderAvatarUrl={groupSenderAvatarUrl}
                                    onAddReaction={(messageId, reaction) => {
                                      void sendReaction(messageId, reaction, 'add');
                                    }}
                                    onReply={(message) => {
                                      setReplyingTo(message);
                                      messageInputRef.current?.focus();
                                    }}
                                    onDeleteMessage={(message) => {
                                      void handleMessageDelete(message);
                                    }}
                                    onDeleteReaction={(messageId, reaction) => {
                                      void sendReaction(messageId, reaction, 'delete');
                                    }}
                                    onEditMessage={handleMessageEditOpen}
                                    onOpenImage={setActiveDialogImageKey}
                                    onReplyClick={seekToMessage}
                                  />
                                );
                              })()
                            ),
                          )}



                          {!dialogLoading && !messages.length ? (
                            <div className="flex min-h-[50vh] items-center justify-center">
                              <span className="rounded-full border border-zinc-600/30 bg-zinc-900/70 px-4 py-2 text-sm text-zinc-300 shadow backdrop-blur-md backdrop-saturate-200">
                                {lang?.write_message || 'Напишите первое сообщение'}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (messageScrollRef.current) {
                        messageScrollRef.current.scrollTo({
                          top: messageScrollRef.current.scrollHeight,
                          behavior: 'smooth'
                        });
                      }
                    }}
                    style={{ bottom: `${composerHeight + (replyingTo ? 54 : 12)}px` }}
                    className={cn(
                      "cursor-pointer absolute right-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/70 backdrop-blur-lg backdrop-saturate-200 backdrop-hue-200 text-white shadow-lg border border-zinc-600/30 hover:bg-zinc-700/70 active:scale-95 duration-300 transition-all",
                      !isAtBottom ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
                    )}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 fill-white" viewBox="0 0 24 24" fill="currentColor">
                      <use href="#IC-chevron-down"></use>
                    </svg>
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-purple-500 px-1 text-xs font-bold text-white shadow">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </div>
                    )}
                  </button>

                  <div
                    style={{ bottom: `${composerHeight + 4}px` }}
                    className={cn(
                      "absolute inset-x-3 z-10 flex items-center justify-between rounded-3xl border-x border-t border-zinc-600/30 bg-zinc-800/70 backdrop-blur backdrop-saturate-200 backdrop-hue-200 p-1 shadow-lg transition-all duration-300",
                      replyingTo ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
                    )}
                  >
                    <div className="flex flex-col min-w-0 pr-1 rounded-full border-l-2 border-purple-500 pl-2">
                      <span className="text-xs font-semibold text-purple-400">{lang?.reply_to || 'Ответ'} {replyingTo?.sender_id == currentUserId ? (lang?.yourself || 'себе') : (foreignUser?.fname || (lang?.interlocutor?.toLowerCase() || 'собеседнику'))}</span>
                      <span className="text-sm text-zinc-300 truncate max-w-[200px] sm:max-w-xs md:max-w-md -mt-1">
                        {replyingTo?.type == 1 ? (lang?.image_sticker || 'Картинка/стикер') : replyingTo?.message?.replace(/<[^>]*>?/gm, '') || (lang?.message || 'Сообщение')}
                      </span>
                    </div>
                    <button type="button" onClick={() => setReplyingTo(null)} className="shrink-0 p-1 rounded-full hover:bg-zinc-700/50 text-zinc-400 cursor-pointer active:scale-95 duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                      </svg>
                    </button>
                  </div>

                  {blockedDialog ? (
                    <div
                      id="blocked-pane"
                      className="absolute bottom-0 inset-x-0 z-20 flex items-center justify-center gap-1.5 p-3 pt-0"
                    >
                      <div className="bg-amber-500/25 text-amber-500 p-3 rounded-3xl shadow border border-zinc-600/30 text-center backdrop-blur-lg backdrop-saturate-200 backdrop-hue-200">Собеседник заблокирован</div>
                    </div>
                  ) : (
                    <div ref={composerPaneRef} className="absolute bottom-0 inset-x-0 z-20 flex items-center justify-center gap-1.5 p-3 pt-0">
                      <form
                        onSubmit={handleMessageSend}
                        className="relative flex items-end min-h-[42px] w-full rounded-3xl border border-zinc-600/30 bg-zinc-900/20 p-1 transition-all duration-150"
                      >
                        <div className="absolute inset-0 rounded-3xl backdrop-blur-md backdrop-saturate-200"></div>

                        <textarea
                          ref={messageInputRef}
                          rows={1}
                          value={composerText}
                          onChange={(event) => setComposerText(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault();
                              if (composerText.trim() && selectedDialog && !sendingMessage) {
                                void handleMessageSend(event);
                              }
                            }
                          }}
                          placeholder={lang?.write_message || 'Напишите сообщение'}
                          disabled={!selectedDialog || sendingMessage}
                          className="relative z-[1] w-full h-[40px] max-h-32 min-h-[40px] resize-none bg-transparent py-2 pl-3 pr-1 text-white placeholder-zinc-600/80 focus:border-0 focus:outline-none focus:ring-0 leading-6 scrollbar-none"
                        />

                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleMessageImageSelect}
                        />

                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={!selectedDialog || uploadingMessageImage}
                          className="group relative z-[1] flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full duration-300 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 mb-[1px]"
                        >
                          {uploadingMessageImage ? (
                            <Icon name="IC-loader" className="h-6 w-6 animate-spin fill-zinc-500" />
                          ) : (
                            <Icon name="IC-image" className="h-6 w-6 fill-zinc-400 group-hover:fill-zinc-300 duration-300" />
                          )}
                        </button>

                        {!selectedDialog ? (
                          <button
                            type="button"
                            disabled
                            className="group relative z-[1] flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-full opacity-50 mb-[1px]"
                          >
                            <Icon name="IC-emoji" className="h-6 w-6 fill-zinc-400 group-hover:fill-zinc-300 duration-300" />
                          </button>
                        ) : (
                          <Dropdown
                            closeOnChildClick={false}
                            open={stickerDropdownOpen}
                            onOpenChange={setStickerDropdownOpen}
                            position="top"
                            align="end"
                            triggerSize="sm"
                            width="auto"
                            menuClassName="w-[17rem] overflow-hidden !p-0 text-zinc-300"
                            triggerAriaLabel={lang?.stickers || 'Стикеры'}
                            triggerClassName="group relative z-[1] h-10 w-10 rounded-full hover:bg-zinc-700 mb-[1px]"
                            triggerNode={<Icon name="IC-emoji" className="h-6 w-6 fill-zinc-400 group-hover:fill-zinc-300 duration-300" />}
                          >
                            <StickerPickerDropdownContent
                              isOpen={stickerDropdownOpen}
                              isSending={sendingMessage}
                              onSendNativeSticker={(stickerName) => {
                                void handleStickerSend(stickerName);
                              }}
                              onSendSevenTvSticker={(sticker) => {
                                void handleSevenTvStickerSend(sticker);
                              }}
                            />
                          </Dropdown>
                        )}

                        <button
                          type="submit"
                          disabled={!selectedDialog || sendingMessage}
                          className="relative z-[1] flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full duration-300 hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-zinc-500/50 disabled:opacity-70 active:scale-95 mb-[1px]"
                        >
                          {sendingMessage ? (
                            <Icon name="IC-loader" className="h-8 w-8 animate-spin fill-white" />
                          ) : (
                            <Icon name="IC-send" className="h-8 w-8 fill-white" />
                          )}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {resolvedActiveDialogImageIndex !== null && (
        <ImageViewerModal
          activeImageIndex={resolvedActiveDialogImageIndex}
          images={dialogImageSlides}
          isOpen={resolvedActiveDialogImageIndex !== null}
          onClose={() => {
            setActiveDialogImageKey(null);
          }}
          onNext={() => {
            if (resolvedActiveDialogImageIndex === null || dialogImageSlides.length < 2) {
              return;
            }

            const nextIndex = (resolvedActiveDialogImageIndex + 1) % dialogImageSlides.length;
            setActiveDialogImageKey(dialogImageSlides[nextIndex]?.key ?? null);
          }}
          onPrev={() => {
            if (resolvedActiveDialogImageIndex === null || dialogImageSlides.length < 2) {
              return;
            }

            const nextIndex =
              (resolvedActiveDialogImageIndex - 1 + dialogImageSlides.length) % dialogImageSlides.length;
            setActiveDialogImageKey(dialogImageSlides[nextIndex]?.key ?? null);
          }}
        />
      )}

      <Modal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        title={lang?.chat_settings || 'Настройки чата'}
      >
        <div className="flex flex-col gap-3">
          <h2 className="text-sm text-zinc-300">{lang?.change_bg || 'Изменить фон'}</h2>
          <div className="drag-scroll viewport -my-3 flex gap-3 overflow-auto px-1 py-3">
            <button
              type="button"
              onClick={() => {
                void handleDialogBackgroundClear();
              }}
              className={cn(
                'flex h-32 w-20 shrink-0 flex-col items-center rounded-2xl bg-zinc-800 p-3 shadow duration-300 active:scale-95',
                !dialogBackgroundUrl && 'ring-2 ring-purple-500',
              )}
            >
              <div className="mb-1.5 w-full rounded-2xl rounded-bl-none bg-zinc-700 px-1.5 text-sm text-zinc-200">
                Hello
              </div>
              <div className="w-full rounded-2xl rounded-br-none bg-purple-700 px-1.5 text-sm text-white">
                Hi!
              </div>
            </button>

            <button
              type="button"
              onClick={() => backgroundInputRef.current?.click()}
              className={cn(
                'flex h-32 w-20 shrink-0 flex-col items-center rounded-2xl bg-gradient-to-br from-purple-700 to-blue-700 bg-cover bg-center p-3 shadow duration-300 active:scale-95',
                dialogBackgroundUrl && 'ring-2 ring-purple-500',
              )}
              style={
                dialogBackgroundUrl
                  ? {
                    backgroundImage: `url(${dialogBackgroundUrl})`,
                  }
                  : undefined
              }
            >
              <div className="mb-1.5 w-full rounded-2xl rounded-bl-none bg-zinc-800/80 px-1.5 text-sm text-zinc-200">
                Hello
              </div>
              <div className="w-full rounded-2xl rounded-br-none bg-purple-700/80 px-1.5 text-sm text-white">
                Hi!
              </div>
              <div className="flex h-full flex-grow items-end">
                {uploadingDialogBackground ? (
                  <Icon name="IC-loader" className="h-12 w-12 animate-spin fill-purple-100" />
                ) : (
                  <Icon name="IC-image" className="h-12 w-12 fill-purple-100" />
                )}
              </div>
            </button>
          </div>
          <input
            ref={backgroundInputRef}
            type="file"
            accept="image/*"
            onChange={handleDialogBackgroundSelect}
            className="hidden"
          />
        </div>
      </Modal>

      <Modal
        isOpen={deleteDialogModalOpen}
        onClose={() => setDeleteDialogModalOpen(false)}
        title={lang?.dialogdelete || 'Удалить диалог'}
      >
        <div className="flex flex-col gap-3">
          <h2 className="text-zinc-200">
            {lang?.durwdialogdelete || 'Вы действительно хотите удалить этот диалог?'}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                void handleDialogDelete();
              }}
              className="cursor-pointer rounded-3xl border border-zinc-600/30 bg-red-500 px-3 py-2 text-white duration-300 hover:bg-red-600 active:scale-95"
            >
              {lang?.durwdialogdeleteYES || 'Удалить'}
            </button>
            <button
              type="button"
              onClick={() => setDeleteDialogModalOpen(false)}
              className="cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-700 px-3 py-2 text-white duration-300 hover:bg-zinc-800 active:scale-95"
            >
              {lang?.durwdialogdeleteNO || 'Отмена'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={editMessageModalOpen}
        onClose={() => setEditMessageModalOpen(false)}
        title={lang?.edit_message || 'Редактировать сообщение'}
      >
        <div className="flex flex-col gap-3">
          <textarea
            rows={3}
            value={editingValue}
            onChange={(event) => setEditingValue(event.target.value)}
            placeholder={lang?.enter_new_message || 'Введите новый текст'}
            className="focus:outline-0 focus:ring-0 min-h-[80px] max-h-40 w-full resize-none rounded-2xl border border-zinc-600/30 bg-zinc-800 p-3 text-zinc-100 placeholder-zinc-500"
          />
          <button
            type="button"
            onClick={() => {
              void handleMessageEditSave();
            }}
            className="cursor-pointer w-full rounded-3xl border border-zinc-600/30 bg-purple-500 px-3 py-2 text-white duration-300 hover:bg-purple-600 active:scale-95"
          >
            {lang?.edit || 'Сохранить'}
          </button>
        </div>
      </Modal>

      <CreateGroupModal
        isOpen={createGroupModalOpen}
        onClose={() => setCreateGroupModalOpen(false)}
        onGroupCreated={(groupData) => {
          setRouteHash(groupData.hash);
          router.push(`/messages/${groupData.hash}`);
          void loadDialogs({ force: true });
        }}
      />

      {selectedDialog && selectedDialog.type === 'group' && (
        <GroupInfoModal
          isOpen={groupInfoModalOpen}
          onClose={() => setGroupInfoModalOpen(false)}
          dialogId={Number(selectedDialog.id)}
          title={selectedDialog.title || 'Групповой чат'}
          avatar={selectedDialog.avatar || ''}
          inviteCode={selectedDialog.invite_code || ''}
          myRole={(selectedDialog.my_role as any) || 'member'}
          members={selectedDialog.members || []}
          onGroupUpdated={() => {
            void reloadCurrentDialogMeta();
            void loadDialogs({ force: true });
            void loadMessagesNewer(dialogSessionRef.current);
          }}
          onLeave={() => {
            setGroupInfoModalOpen(false);
            resetDialogState();
            router.replace('/messages');
            void loadDialogs({ force: true });
          }}
        />
      )}
    </>
  );
}
