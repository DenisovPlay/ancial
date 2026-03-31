'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import Modal from './modal';
import { Dropdown, DropdownItem } from './navigation';
import YandexRtb from './yandex-rtb';
import Link from 'next/link';

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

export interface PostImage {
  blur?: boolean | number | string | null;
  url: string;
}

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
  onBookmark?: (post: PostData, nextValue: boolean) => void;
  onComment?: (post: PostData) => void;
  onDelete?: (post: PostData) => void;
  onDonate?: (post: PostData) => void;
  onEdit?: (post: PostData) => void;
  onNavigate?: (href: string, post: PostData) => void;
  onReport?: (post: PostData) => void;
  onShare?: (url: string, post: PostData) => void;
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

function SvgIcon({
  className,
  id,
  viewBox = '0 0 48 48',
}: {
  className?: string;
  id: string;
  viewBox?: string;
}) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox={viewBox}>
      <use href={`/icons.svg#${id}`}></use>
    </svg>
  );
}

function VerifyIcon() {
  return (
    <svg
      className="w-5 h-5 inline fill-blue-500"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
    >
      <use href={`/icons.svg#IC-verify`}></use>
    </svg>
  );
}

function DonateIcon() {
  return (
    <svg className="h-7 w-7 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <use href={`/icons.svg#IC-donate`}></use>
    </svg>
  );
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

export function PostCard({
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
  onShare,
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
      onBookmark={onBookmark}
      onComment={onComment}
      onDelete={onDelete}
      onDonate={onDonate}
      onEdit={onEdit}
      onNavigate={onNavigate}
      onReport={onReport}
      onShare={onShare}
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
  onShare,
  onTranslate,
  onVote,
  post,
  renderIndex = 1,
  shareBaseUrl = 'https://ancial.ru/feed/post',
}: PostCardProps) {
  const router = useRouter();
  const isLongContent = flag(post.is_long_content);
  const canEdit = flag(post.can_edit);
  const initialBookmarked = flag(post.is_bookmarked);
  const [isExpanded, setIsExpanded] = useState(!isLongContent);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [bookmarkedAmount, setBookmarkedAmount] = useState(toNumber(post.bookmarked_amount));
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [rating, setRating] = useState(toNumber(post.rating));
  const [userVote, setUserVote] = useState<UserVoteState>(getInitialVote(post));
  const [closingImageIndex, setClosingImageIndex] = useState<number | null>(null);
  const closingImageTimerRef = useRef<number | null>(null);

  const strings = { ...DEFAULT_LANG, ...lang };
  const images = post.images ?? [];
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

  useEffect(() => {
    if (selectedImageIndex === null) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedImageIndex(null);
        return;
      }

      if (images.length <= 1) return;
      if (event.key === 'ArrowRight') {
        setSelectedImageIndex((current) =>
          current === null ? 0 : (current + 1) % images.length,
        );
      }
      if (event.key === 'ArrowLeft') {
        setSelectedImageIndex((current) =>
          current === null ? 0 : (current - 1 + images.length) % images.length,
        );
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [images.length, selectedImageIndex]);

  useEffect(() => {
    return () => {
      if (closingImageTimerRef.current !== null) {
        window.clearTimeout(closingImageTimerRef.current);
      }
    };
  }, []);

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
    if (!onDonate && post.author.username) {
      callLegacy('donateframe', 'vf', post.author.username);
    }
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

  const handleShare = async () => {
    onShare?.(shareUrl, post);
    if (onShare) return;
    if (callLegacy('share_modal', shareUrl)) return;

    try {
      if (navigator.share) {
        await navigator.share({ url: shareUrl });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch (error) {
      console.error('Share failed', error);
    }
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
  const selectedImage = activeImageIndex === null ? null : images[activeImageIndex];

  const handleCloseImage = () => {
    if (selectedImageIndex !== null) {
      setClosingImageIndex(selectedImageIndex);
    }
    setSelectedImageIndex(null);

    if (closingImageTimerRef.current !== null) {
      window.clearTimeout(closingImageTimerRef.current);
    }

    closingImageTimerRef.current = window.setTimeout(() => {
      setClosingImageIndex(null);
      closingImageTimerRef.current = null;
    }, 300);
  };

  const handlePrevImage = () => {
    setSelectedImageIndex((current) =>
      current === null ? 0 : (current - 1 + images.length) % images.length,
    );
  };

  const handleNextImage = () => {
    setSelectedImageIndex((current) =>
      current === null ? 0 : (current + 1) % images.length,
    );
  };

  return (
    <>
      <div
        id={`postdiv${post.id}`}
        className="p-3 duration-300 rounded-3xl border border-zinc-600/30 bg-zinc-900 flex flex-col w-full shadow text-zinc-100"
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
              {flag(post.author.verify) && <VerifyIcon />}
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
                <DonateIcon />
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

        <div
          id={`titleblock${post.id}`}
          className="text-lg lg:text-xl text-zinc-100 font-bold"
          dangerouslySetInnerHTML={{ __html: post.title ?? '' }}
        />

        <div
          id={`textblock${post.id}`}
          className={cn(
            'text-base lg:text-lg text-zinc-200 font-medium break-words',
            isLongContent && !isExpanded && 'hideTextBlock',
          )}
          style={{ userSelect: 'text' }}
          dangerouslySetInnerHTML={{ __html: post.content ?? '' }}
        />

        {isLongContent && (
          <button
            type="button"
            id={`moretext${post.id}`}
            onClick={() => setIsExpanded((current) => !current)}
            className="text-center text-zinc-300 hover:text-zinc-200 cursor-pointer duration-150 py-1.5"
          >
            {isExpanded ? strings.less : strings.more}
          </button>
        )}

        {images.length > 0 && (
          <>
            {images.length === 1 && (
              <div className="mb-3">
                <ImageTile
                  image={images[0]}
                  blur={flag(images[0].blur)}
                  onClick={() => handleOpenImage(0)}
                  className="h-64 md:h-96 w-full rounded-3xl user-select-none focus:outline-none focus:ring-0"
                />
              </div>
            )}

            {images.length >= 2 && (
              <div className="-mx-3 mb-3">
                <div className="relative">
                  <div className="absolute top-1.5 right-1.5 z-20 rounded-full border border-zinc-700/60 bg-zinc-950/80 px-3 py-1 text-xs font-semibold text-white shadow backdrop-blur-md">
                    <span className="flex items-center gap-1.5">
                      <SvgIcon className="w-4 h-4 fill-white" id="IC-photos" />
                      <span>{images.length}</span>
                    </span>
                  </div>

                  <div className="flex gap-3 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth scroll-pl-3 scroll-pr-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden before:block before:w-3 before:shrink-0 before:content-[''] after:block /after:w-3 after:shrink-0 after:content-['']">
                    {images.map((image, index) => (
                      <div
                        key={`${post.id}-image-${index}`}
                        className="snap-start shrink-0 w-[84%] sm:w-[78%] lg:w-[68%]"
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
            className="w-full h-48 sm:h-54 md:h-64 lg:h-96 rounded-3xl shadow mb-3"
            src={`https://www.youtube.com/embed/${post.youtube_video_id}`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
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
            <span id={`rat${post.id}`}>{rating}</span>
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
                  className="ml-3 inline-flex items-center gap-1 duration-300 hover:fill-white active:scale-95"
                  aria-label="Comments"
                >
                  <SvgIcon className="w-6 h-6 cursor-pointer inline" id="IC-comments" />
                  <span>{post.comments_count ?? 0}</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleBookmark}
              className="ml-3 inline-flex items-center gap-1 active:scale-95"
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
              <span id={`bookmarked_amount${post.id}`}>{bookmarkedAmount}</span>
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
        <Modal
          isOpen={selectedImageIndex !== null}
          onClose={handleCloseImage}
          showHeader={false}
          swipeable={false}
          unstyled
          width="full"
          align="center"
          animation="fade"
          overlayClassName="!bg-black/90 !backdrop-blur-sm p-3"
          panelClassName="!w-full !max-w-none h-full !max-h-full !overflow-hidden !bg-transparent !border-0 !shadow-none"
          bodyClassName="h-full p-0 !overflow-hidden"
        >
          <div
            className="relative flex items-center justify-center w-full h-full"
            onClick={handleCloseImage}
          >
            {images.length > 1 && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handlePrevImage();
                }}
                className="cursor-pointer hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 w-12 h-12 items-center justify-center rounded-full bg-zinc-900/70 border border-zinc-700 text-white hover:bg-zinc-800/90 duration-300 active:scale-95"
                aria-label="Previous image"
              >
                <SvgIcon className="w-7 h-7 fill-white" id="IC-chevron-left" />
              </button>
            )}

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleCloseImage();
              }}
              className="cursor-pointer absolute top-0 right-0 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-zinc-900/70 border border-zinc-700 text-white hover:bg-zinc-800/90 duration-300 active:scale-95"
              aria-label="Close image"
            >
              <SvgIcon className="w-6 h-6 fill-white" id="IC-times" />
            </button>

            <div
              className="max-w-6xl max-h-full w-full h-full flex flex-col items-center justify-center gap-3"
              onClick={(event) => event.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedImage.url}
                alt={`Post image ${(activeImageIndex ?? 0) + 1}`}
                className="max-w-full max-h-[80vh] object-contain rounded-3xl shadow-2xl"
              />
              {images.length > 1 && (
                <div className="text-sm text-zinc-300">
                  {(activeImageIndex ?? 0) + 1} / {images.length}
                </div>
              )}
            </div>

            {images.length > 1 && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleNextImage();
                }}
                className="cursor-pointer hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 w-12 h-12 items-center justify-center rounded-full bg-zinc-900/70 border border-zinc-700 text-white hover:bg-zinc-800/90 duration-300 active:scale-95"
                aria-label="Next image"
              >
                <SvgIcon className="w-7 h-7 fill-white" id="IC-chevron-right" />
              </button>
            )}
          </div>
        </Modal>
      )}
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
  onShare,
  onTranslate,
  onVote,
  posts,
  shareBaseUrl,
}: PostsRendererProps) {
  if (!posts.length) return null;

  return (
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
          onDonate={onDonate}
          onEdit={onEdit}
          onNavigate={onNavigate}
          onReport={onReport}
          onShare={onShare}
          onTranslate={onTranslate}
          onVote={onVote}
          shareBaseUrl={shareBaseUrl}
        />
      ))}
    </div>
  );
}
