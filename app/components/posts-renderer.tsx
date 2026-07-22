'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';

import ImageViewerModal, { type ImageViewerSlide } from './image-viewer-modal';
import { Dropdown, DropdownItem } from './navigation';
import { SvgIcon } from '../feed/editor-shared';
import YandexRtb from './yandex-rtb';
import Link from 'next/link';
import { DonateModal } from '../wallet/components/donate-modal';
import TrackPreview from '../messages/components/track-preview';
import PostWidgetPoll, { type PollWidgetData } from './post-widget-poll';
import PostWidgetQuote, { type QuoteWidgetData } from './post-widget-quote';
import ShareModal from './share-modal';
import { parsePostContentToHtml } from './post-parser';



type Id = string | number;
type VoteDirection = 'up' | 'down';
type UserVoteState = VoteDirection | null;

export interface PostAuthor {
  id: Id;
  img: string;
  name: string;
  slnk?: string | null;
  type: string;
  username?: string | null;
  verify?: boolean | number | string | null;
}

export type PostImage = ImageViewerSlide;

export type PostWidget =
  | PollWidgetData
  | QuoteWidgetData
  | { type: 'music'; track_id: number | string };

export interface PostData {
  author: PostAuthor;
  bookmarked_amount?: number | string | null;
  can_edit?: boolean | number | string | null;
  comments_count?: number | string | null;
  content?: string | null;
  id: Id;
  images?: PostImage[] | null;
  is_bookmarked?: boolean | number | string | null;
  is_long_content?: boolean | number | string | null;
  rating?: number | string | null;
  tags?: string | null;
  time_elapsed?: string | null;
  title?: string | null;
  user_vote_down?: string | null;
  user_vote_up?: string | null;
  widgets?: PostWidget[] | null;
  youtube_video_id?: string | null;
}


export interface PostCardLang {
  adultContentWarning: string;
  bookmarked: string;
  delete: string;
  edit: string;
  less: string;
  more: string;
  report: string;
  share: string;
  tobookmarks: string;
  translate: string;
}

export interface PostCardProps {
  currentUserId?: Id | null;
  hideComments?: boolean;
  lang?: Partial<PostCardLang>;
  noCollapse?: boolean;
  onBookmark?: (post: PostData, nextValue: boolean) => void;
  onComment?: (post: PostData) => void;
  onDelete?: (post: PostData) => void;
  onDonate?: (post: PostData) => void;
  onEdit?: (post: PostData) => void;
  onNavigate?: (href: string, post: PostData) => void;
  onReport?: (post: PostData) => void;
  onTranslate?: (post: PostData) => void;
  onVote?: (post: PostData, direction: VoteDirection) => void;
  post: PostData;
  renderIndex?: number;
  shareBaseUrl?: string;
}

export interface PostsRendererProps
  extends Omit<PostCardProps, 'post' | 'renderIndex'> {
  className?: string;
  posts: PostData[];
}

