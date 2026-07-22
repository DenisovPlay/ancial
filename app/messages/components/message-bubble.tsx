/* eslint-disable @next/next/no-img-element */
'use client';

import Image from 'next/image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

import { Dropdown, DropdownItem } from '../../components/navigation';
import {
  buildSevenTvStickerProxyUrl,
  cn,
  DialogMessage,
  DialogUser,
  extractMessageImages,
  FALLBACK_AVATAR,
  formatMessageTime,
  getDialogImageKey,
  getMessageBodyHtmlWithoutImages,
  getMessageId,
  getMessageStatusIconName,
  getSevenTvStickerCacheKey,
  getSevenTvStickerTokenData,
  Icon,
  isMessageMenuIgnoredTarget,
  LangMap,
  normalizeAssetUrl,
  parseMessageLinks,
  parseReactions,
  resolveSevenTvStickerByName,
  sevenTvStickerCache,
  SevenTvSticker,
  stripHtml,
  toNumber,
} from '../lib/messages-shared';
import PostPreview from './post-preview';
import TrackPreview from './track-preview';

function SevenTvStickerMessage({
  stickerId,
  stickerName,
}: {
  stickerId?: string;
  stickerName: string;
}) {
  const directStickerUrl = buildSevenTvStickerProxyUrl(stickerId ?? '');
  const cacheKey = getSevenTvStickerCacheKey(stickerName);
  const cachedSticker = cacheKey ? sevenTvStickerCache.get(cacheKey) : undefined;
  const [resolvedState, setResolvedState] = useState<{
    key: string;
    sticker: SevenTvSticker | null;
  } | null>(() => (
    cacheKey && cachedSticker !== undefined
      ? { key: cacheKey, sticker: cachedSticker }
      : null
  ));
  const resolvedSticker = cachedSticker !== undefined
    ? cachedSticker
    : resolvedState?.key === cacheKey
      ? resolvedState.sticker
      : null;

  useEffect(() => {
    let cancelled = false;

    if (!cacheKey || directStickerUrl) {
      return undefined;
    }

    if (cachedSticker !== undefined) {
      return undefined;
    }

    void resolveSevenTvStickerByName(stickerName).then((nextResolvedSticker) => {
      if (cancelled) return;
      setResolvedState({
        key: cacheKey,
        sticker: nextResolvedSticker,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, cachedSticker, directStickerUrl, stickerName]);

  if (directStickerUrl || resolvedSticker?.url) {
    return (
      <div className="overflow-hidden rounded-lg">
        <Image
          src={directStickerUrl || resolvedSticker?.url || ''}
          alt={resolvedSticker?.name || stickerName}
          unoptimized
          width={220}
          height={220}
          className="h-auto max-h-48 w-auto max-w-full rounded-lg object-contain shadow lg:max-h-64"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-24 min-w-24 items-center justify-center rounded-2xl bg-zinc-900/70 px-3 py-2 text-center text-sm text-zinc-300 shadow">
      7TV: {stickerName}
    </div>
  );
}

export default function MessageBubble({
  authUserImage,
  currentUserId,
  foreignUser,
  lang,
  message,
  onAddReaction,
  onReply,
  onDeleteMessage,
  onDeleteReaction,
  onEditMessage,
  onOpenImage,
  onReplyClick,
  senderName,
  senderAvatarUrl,
}: {
  authUserImage: string;
  currentUserId: number;
  foreignUser: DialogUser | null;
  lang: LangMap;
  message: DialogMessage;
  onAddReaction: (messageId: number, reaction: string) => void;
  onReply: (message: DialogMessage) => void;
  onDeleteMessage: (message: DialogMessage) => void;
  onDeleteReaction: (messageId: number, reaction: string) => void;
  onEditMessage: (message: DialogMessage) => void;
  onOpenImage: (imageKey: string) => void;
  onReplyClick: (replyToId: string | number) => void;
  senderName?: string;
  senderAvatarUrl?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [transformY, setTransformY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const dragX = useMotionValue(0);
  const replyIconOpacity = useTransform(dragX, [0, -50], [0, 1]);
  const replyIconScale = useTransform(dragX, [0, -50], [0.5, 1]);
  const replyIconX = useTransform(dragX, [0, -50], [20, 0]);

  const messageId = getMessageId(message);
  const isOwn = toNumber(message.sender_id) === currentUserId;
  const isTextMessage = String(message.type ?? '0') === '0';
  const messageImages = extractMessageImages(message.message);
  const messageBodyRaw = messageImages.length
    ? getMessageBodyHtmlWithoutImages(message.message)
    : String(message.message ?? '');

  const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN || 'ancial.ru';

  const postIds = useMemo(() => {
    const postRegex = new RegExp(`https?://${domain}/(?:feed/)?post/(\\d+)`, 'gi');
    const ids = new Set<string>();
    let match;
    while ((match = postRegex.exec(messageBodyRaw)) !== null) ids.add(match[1]);
    return Array.from(ids);
  }, [messageBodyRaw, domain]);

  const trackIds = useMemo(() => {
    const trackRegex = new RegExp(`https?://${domain}/pulse/(?:playlist/\\d+\\?track=|track/)(\\d+)`, 'gi');
    const ids = new Set<string>();
    let match;
    while ((match = trackRegex.exec(messageBodyRaw)) !== null) ids.add(match[1]);
    return Array.from(ids);
  }, [messageBodyRaw, domain]);

  const [loadedPosts, setLoadedPosts] = useState<string[]>([]);
  const [loadedTracks, setLoadedTracks] = useState<string[]>([]);

  let messageBodyHtml = parseMessageLinks(messageBodyRaw);

  loadedPosts.forEach((id) => {
    const pattern = new RegExp(`<a href="[^"]*".*?>https?://${domain.replace(/\./g, '\\.')}/(?:feed/)?post/${id}</a>\\s*`, 'gi');
    messageBodyHtml = messageBodyHtml.replace(pattern, '');
  });
  loadedTracks.forEach((id) => {
    const trackRegex1 = new RegExp(`<a href="[^"]*".*?>https?://${domain.replace(/\./g, '\\.')}/pulse/playlist/\\d+\\?track=${id}</a>\\s*`, 'gi');
    const trackRegex2 = new RegExp(`<a href="[^"]*".*?>https?://${domain.replace(/\./g, '\\.')}/pulse/track/${id}</a>\\s*`, 'gi');
    messageBodyHtml = messageBodyHtml.replace(trackRegex1, '');
    messageBodyHtml = messageBodyHtml.replace(trackRegex2, '');
  });

  const sevenTvStickerTokenData = messageImages.length ? null : getSevenTvStickerTokenData(messageBodyHtml);
  const sevenTvStickerName = sevenTvStickerTokenData?.name ?? '';
  const sevenTvStickerId = sevenTvStickerTokenData?.id ?? '';
  const hasMessageText = !sevenTvStickerName && Boolean(stripHtml(messageBodyHtml).trim());
  const isStickerOnlyMessage = Boolean(sevenTvStickerName);
  const canTranslateMessage = !isOwn && isTextMessage && !isStickerOnlyMessage;
  const canEditMessage = isOwn && isTextMessage && !isStickerOnlyMessage;
  const reactions = parseReactions(message.reactions);
  const timeLabel = formatMessageTime(message);
  const translator = typeof window !== 'undefined'
    ? (window as Window & { translate?: (targetId: string) => void }).translate
    : undefined;

  useEffect(() => {
    if (menuOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = 350;
      const minTopSpace = dropdownHeight + 12;

      let newY = 0;
      if (rect.top < minTopSpace) {
        newY = minTopSpace - rect.top;
      }

      // Preserves the original inline component behavior after extraction.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTransformY(newY);
    } else {
      // Preserves the original inline component behavior after extraction.
      setTransformY(0);
    }
  }, [menuOpen]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const stopLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const startLongPress = () => {
    stopLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      setMenuOpen(true);
    }, 500);
  };

  const hasMainContent = messageImages.length > 0 || !!sevenTvStickerName || hasMessageText;
  const blocks: Array<{ type: 'reply' | 'post' | 'track' | 'main'; id: string }> = [];
  if (message.reply_to) {
    blocks.push({ type: 'reply', id: 'reply' });
  }
  postIds.forEach((id) => blocks.push({ type: 'post', id }));
  trackIds.forEach((id) => blocks.push({ type: 'track', id }));
  if (hasMainContent || blocks.length === 0) {
    blocks.push({ type: 'main', id: 'main' });
  }

  return (
    <>
      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[40] bg-black/60 backdrop-blur-lg"
            onClick={() => setMenuOpen(false)}
          />
        ) : null}
      </AnimatePresence>
      <div
        ref={containerRef}
        className={cn('relative mb-2 transition-transform duration-300 ease-out', menuOpen && 'z-[50]')}
        style={{ transform: `translateY(${transformY}px)` }}
        onContextMenu={(event) => {
          if (isMessageMenuIgnoredTarget(event.target)) return;
          event.preventDefault();
          setMenuOpen(true);
        }}
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          if (isMessageMenuIgnoredTarget(event.target)) return;
          startLongPress();
        }}
        onMouseLeave={stopLongPress}
        onMouseUp={stopLongPress}
        onTouchEnd={stopLongPress}
        onTouchMove={stopLongPress}
        onTouchStart={(event) => {
          if (isMessageMenuIgnoredTarget(event.target)) return;
          startLongPress();
        }}
      >
        <motion.div
          style={{ opacity: replyIconOpacity, scale: replyIconScale, x: replyIconX }}
          className="absolute right-2 top-1/2 z-0 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-zinc-800/70 backdrop-blur backdrop-saturate-200 backdrop-hue-200 border border-zinc-600/30 text-zinc-200 pointer-events-none"
        >
          <Icon name="IC-reply" className="h-4 w-4 fill-current" />
        </motion.div>

        <motion.div
          style={{ x: dragX, userSelect: 'none', WebkitUserSelect: 'none' }}
          className={cn('flex w-full relative z-10', isOwn ? 'justify-end' : 'justify-start')}
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0.3, right: 0 }}
          onDragStart={stopLongPress}
          onDragEnd={(event, info) => {
            if (info.offset.x < -50) {
              onReply(message);
              if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(50);
              }
            }
          }}
        >
          <div className={cn("relative flex w-full gap-2 items-end", isOwn ? "justify-end" : "justify-start")}>
            {!isOwn && senderAvatarUrl ? (
              <img
                src={normalizeAssetUrl(senderAvatarUrl, FALLBACK_AVATAR)}
                alt={senderName || ''}
                className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 border border-zinc-600/30 shadow"
              />
            ) : null}
            <div className={cn("relative flex flex-col min-w-0 max-w-[90vw] lg:max-w-[40vw]", isOwn ? "items-end" : "items-start")}>
              <Dropdown
                open={menuOpen}
                onOpenChange={setMenuOpen}
                renderTrigger={false}
                position="top"
                align={isOwn ? 'end' : 'start'}
                width="auto"
                wrapperClassName="pointer-events-none absolute left-0 right-0 top-0 z-30 h-0"
                menuClassName="pointer-events-auto w-fit overflow-hidden rounded-2xl bg-zinc-900/85"
              >
                <div className="flex items-center justify-center gap-1 px-1.5 py-1 text-3xl">
                  {['😀', '👍', '😍', '💖', '😲', '🤬'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onAddReaction(messageId, emoji);
                      }}
                      className="cursor-pointer duration-300 hover:scale-125 active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <DropdownItem
                  icon="IC-reply"
                  className="h-8"
                  onClick={() => {
                    onReply(message);
                  }}
                >
                  {lang?.reply || 'Ответить'}
                </DropdownItem>

                {canTranslateMessage && typeof translator === 'function' ? (
                  <DropdownItem
                    icon="IC-translate"
                    className="h-8"
                    onClick={() => {
                      translator(`msg-body-${messageId}`);
                    }}
                  >
                    {lang?.translate || 'Перевести'}
                  </DropdownItem>
                ) : null}

                {isOwn ? (
                  <DropdownItem
                    icon="IC-times"
                    className="h-8"
                    onClick={() => {
                      onDeleteMessage(message);
                    }}
                  >
                    {lang?.delete || 'Удалить'}
                  </DropdownItem>
                ) : null}

                {canEditMessage ? (
                  <DropdownItem
                    icon="IC-edit"
                    className="h-8"
                    onClick={() => {
                      onEditMessage(message);
                    }}
                  >
                    {lang?.edit || 'Редактировать'}
                  </DropdownItem>
                ) : null}
              </Dropdown>

              <div id={`msg-${messageId}`} className={cn("flex flex-col gap-1 max-w-[90vw] lg:max-w-[40vw]", isOwn ? "items-end" : "items-start")}>
                {blocks.map((block, index) => {
                  const isLast = index === blocks.length - 1;

                  const blockBg = isTextMessage && !(block.type === 'main' && isStickerOnlyMessage)
                    ? (isOwn ? 'bg-purple-700' : 'bg-zinc-900')
                    : '';

                  const blockRadius = isTextMessage && !(block.type === 'main' && isStickerOnlyMessage)
                    ? (isOwn && isLast ? 'rounded-br-lg' : (!isOwn && isLast ? 'rounded-bl-lg' : ''))
                    : '';

                  const blockPadding = block.type === 'main' ? 'p-1 rounded-2xl' : 'rounded-3xl';

                  return (
                    <div
                      key={`${block.type}-${block.id}`}
                      className={cn(
                        'flex flex-col text-left font-normal break-words lg:text-lg w-fit max-w-full',
                        blockPadding,
                        blockBg,
                        blockRadius
                      )}
                    >
                      {block.type === 'reply' && (
                        <div
                          onClick={(event) => {
                            event.stopPropagation();
                            onReplyClick(message.reply_to!);
                          }}
                          className={cn(
                            'flex flex-col cursor-pointer border-l-2 border-purple-400 bg-zinc-900/40 rounded-3xl p-1 px-1.5 text-sm hover:bg-zinc-800/50 max-w-full shadow active:scale-95 duration-300',
                            !isOwn && isTextMessage && !isStickerOnlyMessage && 'bg-zinc-800/50 hover:bg-zinc-700/50',
                          )}
                        >
                          <span className="font-semibold text-purple-300 text-xs">
                            {message.reply_author == currentUserId ? (lang?.you || 'Вы') : (foreignUser?.fname || (lang?.interlocutor || 'Собеседник'))}
                          </span>
                          <span className="text-zinc-200 truncate opacity-90 max-w-[200px] sm:max-w-xs -mt-1 text-xs">
                            {message.reply_type == 1
                              ? (lang?.image_sticker || 'Картинка/стикер')
                              : (getSevenTvStickerTokenData(message.reply_msg)
                                ? (lang?.image_sticker || 'Картинка/стикер')
                                : (message.reply_msg?.replace(/<[^>]*>?/gm, '') || (lang?.message || 'Сообщение')))
                            }
                          </span>
                        </div>
                      )}

                      {block.type === 'post' && (
                        <PostPreview
                          postId={block.id}
                          onLoadSuccess={() => {
                            setLoadedPosts((prev) => prev.includes(block.id) ? prev : [...prev, block.id]);
                          }}
                        />
                      )}

                      {block.type === 'track' && (
                        <TrackPreview
                          trackId={block.id}
                          onLoadSuccess={() => {
                            setLoadedTracks((prev) => prev.includes(block.id) ? prev : [...prev, block.id]);
                          }}
                        />
                      )}

                      {block.type === 'main' && (
                        <div id={`msg-body-${messageId}`} className="flex flex-col gap-2">
                          {!isOwn && senderName && (
                            <span className="text-[10px] -mb-2 font-bold text-purple-400 select-none">{senderName}</span>
                          )}
                          {messageImages.length ? (
                            <div
                              className={cn(
                                'flex flex-col gap-2',
                                messageImages.length > 1 && 'sm:grid sm:grid-cols-2',
                              )}
                            >
                              {messageImages.map((image, imageIndex) => (
                                !image.isViewerImage ? (
                                  <div
                                    key={getDialogImageKey(messageId, imageIndex)}
                                    className="overflow-hidden rounded-lg"
                                  >
                                    <img
                                      src={image.src}
                                      alt={image.alt || `Sticker ${imageIndex + 1}`}
                                      className="max-h-48 max-w-full rounded-lg object-contain shadow lg:max-h-64"
                                    />
                                  </div>
                                ) : (
                                  <button
                                    key={getDialogImageKey(messageId, imageIndex)}
                                    type="button"
                                    onClick={() => {
                                      onOpenImage(getDialogImageKey(messageId, imageIndex));
                                    }}
                                    className="cursor-pointer overflow-hidden rounded-lg duration-300 active:scale-95"
                                  >
                                    <img
                                      src={image.src}
                                      alt={image.alt || `Message image ${imageIndex + 1}`}
                                      className="max-h-48 max-w-full rounded-lg object-cover shadow lg:max-h-64"
                                    />
                                  </button>
                                )
                              ))}
                            </div>
                          ) : null}

                          {sevenTvStickerName ? (
                            <SevenTvStickerMessage stickerId={sevenTvStickerId} stickerName={sevenTvStickerName} />
                          ) : null}

                          {hasMessageText ? (
                            <span className="whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: messageBodyHtml }} />
                          ) : null}
                        </div>
                      )}

                      {isLast ? (
                        <div className={cn("mt-1 flex items-end justify-end gap-1", block.type !== 'main' && "px-1 pb-1")}>
                          <div className="flex flex-1 flex-wrap items-center gap-1">
                            {reactions.map((reaction, index) => {
                              const ownReaction = reaction.userId === String(currentUserId);
                              const avatar = ownReaction
                                ? normalizeAssetUrl(authUserImage, FALLBACK_AVATAR)
                                : normalizeAssetUrl(foreignUser?.img, FALLBACK_AVATAR);

                              return (
                                <button
                                  key={`${reaction.userId}:${reaction.emoji}:${index}`}
                                  type="button"
                                  onClick={() => {
                                    if (!ownReaction) return;
                                    onDeleteReaction(messageId, reaction.emoji);
                                  }}
                                  className={cn(
                                    'flex items-center justify-center rounded-full bg-zinc-700/80 shadow',
                                    ownReaction && 'cursor-pointer duration-300 hover:scale-110 hover:bg-zinc-600',
                                  )}
                                >
                                  <img
                                    src={avatar}
                                    alt=""
                                    className="h-5 w-5 rounded-full object-cover shadow"
                                  />
                                  <span className="px-1 text-sm text-zinc-200">{reaction.emoji}</span>
                                </button>
                              );
                            })}
                          </div>

                          {message.isSending ? (
                            <span className="select-none whitespace-nowrap text-[10px] flex items-center gap-1">
                              <Icon name="IC-loader" className="h-3 w-3 animate-spin fill-zinc-200" />
                            </span>
                          ) : (
                            <>
                              {timeLabel ? (
                                <span
                                  className={cn(
                                    'select-none whitespace-nowrap text-[10px]',
                                    isOwn ? 'text-zinc-300' : 'text-zinc-400',
                                  )}
                                >
                                  {timeLabel}
                                </span>
                              ) : null}

                              {isOwn ? (
                                <Icon
                                  name={getMessageStatusIconName(message.status)}
                                  className={cn(
                                    'h-3 w-3',
                                    String(message.status ?? '0') === '0' ? 'fill-zinc-200' : 'fill-zinc-200',
                                  )}
                                />
                              ) : null}
                            </>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
