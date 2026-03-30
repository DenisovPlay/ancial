'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import Modal from './modal';
import { Dropdown, DropdownItem } from './navigation';
import YandexRtb from './yandex-rtb';

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
      <path d="M 19.117188 5.0097656 C 17.966069 5.0248122 16.843416 5.649605 16.279297 6.7402344 L 14.910156 9.3867188 C 14.870216 9.4640098 14.795234 9.5079874 14.707031 9.5039062 L 11.730469 9.3671875 L 11.728516 9.3671875 C 9.8600154 9.2815038 8.2783586 10.861716 8.3652344 12.730469 L 8.5039062 15.707031 C 8.5080763 15.797231 8.4651861 15.871559 8.3867188 15.912109 L 5.7402344 17.279297 A 1.50015 1.50015 0 0 0 5.7382812 17.279297 C 4.0775961 18.139227 3.4980775 20.29937 4.5078125 21.875 L 6.1152344 24.382812 C 6.1632214 24.457712 6.1632214 24.544244 6.1152344 24.619141 L 4.5078125 27.126953 C 3.4985264 28.701883 4.0763699 30.863047 5.7382812 31.722656 A 1.50015 1.50015 0 0 0 5.7402344 31.722656 L 8.3867188 33.089844 C 8.4640098 33.129784 8.5079873 33.206719 8.5039062 33.294922 L 8.3652344 36.271484 C 8.2783274 38.140905 9.8610476 39.721672 11.730469 39.634766 L 14.707031 39.498047 C 14.797231 39.493847 14.869606 39.536767 14.910156 39.615234 L 16.279297 42.261719 A 1.50015 1.50015 0 0 0 16.279297 42.263672 C 17.139227 43.924354 19.297416 44.501922 20.873047 43.492188 L 23.382812 41.884766 C 23.457712 41.836776 23.542291 41.836776 23.617188 41.884766 L 26.126953 43.492188 C 27.701883 44.501474 29.861094 43.92363 30.720703 42.261719 L 32.089844 39.615234 C 32.129784 39.537944 32.204766 39.493966 32.292969 39.498047 L 35.271484 39.634766 C 37.140031 39.720446 38.721641 38.140237 38.634766 36.271484 L 38.496094 33.294922 C 38.491894 33.204722 38.534814 33.130394 38.613281 33.089844 L 41.259766 31.722656 A 1.50015 1.50015 0 0 0 41.261719 31.722656 C 42.922401 30.862726 43.501922 28.702584 42.492188 27.126953 L 40.884766 24.619141 C 40.836776 24.544241 40.836776 24.457709 40.884766 24.382812 L 42.492188 21.875 C 43.501474 20.30007 42.92363 18.138906 41.261719 17.279297 A 1.50015 1.50015 0 0 0 41.259766 17.279297 L 38.613281 15.912109 C 38.535991 15.872169 38.492013 15.795234 38.496094 15.707031 L 38.634766 12.730469 C 38.721636 10.861716 37.140031 9.2815038 35.271484 9.3671875 L 35.269531 9.3671875 L 32.292969 9.5039062 C 32.202769 9.5080763 32.130394 9.4651861 32.089844 9.3867188 L 30.720703 6.7402344 C 29.860773 5.0795523 27.702584 4.5000306 26.126953 5.5097656 L 23.617188 7.1171875 C 23.542288 7.1651745 23.45771 7.1651745 23.382812 7.1171875 L 20.873047 5.5097656 C 20.479314 5.2574441 20.048746 5.1027764 19.611328 5.0410156 C 19.447297 5.0178554 19.281633 5.0076161 19.117188 5.0097656 z M 19.076172 7.9941406 C 19.128876 7.9803047 19.189371 7.9937992 19.253906 8.0351562 L 21.763672 9.6425781 C 22.818775 10.318591 24.181225 10.318591 25.236328 9.6425781 L 27.746094 8.0351562 C 27.874463 7.9528913 27.986571 7.9838236 28.056641 8.1191406 L 29.423828 10.765625 C 29.999525 11.878386 31.180326 12.559763 32.431641 12.501953 L 35.410156 12.363281 C 35.562735 12.356181 35.643812 12.439221 35.636719 12.591797 L 35.5 15.568359 C 35.44208 16.820157 36.121619 18.000114 37.236328 18.576172 L 39.882812 19.945312 C 40.016877 20.015773 40.049034 20.127542 39.966797 20.255859 L 38.357422 22.763672 A 1.50015 1.50015 0 0 0 38.357422 22.765625 C 37.681409 23.820728 37.681409 25.181225 38.357422 26.236328 A 1.50015 1.50015 0 0 0 38.357422 26.238281 L 39.966797 28.746094 C 40.048587 28.873715 40.016122 28.98648 39.882812 29.056641 L 37.236328 30.425781 C 36.122795 31.001231 35.442167 32.181791 35.5 33.433594 L 35.636719 36.410156 C 35.643819 36.562735 35.562739 36.645765 35.410156 36.638672 L 32.431641 36.5 C 31.179843 36.44208 29.999886 37.123572 29.423828 38.238281 L 28.056641 40.884766 C 27.986251 41.020854 27.875164 41.049512 27.746094 40.966797 L 25.236328 39.359375 C 24.181225 38.683362 22.818775 38.683362 21.763672 39.359375 L 19.253906 40.966797 C 19.125537 41.049057 19.013429 41.018122 18.943359 40.882812 L 17.576172 38.238281 C 17.000722 37.124749 15.820162 36.442167 14.568359 36.5 L 11.589844 36.638672 C 11.437265 36.645772 11.356188 36.562732 11.363281 36.410156 L 11.5 33.433594 C 11.55792 32.181796 10.878381 31.001839 9.7636719 30.425781 L 7.1171875 29.056641 C 6.9831238 28.98618 6.9509714 28.874411 7.0332031 28.746094 L 8.6425781 26.238281 A 1.50015 1.50015 0 0 0 8.6425781 26.236328 C 9.3185911 25.181225 9.3185911 23.820728 8.6425781 22.765625 A 1.50015 1.50015 0 0 0 8.6425781 22.763672 L 7.0332031 20.255859 C 6.9514181 20.128238 6.9838705 20.015473 7.1171875 19.945312 L 9.7636719 18.576172 C 10.877205 18.000816 11.557833 16.820162 11.5 15.568359 L 11.363281 12.591797 C 11.356181 12.439218 11.437261 12.356188 11.589844 12.363281 L 14.568359 12.501953 C 15.819669 12.559853 16.999868 11.879561 17.576172 10.765625 L 17.576172 10.763672 L 18.943359 8.1171875 C 18.978554 8.0491432 19.023468 8.0079766 19.076172 7.9941406 z M 31.28125 17.988281 A 1.50015 1.50015 0 0 0 30.34375 18.289062 C 27.039034 20.710403 24.034498 23.748337 21.240234 27.203125 C 19.921503 25.633951 18.557285 24.247502 17.060547 23.251953 A 1.50015 1.50015 0 1 0 15.398438 25.748047 C 16.957756 26.785221 18.498201 28.340758 20.025391 30.394531 A 1.50015 1.50015 0 0 0 22.425781 30.404297 C 25.375009 26.507068 28.605658 23.283807 32.117188 20.710938 A 1.50015 1.50015 0 0 0 31.28125 17.988281 z"></path>
    </svg>
  );
}