const DEFAULT_LANG: PostCardLang = {
  adultContentWarning: 'Изображение может содержать контент 18+',
  bookmarked: 'В закладках',
  delete: 'Удалить',
  edit: 'Редактировать',
  less: 'Свернуть',
  more: 'Показать больше',
  report: 'Пожаловаться',
  share: 'Поделиться',
  tobookmarks: 'В закладки',
  translate: 'Перевести',
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function flag(value: boolean | number | string | null | undefined) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function toNumber(value: number | string | null | undefined) {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function getInitialVote(post: PostData): UserVoteState {
  if (post.user_vote_up === 'voted') return 'up';
  if (post.user_vote_down === 'voted') return 'down';
  return null;
}

function isLegacyCallable(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

function callLegacy(name: string, ...args: unknown[]) {
  if (typeof window === 'undefined') return false;
  const maybeFn = (window as unknown as Record<string, unknown>)[name];
  if (!isLegacyCallable(maybeFn)) return false;
  maybeFn(...args);
  return true;
}

function getShareUrl(post: PostData, shareBaseUrl: string) {
  const normalized = shareBaseUrl.endsWith('/') ? shareBaseUrl : `${shareBaseUrl}/`;
  return `${normalized}${post.id}`;
}

function ImageTile({
  blur,
  className,
  image,
  onClick,
}: {
  blur?: boolean;
  className: string;
  image: PostImage;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        className,
        'cursor-pointer shadow bg-center bg-contain bg-no-repeat bg-zinc-800 shrink-0',
        blur && 'blur-lg',
      )}
      style={{ backgroundImage: `url(${image.url})` }}
      aria-label="Open image"
    />
  );
}

function ExpandablePostContent({
  content,
  postId,
  onClick,
  strings,
  initiallyOverflowing,
  noCollapse,
}: {
  content: string;
  postId: Id;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  strings: Record<string, string>;
  initiallyOverflowing?: boolean;
  noCollapse?: boolean;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  // Инициализация из бэкенда — благодаря этому SSR сразу рендерит сжатый пост
  const [isOverflowing, setIsOverflowing] = useState(initiallyOverflowing ?? false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    if (noCollapse) return;
    const el = contentRef.current;
    if (!el) return;

    const measure = () => {
      const fullHeight = el.scrollHeight;
      const MAX_HEIGHT = 260;
      setIsOverflowing(fullHeight > MAX_HEIGHT + 24);
    };

    measure();

    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [content, noCollapse]);

  useEffect(() => {
    if (!noCollapse) setAnimate(true);
  }, [noCollapse]);

  const parsedHtml = parsePostContentToHtml(content);

  if (noCollapse) {
    return (
      <div
        id={`textblock${postId}`}
        style={{ userSelect: 'text' }}
        className="-mx-3 px-3 w-[calc(100%+1.5rem)] text-base lg:text-lg text-zinc-200 font-medium break-words relative post-content-container my-1"
        dangerouslySetInnerHTML={{ __html: parsedHtml }}
        onClick={onClick}
      />
    );
  }

  return (
    <div className="relative flex flex-col w-full my-1">
      <div
        ref={contentRef}
        id={`textblock${postId}`}
        style={{
          maxHeight: !isExpanded && isOverflowing ? '260px' : '3000px',
          userSelect: 'text',
        }}
        className={cn(
          '-mx-3 px-3 -my-1 py-1 w-[calc(100%+1.5rem)] text-base lg:text-lg text-zinc-200 font-medium break-words overflow-hidden relative post-content-container',
          animate && 'transition-[max-height] duration-500 ease-in-out',
        )}
        dangerouslySetInnerHTML={{ __html: parsedHtml }}
        onClick={onClick}
      />

      {!isExpanded && isOverflowing && (
        <div className="absolute bottom-0 -left-3 -right-3 h-16 bg-gradient-to-t from-zinc-900 via-zinc-900/80 to-transparent pointer-events-none z-10" />
      )}

      {isOverflowing && (
        <button
          type="button"
          id={`moretext${postId}`}
          onClick={() => setIsExpanded((prev) => !prev)}
          className="text-center text-purple-400 hover:text-purple-300 font-semibold cursor-pointer duration-200 py-1.5 mt-1 z-20 flex items-center justify-center gap-1 self-center text-sm"
        >
          <span>{isExpanded ? strings.less : strings.more}</span>
          <SvgIcon
            className={cn('w-4 h-4 fill-current transition-transform duration-300', isExpanded && 'rotate-180')}
            id="IC-chevron-down"
          />
        </button>
      )}
    </div>
  );
}

export function PostCard({
  currentUserId,
  hideComments,
  lang,
  noCollapse,
  onBookmark,
  onComment,
  onDelete,
  onDonate,
  onEdit,
  onNavigate,
  onReport,
  onTranslate,
  onVote,
  post,
  renderIndex,
  shareBaseUrl,
}: PostCardProps) {
  const syncKey = [
    post.id,
    post.bookmarked_amount ?? '',
    post.can_edit ?? '',
    post.comments_count ?? '',
    post.is_bookmarked ?? '',
    post.is_long_content ?? '',
    post.rating ?? '',
    post.user_vote_down ?? '',
    post.user_vote_up ?? '',
  ].join(':');

  return (
    <PostCardInner
      key={syncKey}
      currentUserId={currentUserId}
      hideComments={hideComments}
      lang={lang}
      noCollapse={noCollapse}
      onBookmark={onBookmark}
      onComment={onComment}
      onDelete={onDelete}
      onDonate={onDonate}
      onEdit={onEdit}
      onNavigate={onNavigate}
      onReport={onReport}
      onTranslate={onTranslate}
      onVote={onVote}
      post={post}
      renderIndex={renderIndex}
      shareBaseUrl={shareBaseUrl}
    />
  );
}

function PostCardInner({
  currentUserId = null,
  hideComments = false,
  lang,
  onBookmark,
  onComment,
  onDelete,
  onDonate,
  onEdit,
  onNavigate,
  onReport,
  onTranslate,
  onVote,
  post,
  renderIndex = 1,
  shareBaseUrl = 'https://ancial.ru/feed/post',
  noCollapse = false,
}: PostCardProps) {
  const router = useRouter();
  const canEdit = flag(post.can_edit);
  const initialBookmarked = flag(post.is_bookmarked);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [bookmarkedAmount, setBookmarkedAmount] = useState(toNumber(post.bookmarked_amount));
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [rating, setRating] = useState(toNumber(post.rating));
  const [userVote, setUserVote] = useState<UserVoteState>(getInitialVote(post));
  const [closingImageIndex, setClosingImageIndex] = useState<number | null>(null);
  const closingImageTimerRef = useRef<number | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [customImages, setCustomImages] = useState<ImageViewerSlide[]>([]);


  const strings = { ...DEFAULT_LANG, ...lang };
  const images = post.images ?? [];
  const activeImages = customImages.length > 0 ? customImages : images;
  const hasBlurredImages = images.some((image) => flag(image.blur));
  const showAd = renderIndex === 6;
  const authorHref =
    post.author.type === 'user'
      ? `/@${post.author.username ?? ''}`
      : `/$${post.author.slnk ?? ''}`;
  const shareUrl = getShareUrl(post, shareBaseUrl);
  const isOwnUser = String(post.author.id) === String(currentUserId ?? '');
  const voteUpClass = userVote === 'up' ? 'fill-green-500 text-green-500' : '';
  const voteDownClass = userVote === 'down' ? 'fill-red-500 text-red-500' : '';

  function handleCloseImage() {
    if (selectedImageIndex !== null) {
      setClosingImageIndex(selectedImageIndex);
    }
    setSelectedImageIndex(null);

    if (closingImageTimerRef.current !== null) {
      window.clearTimeout(closingImageTimerRef.current);
    }

    closingImageTimerRef.current = window.setTimeout(() => {
      setClosingImageIndex(null);
      setCustomImages([]);
      closingImageTimerRef.current = null;
    }, 300);
  }

  useEffect(() => {
    if (selectedImageIndex === null) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (selectedImageIndex !== null) {
          setClosingImageIndex(selectedImageIndex);
        }
        setSelectedImageIndex(null);

        if (closingImageTimerRef.current !== null) {
          window.clearTimeout(closingImageTimerRef.current);
        }

        closingImageTimerRef.current = window.setTimeout(() => {
          setClosingImageIndex(null);
          setCustomImages([]);
          closingImageTimerRef.current = null;
        }, 300);
        return;
      }

      if (activeImages.length <= 1) return;
      if (event.key === 'ArrowRight') {
        setSelectedImageIndex((current) =>
          current === null ? 0 : (current + 1) % activeImages.length,
        );
      }
      if (event.key === 'ArrowLeft') {
        setSelectedImageIndex((current) =>
          current === null ? 0 : (current - 1 + activeImages.length) % activeImages.length,
        );
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeImages.length, selectedImageIndex]);

  useEffect(() => {
    return () => {
      if (closingImageTimerRef.current !== null) {
        window.clearTimeout(closingImageTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const postEl = document.getElementById(`postdiv${post.id}`);
    if (!postEl) return;

    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;
    let activeContainer: HTMLElement | null = null;
    let hasMoved = false;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const container = target.closest('.overflow-x-auto') as HTMLElement;
      if (!container || container.querySelector('table')) return;

      isDragging = true;
      activeContainer = container;
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
      hasMoved = false;

      container.style.scrollSnapType = 'none';
      container.style.scrollBehavior = 'auto';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !activeContainer) return;
      e.preventDefault();
      const x = e.pageX - activeContainer.offsetLeft;
      const walk = (x - startX) * 1.5;
      activeContainer.scrollLeft = scrollLeft - walk;
      if (Math.abs(walk) > 5) {
        hasMoved = true;
      }
    };

    const handleMouseUpOrLeave = (e: MouseEvent) => {
      if (!isDragging || !activeContainer) return;

      activeContainer.style.scrollSnapType = '';
      activeContainer.style.scrollBehavior = '';

      isDragging = false;
      activeContainer = null;
    };

    const handleClickCapture = (e: MouseEvent) => {
      if (hasMoved) {
        e.stopPropagation();
        e.preventDefault();
        hasMoved = false;
      }
    };

    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'img') {
        e.preventDefault();
      }
    };

    postEl.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUpOrLeave);
    postEl.addEventListener('click', handleClickCapture, true);
    postEl.addEventListener('dragstart', handleDragStart);

    return () => {
      postEl.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUpOrLeave);
      postEl.removeEventListener('click', handleClickCapture, true);
      postEl.removeEventListener('dragstart', handleDragStart);
    };
  }, [post.id]);

  const navigateTo = (href: string) => {
    onNavigate?.(href, post);
    if (onNavigate) return;
    if (callLegacy('topage', href)) return;
    router.push(href);
  };

  const handleVote = (direction: VoteDirection) => {
    if (onVote) {
      onVote(post, direction);
      return;
    }

    if (direction === 'up') {
      if (userVote === 'up') return;

      if (userVote === 'down') {
        setUserVote(null);
        setRating((current) => current + 1);
      } else {
        setUserVote('up');
        setRating((current) => current + 1);
      }
    } else {
      if (userVote === 'down') return;

      if (userVote === 'up') {
        setUserVote(null);
        setRating((current) => current - 1);
      } else {
        setUserVote('down');
        setRating((current) => current - 1);
      }
    }

    callLegacy('vote', String(post.id), direction);
  };

  const handleBookmark = () => {
    if (onBookmark) {
      onBookmark(post, !isBookmarked);
      return;
    }

    const nextValue = !isBookmarked;
    setIsBookmarked(nextValue);
    setBookmarkedAmount((current) => Math.max(0, current + (nextValue ? 1 : -1)));
    callLegacy('bookmark', post.id);
  };

  const handleDonate = () => {
    onDonate?.(post);
  };

  const handleEdit = () => {
    onEdit?.(post);
    if (onEdit) return;
    navigateTo(`/feed/edit?id=${post.id}`);
  };

  const handleDelete = () => {
    onDelete?.(post);
    if (!onDelete) {
      callLegacy('del_post_modal', post.id, post.author.id);
    }
  };

  const handleComment = () => {
    onComment?.(post);
    if (!onComment) {
      callLegacy('show_comments', post.id);
    }
  };

  const handleReport = () => {
    onReport?.(post);
    if (!onReport) {
      callLegacy('open_report_moda', post.id, 2);
    }
  };

  const handleShare = () => {
    setIsShareOpen(true);
  };

  const handleTranslate = () => {
    onTranslate?.(post);
    if (!onTranslate) {
      callLegacy('translatepost', post.id);
    }
  };

  const handleOpenImage = (index: number) => {
    if (closingImageTimerRef.current !== null) {
      window.clearTimeout(closingImageTimerRef.current);
      closingImageTimerRef.current = null;
    }
    setClosingImageIndex(null);
    setSelectedImageIndex(index);
  };

  const activeImageIndex = selectedImageIndex ?? closingImageIndex;
  const selectedImage = activeImageIndex === null ? null : activeImages[activeImageIndex];

  const handlePrevImage = () => {
    setSelectedImageIndex((current) =>
      current === null ? 0 : (current - 1 + activeImages.length) % activeImages.length,
    );
  };

  const handleNextImage = () => {
    setSelectedImageIndex((current) =>
      current === null ? 0 : (current + 1) % activeImages.length,
    );
  };

  const handlePostContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Telegram-style спойлер: клик снимает блюр
    const spoilerEl = target.closest('.ancial-spoiler') as HTMLElement | null;
    if (spoilerEl && !spoilerEl.classList.contains('revealed')) {
      spoilerEl.classList.add('revealed');
      return;
    }

    if (target.tagName.toLowerCase() === 'img') {
      const imgEl = target as HTMLImageElement;

      const isPostImage = (img: HTMLImageElement) => {
        const src = img.src || '';
        if (src.includes('betterttv.net') || src.includes('7tv.app') || src.includes('/api/7tv/')) {
          return false;
        }
        return img.classList.contains('object-cover') || img.classList.contains('object-contain');
      };

      if (!isPostImage(imgEl)) return;

      const container = document.getElementById(`textblock${post.id}`);
      if (container) {
        const allImgs = Array.from(container.getElementsByTagName('img')).filter(isPostImage);
        const clickedIndex = allImgs.indexOf(imgEl);
        if (clickedIndex !== -1) {
          const inlineSlides = allImgs.map(img => ({ url: img.src }));
          setCustomImages(inlineSlides);
          setSelectedImageIndex(clickedIndex);
        }
      }
    }
  };

  return (
    <>
      <div
        id={`postdiv${post.id}`}
        className="p-3 duration-300 rounded-3xl border border-zinc-600/30 bg-zinc-900 flex flex-col gap-3 w-full shadow text-zinc-100"
      >
        <div className="text-sm lg:text-base text-zinc-400 font-medium flex items-center gap-1.5">
          <Link
            href={authorHref}
            className="active:scale-95 duration-300 w-10 h-10 rounded-3xl shadow bg-cover bg-center cursor-pointer"
            style={{ backgroundImage: `url(${post.author.img})` }}
            aria-label={post.author.name}
          />

          <div className="flex flex-col">
            <Link
              href={authorHref}
              className="cursor-pointer text-zinc-200 hover:text-zinc-100 active:scale-95 duration-300 font-medium w-fit flex items-center gap-1.5 text-left"
            >
              <span>{post.author.name}</span>
              {flag(post.author.verify) && (
                <SvgIcon className="w-5 h-5 inline fill-blue-500" id="IC-verify" viewBox="0 0 48 48" />
              )}
            </Link>
            <span className="text-zinc-400 text-xs lg:text-sm">{post.time_elapsed}</span>
          </div>

          <div className="flex-grow">
            {post.author.type === 'user' && !isOwnUser && (
              <button
                type="button"
                onClick={handleDonate}
                className="cursor-pointer border border-zinc-600/30 flex items-center justify-center gap-3 px-2 py-1 duration-300 active:scale-95 bg-zinc-700 hover:bg-zinc-800 rounded-full shadow"
              >
                <SvgIcon className="h-7 w-7 fill-white" id="IC-donate" viewBox="0 0 48 48" />
              </button>
            )}
          </div>

          <Dropdown
            triggerSize="sm"
            triggerIcon="IC-more"
            triggerAriaLabel="Post actions"
            position="bottom"
            align="end"
            menuClassName="min-w-48 !mt-0 z-[90]"
          >
            {canEdit && (
              <DropdownItem onClick={handleEdit} icon="IC-edit">
                {strings.edit}
              </DropdownItem>
            )}
            {canEdit && (
              <DropdownItem onClick={handleDelete} icon="IC-times">
                {strings.delete}
              </DropdownItem>
            )}
            <DropdownItem
              onClick={handleBookmark}
              icon={isBookmarked ? 'IC-bookmark-filled' : 'IC-bookmark'}
              iconClassName={isBookmarked ? 'fill-amber-500' : undefined}
            >
              {isBookmarked ? strings.bookmarked : strings.tobookmarks}
            </DropdownItem>
            <DropdownItem onClick={handleReport} icon="IC-report">
              {strings.report}
            </DropdownItem>
            <DropdownItem onClick={handleShare} icon="IC-share">
              {strings.share}
            </DropdownItem>
            <DropdownItem onClick={handleTranslate} icon="IC-globe">
              {strings.translate}
            </DropdownItem>
          </Dropdown>
        </div>

        {post.title && (
          <div
            id={`titleblock${post.id}`}
            className="text-lg lg:text-xl text-zinc-100 font-bold"
            dangerouslySetInnerHTML={{ __html: post.title ?? '' }}
          />
        )}

        {post.content && (
          <ExpandablePostContent
            content={post.content}
            postId={post.id}
            onClick={handlePostContentClick}
            strings={strings}
            initiallyOverflowing={flag(post.is_long_content)}
            noCollapse={noCollapse}
          />
        )}

        {images.length > 0 && (
          <>
            {images.length === 1 && (
              <div>
                <ImageTile
                  image={images[0]}
                  blur={flag(images[0].blur)}
                  onClick={() => handleOpenImage(0)}
                  className="h-64 md:h-96 w-full rounded-3xl user-select-none focus:outline-none focus:ring-0 cursor-pointer active:scale-95 duration-300"
                />
              </div>
            )}

            {images.length >= 2 && (
              <div className="-mx-3">
                <div className="relative group/carousel">
                  {/* Left Arrow */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const container = e.currentTarget.parentElement?.querySelector('.overflow-x-auto');
                      if (container) {
                        container.scrollBy({ left: -container.clientWidth * 0.7, behavior: 'smooth' });
                      }
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full border border-zinc-600/30 bg-zinc-950/80 hover:bg-zinc-800 text-white shadow backdrop-blur-md opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 active:scale-95 cursor-pointer"
                  >
                    <SvgIcon className="w-6 h-6 fill-white" id="IC-chevron-left" />
                  </button>

                  {/* Right Arrow */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const container = e.currentTarget.parentElement?.querySelector('.overflow-x-auto');
                      if (container) {
                        container.scrollBy({ left: container.clientWidth * 0.7, behavior: 'smooth' });
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full border border-zinc-600/30 bg-zinc-950/80 hover:bg-zinc-800 text-white shadow backdrop-blur-md opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300 active:scale-95 cursor-pointer"
                  >
                    <SvgIcon className="w-6 h-6 fill-white" id="IC-chevron-right" />
                  </button>

                  <div className="absolute top-1.5 right-1.5 z-20 rounded-full border border-zinc-600/30 bg-zinc-950/80 px-3 py-1 text-xs font-semibold text-white shadow backdrop-blur-md">
                    <span className="flex items-center gap-1.5">
                      <SvgIcon className="w-4 h-4 fill-white" id="IC-photos" />
                      <span>{images.length}</span>
                    </span>
                  </div>

                  <div className="flex gap-3 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth scroll-pl-3 scroll-pr-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden before:block before:w-3 before:shrink-0 before:content-[''] after:block after:w-3 after:shrink-0 after:content-['']">
                    {images.map((image, index) => (
                      <div
                        key={`${post.id}-image-${index}`}
                        className="snap-start shrink-0 w-[84%] sm:w-[78%] lg:w-[68%] cursor-pointer active:scale-95 duration-300"
                      >
                        <ImageTile
                          image={image}
                          blur={flag(image.blur)}
                          onClick={() => handleOpenImage(index)}
                          className="h-64 md:h-96 w-full rounded-3xl user-select-none focus:outline-none focus:ring-0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {hasBlurredImages && (
              <div className="text-purple-400 bg-purple-500/25 rounded-3xl p-1.5 flex w-full text-xs lg:text-sm">
                {strings.adultContentWarning}
              </div>
            )}
          </>
        )}

        {post.youtube_video_id && (
          <iframe
            className="w-full h-48 sm:h-54 md:h-64 lg:h-96 rounded-3xl shadow"
            src={`https://www.youtube.com/embed/${post.youtube_video_id}`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        )}

        {post.widgets && post.widgets.length > 0 && (
          <div className="flex flex-col gap-3 w-full">
            {post.widgets.map((widget, i) => {
              if (widget.type === 'music') {
                return <TrackPreview key={`w-music-${i}`} trackId={widget.track_id} className="w-full !max-w-none bg-zinc-800/40 border-zinc-600/30" />;
              }
              if (widget.type === 'poll') {
                return (
                  <PostWidgetPoll
                    key={`w-poll-${i}`}
                    postId={Number(post.id)}
                    type="poll"
                    question={widget.question}
                    options={widget.options}
                    votes={widget.votes}
                    total_votes={widget.total_votes}
                    user_vote_option={widget.user_vote_option}
                  />
                );
              }
              if (widget.type === 'quote') {
                return (
                  <PostWidgetQuote
                    key={`w-quote-${i}`}
                    type="quote"
                    post_id={widget.post_id}
                    quote_data={widget.quote_data}
                  />
                );
              }
              return null;
            })}
          </div>
        )}

        <div className="text-base lg:text-lg text-zinc-400 font-medium flex items-center">
          <div className="flex-grow flex items-center fill-zinc-400">
            <button
              type="button"
              id={`vtu${post.id}`}
              onClick={() => handleVote('up')}
              className="inline-flex items-center duration-300 active:scale-95"
              aria-label="Vote up"
            >
              <SvgIcon
                className={cn(
                  'w-6 h-6 hover:fill-green-500 duration-300 cursor-pointer inline',
                  voteUpClass,
                )}
                id="IC-vote-up"
              />
            </button>
            <span className="mx-1" id={`rat${post.id}`}>{rating}</span>
            <button
              type="button"
              id={`vtd${post.id}`}
              onClick={() => handleVote('down')}
              className="inline-flex items-center duration-300 active:scale-95"
              aria-label="Vote down"
            >
              <SvgIcon
                className={cn(
                  'w-6 h-6 hover:fill-red-500 duration-300 cursor-pointer inline',
                  voteDownClass,
                )}
                id="IC-vote-down"
              />
            </button>

            {!hideComments && (
              <>
                <button
                  type="button"
                  onClick={handleComment}
                  className="ml-3 inline-flex items-center gap-1 duration-300 hover:fill-white hover:text-white active:scale-95"
                  aria-label="Comments"
                >
                  <SvgIcon className="w-6 h-6 cursor-pointer inline" id="IC-comments" />
                  {Number(post.comments_count) > 0 && (
                    <span>{post.comments_count}</span>
                  )}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleBookmark}
              className="ml-3 inline-flex items-center gap-1 active:scale-95 duration-300 hover:text-white"
              aria-label="Bookmark post"
            >
              <SvgIcon
                id={isBookmarked ? 'IC-bookmark-filled' : 'IC-bookmark'}
                className={cn(
                  'w-6 h-6 cursor-pointer inline duration-300',
                  isBookmarked
                    ? 'fill-amber-500 hover:fill-amber-600'
                    : 'fill-zinc-400 hover:fill-white',
                )}
              />
              {Number(post.bookmarked_amount) > 0 && (
                <span>{post.bookmarked_amount}</span>
              )}
            </button>

          </div>

          {post.tags && post.tags !== 'null' && post.tags !== '' && (
            <button
              type="button"
              onClick={() => navigateTo(`/feed/?topic=${post.tags}`)}
              className="bg-zinc-800/80 text-zinc-200 border border-zinc-600/30 rounded-3xl px-2 py-1 text-sm font-medium shadow duration-300 cursor-pointer active:scale-95 hover:bg-zinc-700"
            >
              {post.tags}
            </button>
          )}
        </div>
      </div>

      {showAd && (
        <div className="hidden w-full overflow-hidden max-h-64 lg:max-h-64 rounded-3xl">
          <YandexRtb blockId="R-A-3636730-10" className="w-full rounded-3xl min-h-24" />
        </div>
      )}

      {selectedImage && (
        <ImageViewerModal
          activeImageIndex={activeImageIndex}
          images={activeImages}
          isOpen={selectedImageIndex !== null}
          onClose={handleCloseImage}
          onPrev={handlePrevImage}
          onNext={handleNextImage}
        />
      )}

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        shareUrl={shareUrl}
        title={lang?.share || strings.share}
        copyLabel={lang?.share || strings.share}
        replyPostId={Number(post.id)}
        replyPostPreview={{
          authorName: post.author.name,
          authorImg: post.author.img,
          contentSnippet: (post.content ?? '').replace(/<[^>]*>/g, '').slice(0, 120),
          firstImage: images[0]?.url,
        }}
      />
    </>
  );
}

export default function PostsRenderer({
  className,
  currentUserId,
  hideComments,
  lang,
  onBookmark,
  onComment,
  onDelete,
  onDonate,
  onEdit,
  onNavigate,
  onReport,
  onTranslate,
  onVote,
  posts,

  shareBaseUrl,
}: PostsRendererProps) {
  const [donatePost, setDonatePost] = useState<PostData | null>(null);

  if (!posts.length) return null;

  const handleDonatePost = onDonate || ((post: PostData) => setDonatePost(post));

  return (
    <>
      <div className={cn('flex flex-col gap-3 w-full', className)}>
        {posts.map((post, index) => (
          <PostCard
            key={post.id}
            post={post}
            renderIndex={index + 1}
            currentUserId={currentUserId}
            hideComments={hideComments}
            lang={lang}
            onBookmark={onBookmark}
            onComment={onComment}
            onDelete={onDelete}
            onDonate={handleDonatePost}
            onEdit={onEdit}
            onNavigate={onNavigate}
            onReport={onReport}
            onTranslate={onTranslate}
            onVote={onVote}
            shareBaseUrl={shareBaseUrl}

          />
        ))}
      </div>

      <DonateModal
        isOpen={!!donatePost}
        onClose={() => setDonatePost(null)}
        recipientUsername={donatePost?.author.username || undefined}
        recipientName={donatePost?.author.name}
        recipientImg={donatePost?.author.img}
      />
    </>
  );
}