function DonateIcon() {
  return (
    <svg className="h-7 w-7 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path d="M 21 4 C 11.628921 4 4 11.628928 4 21 C 4 29.771828 10.685821 37.015492 19.226562 37.90625 C 21.639573 41.572872 25.791887 44 30.5 44 C 37.937774 44 44 37.937774 44 30.5 C 44 25.791887 41.572872 21.639573 37.90625 19.226562 C 37.015493 10.685826 29.771834 4 21 4 z M 21 7 C 28.381545 7 34.389811 12.674554 34.945312 19.910156 A 1.50015 1.50015 0 0 0 34.96875 20.396484 C 34.977319 20.598242 35 20.79608 35 21 C 35 28.749755 28.74976 35 21 35 C 20.741973 35 20.490855 34.97462 20.236328 34.960938 A 1.50041 1.50041 0 0 0 20.109375 34.955078 C 12.779336 34.495435 7 28.448844 7 21 C 7 13.250245 13.25024 7 21 7 z M 18.5 13 A 1.50015 1.50015 0 0 0 17.029297 14.205078 L 16.029297 19.205078 A 1.50015 1.50015 0 0 0 17.5 21 L 21.5 21 C 22.898226 21 24 22.101774 24 23.5 C 24 24.236687 23.753857 24.806219 23.296875 25.238281 C 22.839893 25.670344 22.126022 26 21 26 C 18.595533 26 17.25 25.201172 17.25 25.201172 A 1.50015 1.50015 0 1 0 15.75 27.798828 C 15.75 27.798828 17.872467 29 21 29 C 22.748978 29 24.285107 28.433656 25.359375 27.417969 C 26.433643 26.402281 27 24.972313 27 23.5 C 27 20.480226 24.519774 18 21.5 18 L 19.330078 18 L 19.730469 16 L 24.5 16 A 1.50015 1.50015 0 1 0 24.5 13 L 18.5 13 z M 37.867188 23.029297 C 39.800129 24.928748 41 27.566493 41 30.5 C 41 36.316226 36.316226 41 30.5 41 C 27.566493 41 24.928748 39.800129 23.029297 37.867188 C 30.77895 36.938501 36.938501 30.778945 37.867188 23.029297 z"></path>
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
          <button
            type="button"
            onClick={() => navigateTo(authorHref)}
            className="active:scale-95 duration-300 w-10 h-10 rounded-3xl shadow bg-cover bg-center cursor-pointer"
            style={{ backgroundImage: `url(${post.author.img})` }}
            aria-label={post.author.name}
          />

          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => navigateTo(authorHref)}
              className="cursor-pointer text-zinc-200 hover:text-zinc-100 active:scale-95 duration-300 font-medium w-fit flex items-center gap-1.5 text-left"
            >
              <span>{post.author.name}</span>
              {flag(post.author.verify) && <VerifyIcon />}
            </button>
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
                  className="h-64 md:h-96 w-full rounded-3xl"
                />
              </div>
            )}

            {images.length >= 2 && (
              <div className="-mx-3 mb-3">
                <div className="relative">
                  <div className="absolute top-3 right-3 z-20 rounded-full border border-zinc-700/60 bg-zinc-950/80 px-3 py-1 text-xs font-semibold text-white shadow backdrop-blur-md">
                    <span className="flex items-center gap-1.5">
                      <SvgIcon className="w-4 h-4 fill-white" id="IC-photos" />
                      <span>{images.length}</span>
                    </span>
                  </div>

                  <div className="flex gap-3 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {images.map((image, index) => (
                      <div
                        key={`${post.id}-image-${index}`}
                        className="snap-start shrink-0 w-[84%] sm:w-[78%] lg:w-[68%]"
                      >
                        <ImageTile
                          image={image}
                          blur={flag(image.blur)}
                          onClick={() => handleOpenImage(index)}
                          className="h-64 md:h-96 w-full rounded-3xl"
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
        <div className="w-full overflow-hidden max-h-64 lg:max-h-64 rounded-3xl">
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
