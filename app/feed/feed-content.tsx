'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import Modal from '../components/modal';
import { Dropdown, DropdownItem } from '../components/navigation';
import PostsRenderer, {
  type PostCardLang,
  type PostData,
} from '../components/posts-renderer';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useDragScroll } from '../hooks/useDragScroll';
import FeedPostSkeleton from './feed-post-skeleton';

type Id = string | number;

interface FeedResponse {
  has_more?: boolean;
  last_id?: Id;
  posts?: PostData[];
}

interface FeedCommentUser {
  img: string;
  is_verified?: boolean | number | string | null;
  name: string;
  username: string;
}

interface FeedComment {
  content: string;
  date: string;
  id: Id;
  is_own_comment?: boolean | number | string | null;
  user: FeedCommentUser;
}

interface ReportTarget {
  id: Id;
  type: number;
}

interface TopicConfig {
  icon: string;
  label: string;
  value: string;
}

interface FeedCacheEntry {
  currentLastId: Id;
  hasMorePages: boolean;
  posts: PostData[];
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function flag(value: boolean | number | string | null | undefined) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function toNumber(value: number | string | null | undefined) {
  const nextValue = Number(value ?? 0);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

function getFeedCacheKey(
  topic: string | null,
  userId: string | null | undefined,
  isAuthenticated: boolean,
) {
  const scope = topic === null ? '__my__' : topic;
  const viewer = isAuthenticated ? `user-${userId ?? 'auth'}` : 'guest';
  return `feed_cache:${viewer}:${scope}`;
}

function readFeedCache(key: string): FeedCacheEntry | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = window.localStorage.getItem(key);
    if (!cached) return null;

    const parsed = JSON.parse(cached) as Partial<FeedCacheEntry>;
    if (!Array.isArray(parsed.posts)) return null;

    return {
      currentLastId: parsed.currentLastId ?? 0,
      hasMorePages: typeof parsed.hasMorePages === 'boolean' ? parsed.hasMorePages : true,
      posts: parsed.posts,
    };
  } catch (error) {
    console.error('Failed to read feed cache', error);
    return null;
  }
}

function writeFeedCache(key: string, value: FeedCacheEntry) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to write feed cache', error);
  }
}

async function apiJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    cache: 'no-store',
    credentials: 'include',
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

async function apiText(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    cache: 'no-store',
    credentials: 'include',
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.text();
}

function SvgIcon({
  className,
  id,
}: {
  className?: string;
  id: string;
}) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
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

function TopicButton({
  active,
  className,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  className?: string;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <div onClick={onClick} className={cn('w-max flex-none lg:flex-grow rounded-full', className)}>
      <div
        data-topic-active={active ? 'true' : 'false'}
        className={cn(
          'w-full relative flex rounded-full p-2 duration-300 cursor-pointer jusitfy-center items-center shadow gap-1.5 active:scale-95 border border-zinc-600/30',
          active
            ? 'bg-zinc-200 text-zinc-800 fill-zinc-800'
            : 'bg-zinc-900 hover:bg-zinc-200 text-zinc-200 hover:text-zinc-800 fill-zinc-200 hover:fill-zinc-800',
        )}
      >
        <SvgIcon className="w-8 h-8" id={icon} />
        <span className="text-lg font-bold">{label}</span>
      </div>
    </div>
  );
}

function MobileTopicCard({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-3xl bg-gradient-to-br from-zinc-800 to-zinc-700 duration-300 shadow active:scale-95 border border-zinc-600/30"
    >
      <div
        className={cn(
          'h-24 p-3 w-full flex items-center justify-start rounded-2xl duration-300 relative overflow-hidden',
          active ? 'bg-zinc-600' : 'bg-zinc-800/0 hover:bg-zinc-800',
        )}
      >
        <span className="text-2xl text-zinc-300 z-20">{label}</span>
        <SvgIcon className="w-16 h-16 opacity-50 absolute -bottom-3 -right-3 fill-white" id={icon} />
      </div>
    </button>
  );
}

function EmptyIllustration({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="border border-zinc-600/30 text-center w-full flex flex-col gap-0.5 justify-center items-center bg-zinc-900 text-zinc-100 rounded-3xl p-6">
      <Image
        src="/img/status/nothingfound.webp"
        alt="Nothing found"
        width={224}
        height={224}
        className="h-56 w-auto"
      />
      <span className="text-base text-zinc-200 w-full text-center font-black">{title}</span>
      <span className="text-sm text-zinc-400 w-full text-center font-medium">{description}</span>
    </div>
  );
}

function CommentsEmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="text-center w-full flex flex-col gap-0.5 justify-center items-center">
      <Image
        src="/img/status/nothingfound.webp"
        alt="No comments"
        width={224}
        height={224}
        className="h-56 w-auto"
      />
      <span className="text-base text-zinc-100 w-full text-center font-black">{title}</span>
      <span className="text-sm text-zinc-300 w-full text-center font-medium">{description}</span>
    </div>
  );
}

function FeedCommentCard({
  comment,
  deleteLabel,
  onDelete,
  onNavigateToUser,
  onReport,
  reportLabel,
}: {
  comment: FeedComment;
  deleteLabel: string;
  onDelete: (comment: FeedComment) => void;
  onNavigateToUser: (username: string) => void;
  onReport: (comment: FeedComment) => void;
  reportLabel: string;
}) {
  return (
    <div
      id={`comment${comment.id}`}
      className="p-3 border border-zinc-600/30 duration-300 rounded-3xl bg-zinc-800/50 flex flex-col w-full shadow"
    >
      <div className="text-sm lg:text-base text-zinc-200 font-medium flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onNavigateToUser(comment.user.username)}
          className="active:scale-95 duration-300 w-10 h-10 rounded-3xl shadow bg-cover bg-center"
          style={{ backgroundImage: `url('${comment.user.img}')` }}
          aria-label={comment.user.name}
        />

        <div className="flex flex-col flex-grow">
          <button
            type="button"
            onClick={() => onNavigateToUser(comment.user.username)}
            className="cursor-pointer hover:text-zinc-100 duration-300 font-meduim w-fit text-left flex items-center gap-1.5"
          >
            <span>{comment.user.name}</span>
            {flag(comment.user.is_verified) && <VerifyIcon />}
          </button>
          <span className="text-zinc-300 text-xs">{comment.date}</span>
        </div>

        <Dropdown
          triggerSize="sm"
          triggerIcon="IC-more"
          triggerAriaLabel="Comment actions"
          position="left"
          align="start"
          triggerClassName="hover:bg-zinc-800/50"
          menuClassName="-mt-8 min-w-44 rounded-2xl"
        >
          {flag(comment.is_own_comment) && (
            <DropdownItem
              onClick={() => onDelete(comment)}
              icon="IC-times"
              className="p-1 text-sm"
              iconClassName="w-5 h-5"
            >
              {deleteLabel}
            </DropdownItem>
          )}
          <DropdownItem
            onClick={() => onReport(comment)}
            icon="IC-report"
            className="p-1 text-sm"
            iconClassName="w-5 h-5"
          >
            {reportLabel}
          </DropdownItem>
        </Dropdown>
      </div>

      <div className="text-base lg:text-lg text-zinc-200 font-medium">{comment.content}</div>
    </div>
  );
}

export default function FeedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { showNote } = useNotification();

  const topic = searchParams.get('topic');
  const topicButtonsRef = useDragScroll({ speed: 2 });
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const loadPostsRef = useRef<
    (
      lastId: Id,
      append?: boolean,
      options?: {
        preserveExisting?: boolean;
      },
    ) => Promise<void>
  >(async () => {});
  const requestCounterRef = useRef(0);
  const currentLastIdRef = useRef<Id>(0);
  const hasMorePagesRef = useRef(true);
  const isBusyRef = useRef(false);
  const activeTopicRef = useRef<string | null>(topic);

  const [posts, setPosts] = useState<PostData[]>([]);
  const [currentLastId, setCurrentLastId] = useState<Id>(0);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [isTopicsModalOpen, setIsTopicsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [shareUrl, setShareUrl] = useState('');
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [activeCommentsPost, setActiveCommentsPost] = useState<PostData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PostData | null>(null);

  useEffect(() => {
    currentLastIdRef.current = currentLastId;
  }, [currentLastId]);

  useEffect(() => {
    hasMorePagesRef.current = hasMorePages;
  }, [hasMorePages]);

  useEffect(() => {
    isBusyRef.current = isInitialLoading || isLoadingMore;
  }, [isInitialLoading, isLoadingMore]);

  useEffect(() => {
    activeTopicRef.current = topic;
  }, [topic]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const strings = useMemo(() => {
    const fallback = {
      all: 'Все',
      bookmarkadded: 'Добавлено в закладки',
      bookmarked: 'В закладках',
      bookmarkremoved: 'Удалено из закладок',
      bookmarks: 'Закладки',
      candidimage: 'Откровенное изображение',
      copylink: 'Скопировать ссылку',
      delete: 'Удалить',
      deletepost: 'Удалить пост',
      emptycomments: 'Комментариев пока нет',
      emptycommentsdesc: 'Будьте первым, кто что-то напишет.',
      feed: 'Лента',
      films: 'Фильмы',
      food: 'Еда',
      games: 'Игры',
      humor: 'Юмор',
      investment: 'Инвестиции',
      it: 'IT',
      langname: 'en',
      less: 'Скрыть',
      linkcopied: 'Ссылка скопирована',
      logintoreact: 'Войдите, чтобы взаимодействовать с публикациями',
      more: 'Подробнее',
      music: 'Музыка',
      my: 'Моё',
      nomoreposts: 'Больше постов нет',
      noposts: 'Постов пока нет',
      nopostsdesc: 'Попробуйте выбрать другой топик или зайдите позже.',
      no: 'Нет',
      photo: 'Фото',
      post: 'Пост',
      postcomments: 'Комментарии',
      prohibitedgood: 'Запрещённый товар',
      propertyrights: 'Нарушение интеллектуальных прав',
      reallywantdeletepost: 'Вы действительно хотите удалить пост?',
      report: 'Пожаловаться',
      scam: 'Обман',
      science: 'Наука',
      share: 'Поделиться',
      somethingwrong: 'Что-то пошло не так',
      spam: 'Спам',
      sport: 'Спорт',
      tbookmark: 'В закладки',
      tourism: 'Туризм',
      violence: 'Насилие и вражда',
      writecomment: 'Напишите комментарий',
      yes: 'Да',
      news: 'Новости',
    };

    return {
      all: lang?.all || fallback.all,
      bookmarkadded: lang?.bookmarkadded || fallback.bookmarkadded,
      bookmarked: lang?.bookmarked || fallback.bookmarked,
      bookmarkremoved: lang?.bookmarkremoved || fallback.bookmarkremoved,
      bookmarks: lang?.bookmarks || fallback.bookmarks,
      candidimage: lang?.candidimage || fallback.candidimage,
      copylink: lang?.copylink || fallback.copylink,
      delete: lang?.delete || fallback.delete,
      deletepost: lang?.deletepost || fallback.deletepost,
      emptycomments: lang?.emptycomments || fallback.emptycomments,
      emptycommentsdesc: lang?.emptycommentsdesc || fallback.emptycommentsdesc,
      feed: lang?.feed || fallback.feed,
      films: lang?.films || fallback.films,
      food: lang?.food || fallback.food,
      games: lang?.games || fallback.games,
      humor: lang?.humor || fallback.humor,
      investment: lang?.investment || fallback.investment,
      it: lang?.it || fallback.it,
      langname: lang?.langname || fallback.langname,
      less: lang?.less || fallback.less,
      linkcopied: lang?.linkcopied || fallback.linkcopied,
      logintoreact: lang?.logintoreact || fallback.logintoreact,
      more: lang?.more || fallback.more,
      music: lang?.music || fallback.music,
      my: lang?.my || fallback.my,
      news: lang?.news || fallback.news,
      no: lang?.no || fallback.no,
      nomoreposts: lang?.nomoreposts || fallback.nomoreposts,
      noposts: lang?.noposts || fallback.noposts,
      nopostsdesc: lang?.nopostsdesc || fallback.nopostsdesc,
      photo: lang?.photo || fallback.photo,
      post: lang?.post || fallback.post,
      postcomments: lang?.postcomments || fallback.postcomments,
      prohibitedgood: lang?.prohibitedgood || fallback.prohibitedgood,
      propertyrights: lang?.propertyrights || fallback.propertyrights,
      reallywantdeletepost: lang?.reallywantdeletepost || fallback.reallywantdeletepost,
      report: lang?.report || fallback.report,
      scam: lang?.scam || fallback.scam,
      science: lang?.science || fallback.science,
      share: lang?.share || fallback.share,
      somethingwrong: lang?.somethingwrong || fallback.somethingwrong,
      spam: lang?.spam || fallback.spam,
      sport: lang?.sport || fallback.sport,
      tbookmark: lang?.tobookmarks || fallback.tbookmark,
      tourism: lang?.tourism || fallback.tourism,
      violence: lang?.violence || fallback.violence,
      writecomment: lang?.writecomment || fallback.writecomment,
      yes: lang?.yes || fallback.yes,
    };
  }, [lang]);

  const postCardLang: Partial<PostCardLang> = {
    adultContentWarning:
      lang?.adult_content_warning || 'Изображение может содержать контент 18+',
    bookmarked: strings.bookmarked,
    delete: strings.delete,
    edit: lang?.edit || 'Редактировать',
    less: strings.less,
    more: strings.more,
    report: strings.report,
    share: strings.share,
    tobookmarks: strings.tbookmark,
    translate: lang?.translate || 'Перевести',
  };

  const topicOptions: TopicConfig[] = [
    { value: strings.it, label: strings.it, icon: 'IC-it' },
    { value: strings.investment, label: strings.investment, icon: 'IC-invest' },
    { value: strings.games, label: strings.games, icon: 'IC-games' },
    { value: strings.news, label: strings.news, icon: 'IC-news' },
    { value: strings.photo, label: strings.photo, icon: 'IC-photos' },
    { value: strings.music, label: strings.music, icon: 'IC-music' },
    { value: strings.films, label: strings.films, icon: 'IC-cinema' },
    { value: strings.humor, label: strings.humor, icon: 'IC-humor' },
    { value: strings.science, label: strings.science, icon: 'IC-science' },
    { value: strings.tourism, label: strings.tourism, icon: 'IC-tour' },
    { value: strings.sport, label: strings.sport, icon: 'IC-sport' },
    { value: strings.food, label: strings.food, icon: 'IC-food' },
  ];

  const openTopic = (nextTopic: string | null) => {
    if (nextTopic === null) {
      router.push('/feed');
      return;
    }

    router.push(`/feed?topic=${encodeURIComponent(nextTopic)}`);
  };

  const applyVoteState = (post: PostData, direction: 'up' | 'down') => {
    setPosts((currentPosts) =>
      currentPosts.map((currentPost) => {
        if (String(currentPost.id) !== String(post.id)) {
          return currentPost;
        }

        const currentVote =
          currentPost.user_vote_up === 'voted'
            ? 'up'
            : currentPost.user_vote_down === 'voted'
              ? 'down'
              : null;

        if (direction === 'up') {
          if (currentVote === 'up') {
            return currentPost;
          }

          if (currentVote === 'down') {
            return {
              ...currentPost,
              rating: toNumber(currentPost.rating) + 1,
              user_vote_down: null,
              user_vote_up: null,
            };
          }

          return {
            ...currentPost,
            rating: toNumber(currentPost.rating) + 1,
            user_vote_down: null,
            user_vote_up: 'voted',
          };
        }

        if (currentVote === 'down') {
          return currentPost;
        }

        if (currentVote === 'up') {
          return {
            ...currentPost,
            rating: toNumber(currentPost.rating) - 1,
            user_vote_down: null,
            user_vote_up: null,
          };
        }

        return {
          ...currentPost,
          rating: toNumber(currentPost.rating) - 1,
          user_vote_down: 'voted',
          user_vote_up: null,
        };
      }),
    );
  };

  const incrementCommentsCount = (postId: Id, delta: number) => {
    setPosts((currentPosts) =>
      currentPosts.map((currentPost) =>
        String(currentPost.id) === String(postId)
          ? {
              ...currentPost,
              comments_count: Math.max(
                0,
                toNumber(currentPost.comments_count) + delta,
              ),
            }
          : currentPost,
      ),
    );
  };

  const translatePost = async (post: PostData) => {
    const htmlToText = (value: string | null | undefined) => {
      const container = document.createElement('div');
      container.innerHTML = value ?? '';
      return container.textContent || container.innerText || '';
    };

    const translateText = async (sourceText: string) => {
      const url =
        'https://translate.googleapis.com/translate_a/single?client=gtx' +
        `&sl=auto&tl=${encodeURIComponent(strings.langname)}&dt=t&q=${encodeURIComponent(sourceText)}`;

      const response = await fetch(url, { cache: 'no-store' });
      const data = (await response.json()) as unknown[];

      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translatedText = (data[0] as Array<[string]>)
          .map((item) => item?.[0])
          .filter(Boolean)
          .join('');

        return translatedText || sourceText;
      }

      return sourceText;
    };

    try {
      const [translatedTitle, translatedContent] = await Promise.all([
        translateText(htmlToText(post.title)),
        translateText(htmlToText(post.content)),
      ]);

      setPosts((currentPosts) =>
        currentPosts.map((currentPost) =>
          String(currentPost.id) === String(post.id)
            ? {
                ...currentPost,
                title: translatedTitle,
                content: translatedContent,
              }
            : currentPost,
        ),
      );
    } catch (error) {
      console.error('Translate failed', error);
    }
  };

  const loadComments = async (postId: Id) => {
    setIsCommentsLoading(true);

    try {
      const nextComments = await apiJson<FeedComment[]>(
        `/api/posts/comments.php?id=${postId}`,
      );
      setComments(Array.isArray(nextComments) ? nextComments : []);
    } catch (error) {
      console.error('Failed to load comments', error);
      setComments([]);
      showNote({
        content: strings.somethingwrong,
        type: 'error',
        time: 5,
      });
    } finally {
      setIsCommentsLoading(false);
    }
  };

  const loadPosts = async (
    lastId: Id,
    append = false,
    options?: {
      preserveExisting?: boolean;
    },
  ) => {
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    const requestedTopic = topic;
    const cacheKey = getFeedCacheKey(requestedTopic, user?.id, isAuthenticated);
    const nextRequestId = ++requestCounterRef.current;

    setErrorMessage('');
    if (append) {
      setIsLoadingMore(true);
    } else {
      const preserveExisting = options?.preserveExisting ?? false;

      setIsInitialLoading(!preserveExisting);
      if (!preserveExisting) {
        setPosts([]);
        setHasMorePages(true);
        setCurrentLastId(0);
        currentLastIdRef.current = 0;
        hasMorePagesRef.current = true;
      }
    }

    try {
      const response = await apiJson<FeedResponse>(
        `/api/posts/feed.php?last_id=${lastId}&topic=${encodeURIComponent(
          requestedTopic ?? 'null',
        )}&_r=${nextRequestId}`,
        { signal: controller.signal },
      );

      if (controller.signal.aborted || requestedTopic !== activeTopicRef.current) {
        return;
      }

      const nextPosts = Array.isArray(response.posts) ? response.posts : [];

      if (nextPosts.length > 0) {
        const nextLastId = response.last_id ?? lastId;

        const nextHasMorePages = Boolean(response.has_more);
        setPosts((currentPosts) => {
          const resolvedPosts = append ? [...currentPosts, ...nextPosts] : nextPosts;
          writeFeedCache(cacheKey, {
            currentLastId: nextLastId,
            hasMorePages: nextHasMorePages,
            posts: resolvedPosts,
          });
          return resolvedPosts;
        });
        setCurrentLastId(nextLastId);
        currentLastIdRef.current = nextLastId;
        setHasMorePages(nextHasMorePages);
        hasMorePagesRef.current = nextHasMorePages;
      } else {
        if (!append) {
          setPosts([]);
          writeFeedCache(cacheKey, {
            currentLastId: 0,
            hasMorePages: false,
            posts: [],
          });
        }

        setHasMorePages(false);
        hasMorePagesRef.current = false;
      }
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        return;
      }

      console.error('Failed to load feed', error);
      if (!append) {
        setErrorMessage(strings.somethingwrong);
      }
    } finally {
      if (!controller.signal.aborted && requestedTopic === activeTopicRef.current) {
        setIsInitialLoading(false);
        setIsLoadingMore(false);
      }
    }
  };

  loadPostsRef.current = loadPosts;

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated && topic === null) {
      const timer = window.setTimeout(() => {
        router.replace('/feed?topic=all');
      }, 500);

      return () => window.clearTimeout(timer);
    }

    window.scrollTo({ top: 0, behavior: 'auto' });

    const cacheKey = getFeedCacheKey(topic, user?.id, isAuthenticated);
    const cached = readFeedCache(cacheKey);

    if (cached) {
      setErrorMessage('');
      setPosts(cached.posts);
      setCurrentLastId(cached.currentLastId);
      setHasMorePages(cached.hasMorePages);
      currentLastIdRef.current = cached.currentLastId;
      hasMorePagesRef.current = cached.hasMorePages;
      setIsInitialLoading(false);
      void loadPostsRef.current(0, false, { preserveExisting: true });
      return;
    }

    void loadPostsRef.current(0);
  }, [authLoading, isAuthenticated, router, topic, user?.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const container = topicButtonsRef.current;
      const activeButton = container?.querySelector<HTMLElement>('[data-topic-active="true"]');

      if (!container || !activeButton) return;

      const scrollLeft =
        activeButton.offsetLeft - container.offsetWidth / 2 + activeButton.offsetWidth / 2;

      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth',
      });
    }, 100);

    return () => window.clearTimeout(timer);
  }, [isAuthenticated, lang, topic]);

  useEffect(() => {
    const indicator = loadMoreRef.current;
    if (!indicator) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!hasMorePagesRef.current || isBusyRef.current) return;

        void loadPostsRef.current(currentLastIdRef.current, true);
      },
      { rootMargin: '0px 0px 20% 0px' },
    );

    observer.observe(indicator);

    return () => observer.disconnect();
  }, [posts.length, topic]);

  const handleBookmark = async (post: PostData, nextValue: boolean) => {
    try {
      const response = await apiText(`/api/posts/bookmarks.php?pid=${post.id}`);

      showNote({
        content: response,
        html: true,
        type: 'success',
        time: 5,
      });

      setPosts((currentPosts) =>
        currentPosts.map((currentPost) => {
          if (String(currentPost.id) !== String(post.id)) {
            return currentPost;
          }

          const isAdded = response === strings.bookmarkadded;
          const isRemoved = response === strings.bookmarkremoved;
          const nextBookmarked = isAdded ? true : isRemoved ? false : nextValue;
          const currentAmount = toNumber(currentPost.bookmarked_amount);

          return {
            ...currentPost,
            is_bookmarked: nextBookmarked,
            bookmarked_amount: Math.max(
              0,
              isAdded
                ? currentAmount + 1
                : isRemoved
                  ? currentAmount - 1
                  : currentAmount + (nextBookmarked ? 1 : -1),
            ),
          };
        }),
      );
    } catch (error) {
      console.error('Bookmark failed', error);
      showNote({
        content: strings.somethingwrong,
        type: 'error',
        time: 5,
      });
    }
  };

  const handleVote = async (post: PostData, direction: 'up' | 'down') => {
    try {
      const response = await apiText(
        `/api/posts/vote.php?pid=${post.id}&vt=${direction}`,
      );

      if (response === 'nlog') {
        showNote({
          content: strings.logintoreact,
          type: 'success',
          time: 5,
        });
        return;
      }

      applyVoteState(post, direction);
    } catch (error) {
      console.error('Vote failed', error);
      showNote({
        content: strings.somethingwrong,
        type: 'error',
        time: 5,
      });
    }
  };

  const openShareModal = (url: string) => {
    setShareUrl(url);
    setIsShareModalOpen(true);
  };

  const openReportModal = (id: Id, type: number) => {
    setReportTarget({ id, type });
    setIsReportModalOpen(true);
  };

  const openCommentsModal = (post: PostData) => {
    setActiveCommentsPost(post);
    setComments([]);
    setCommentInput('');
    setIsCommentsModalOpen(true);
    void loadComments(post.id);
  };

  const handleCreateComment = async () => {
    if (!activeCommentsPost) return;
    if (!commentInput.trim()) return;

    try {
      await apiText(`/api/posts/createcomment.php?pid=${activeCommentsPost.id}`, {
        body: new URLSearchParams({ content: commentInput.trim() }).toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      });

      setCommentInput('');
      incrementCommentsCount(activeCommentsPost.id, 1);
      await loadComments(activeCommentsPost.id);
    } catch (error) {
      console.error('Create comment failed', error);
      showNote({
        content: strings.somethingwrong,
        type: 'error',
        time: 5,
      });
    }
  };

  const handleDeleteComment = async (comment: FeedComment) => {
    try {
      const response = await apiText(`/api/posts/deletecomment.php?id=${comment.id}`);

      showNote({
        content: response,
        html: true,
        type: 'success',
        time: 5,
      });

      setComments((currentComments) =>
        currentComments.filter((currentComment) => String(currentComment.id) !== String(comment.id)),
      );

      if (activeCommentsPost) {
        incrementCommentsCount(activeCommentsPost.id, -1);
      }
    } catch (error) {
      console.error('Delete comment failed', error);
      showNote({
        content: strings.somethingwrong,
        type: 'error',
        time: 5,
      });
    }
  };

  const handleReport = async (reason: string) => {
    if (!reportTarget) return;

    const currentTarget = reportTarget;
    setIsReportModalOpen(false);

    try {
      const response = await apiText(
        `/api/posts/report.php?id=${currentTarget.id}&type=${currentTarget.type}&comment=${encodeURIComponent(reason)}`,
      );

      showNote({
        content: response,
        html: true,
        type: 'success',
        time: 5,
      });
    } catch (error) {
      console.error('Report failed', error);
      showNote({
        content: strings.somethingwrong,
        type: 'error',
        time: 5,
      });
    }
  };

  const handleDeletePost = async () => {
    if (!deleteTarget) return;

    const currentTarget = deleteTarget;
    setIsDeleteModalOpen(false);

    try {
      const response = await apiText(
        `/api/posts/delete.php?pid=${currentTarget.id}&gid=${currentTarget.author.id}`,
      );

      showNote({
        content: response,
        html: true,
        type: 'success',
        time: 5,
      });

      setPosts((currentPosts) =>
        currentPosts.filter((currentPost) => String(currentPost.id) !== String(currentTarget.id)),
      );
    } catch (error) {
      console.error('Delete post failed', error);
      showNote({
        content: 'Произошла ошибка',
        type: 'error',
        time: 10,
      });
    }
  };

  const handleShareTo = (service: 'vk' | 'tg' | 'x') => {
    if (!shareUrl) return;

    if (service === 'vk') {
      window.open(
        `https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}`,
        'Поделиться',
        'width=800, height=600',
      );
      return;
    }

    if (service === 'tg') {
      window.open(
        `https://telegram.me/share/url?url=${encodeURIComponent(shareUrl)}`,
        'Поделиться',
        'width=800, height=600',
      );
      return;
    }

    window.open(
      `http://twitter.com/share?url=${encodeURIComponent(shareUrl)}`,
      'Поделиться',
      'width=800, height=600',
    );
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      showNote({
        content: strings.linkcopied,
        type: 'success',
        time: 5,
      });
    } catch (error) {
      console.error('Copy link failed', error);
      showNote({
        content: strings.somethingwrong,
        type: 'error',
        time: 5,
      });
    }
  };

  return (
    <div className="flex flex-col jusitify-center items-center gap-3">
      <div className="max-w-3xl w-full items-center gap-1.5 flex pt-3 px-3 md:px-0 -mb-3 z-[30]">
        <span className="text-3xl font-extralight">{strings.feed}</span>

        {topic && topic !== 'all' && topic !== 'bookmarked' && (
          <div className="relative flex items-center justify-center">
            <span className="text-sm font-thin bg-purple-500 rounded-2xl px-2 py-1 text-white z-[99]">
              {topic}
            </span>
            <span className="absolute inset-0 blur-lg text-sm font-thin bg-purple-500 rounded-2xl px-2 py-1 text-white animate-pulse -z-[1]">
              {topic}
            </span>
          </div>
        )}

        {topic === 'bookmarked' && (
          <div className="relative flex items-center justify-center">
            <span className="text-sm font-thin bg-purple-500 rounded-2xl px-2 py-1 text-white z-[99]">
              {strings.bookmarks}
            </span>
            <span className="absolute inset-0 blur-lg text-sm font-thin bg-purple-500 rounded-2xl px-2 py-1 text-white animate-pulse -z-[1]">
              {strings.bookmarks}
            </span>
          </div>
        )}

        {isAuthenticated && (
          <>
            <div className="flex flex-grow"></div>
            <button
              type="button"
              onClick={() => openTopic('bookmarked')}
              className={cn(
                'cursor-pointer group flex items-center justify-center w-8 h-8 rounded-full active:scale-95 duration-300',
                topic === 'bookmarked'
                  ? 'bg-purple-500 hover:bg-purple-600'
                  : 'hover:bg-zinc-700/50',
              )}
            >
              <SvgIcon
                className={cn('h-6 w-6 fill-white group-hover:fill-zinc-300 duration-300', topic === 'bookmarked' && 'hidden')}
                id="IC-bookmark"
              />
              <SvgIcon
                className={cn('h-6 w-6 fill-white group-hover:fill-zinc-300 duration-300', topic !== 'bookmarked' && 'hidden')}
                id="IC-bookmark-filled"
              />
            </button>
          </>
        )}
      </div>

      <div className="max-w-3xl w-full flex items-center justify-center sticky top-0 bg-gradient-to-b from-black via-black/90 to-transparent z-[25]">
        <div
          id="topic-buttons"
          ref={topicButtonsRef}
          className="drag-scroll overflow-x-auto p-3 md:px-0 flex flex-nowrap viewport rounded-b-xl duration-300 w-full"
        >
          <div className="flex flex-row flex-nowrap gap-3 flex-shrink-0">
            {isAuthenticated && (
              <div
                onClick={() => router.push('/feed/create')}
                className="w-max flex-none lg:flex-grow rounded-full"
              >
                <div className="w-full relative flex rounded-full p-2 shadow border border-purple-500 bg-zinc-900 text-white fill-white hover:bg-zinc-200 hover:text-zinc-800 hover:fill-zinc-800 duration-300 cursor-pointer jusitfy-center items-center gap-1.5 active:scale-95">
                  <SvgIcon className="w-8 h-8" id="IC-plus" />
                  <span className="text-lg font-bold">{strings.post}</span>
                </div>
              </div>
            )}

            {isAuthenticated && (
              <TopicButton
                active={topic === null}
                icon="IC-friends"
                label={strings.my}
                onClick={() => openTopic(null)}
              />
            )}

            <TopicButton
              active={topic === 'all'}
              icon="IC-all"
              label={strings.all}
              onClick={() => openTopic('all')}
            />

            <TopicButton
              active={topic === strings.it}
              icon="IC-it"
              label={strings.it}
              onClick={() => openTopic(strings.it)}
            />

            <TopicButton
              active={topic === strings.investment}
              icon="IC-invest"
              label={strings.investment}
              onClick={() => openTopic(strings.investment)}
            />

            <TopicButton
              active={topic === strings.games}
              className="hidden sm:flex"
              icon="IC-games"
              label={strings.games}
              onClick={() => openTopic(strings.games)}
            />

            <TopicButton
              active={topic === strings.news}
              className="hidden sm:flex"
              icon="IC-news"
              label={strings.news}
              onClick={() => openTopic(strings.news)}
            />

            <TopicButton
              active={topic === strings.photo}
              className="hidden sm:flex"
              icon="IC-photos"
              label={strings.photo}
              onClick={() => openTopic(strings.photo)}
            />

            <TopicButton
              active={topic === strings.music}
              className="hidden sm:flex"
              icon="IC-music"
              label={strings.music}
              onClick={() => openTopic(strings.music)}
            />

            <TopicButton
              active={topic === strings.films}
              className="hidden sm:flex"
              icon="IC-cinema"
              label={strings.films}
              onClick={() => openTopic(strings.films)}
            />

            <TopicButton
              active={topic === strings.humor}
              className="hidden sm:flex"
              icon="IC-humor"
              label={strings.humor}
              onClick={() => openTopic(strings.humor)}
            />

            <TopicButton
              active={topic === strings.science}
              className="hidden sm:flex"
              icon="IC-science"
              label={strings.science}
              onClick={() => openTopic(strings.science)}
            />

            <TopicButton
              active={topic === strings.tourism}
              className="hidden sm:flex"
              icon="IC-tour"
              label={strings.tourism}
              onClick={() => openTopic(strings.tourism)}
            />

            <TopicButton
              active={topic === strings.sport}
              className="hidden sm:flex"
              icon="IC-sport"
              label={strings.sport}
              onClick={() => openTopic(strings.sport)}
            />

            <TopicButton
              active={topic === strings.food}
              className="hidden sm:flex"
              icon="IC-food"
              label={strings.food}
              onClick={() => openTopic(strings.food)}
            />

            <div
              onClick={() => setIsTopicsModalOpen(true)}
              className="sm:hidden w-max flex-grow rounded-2xl shadow"
            >
              <div className="w-full h-full relative flex rounded-full p-2 duration-300 cursor-pointer jusitfy-center items-center gap-1.5 active:scale-95 bg-zinc-900 hover:bg-zinc-200 text-zinc-200 fill-zinc-200 hover:text-zinc-800 hover:fill-zinc-800 border border-zinc-600/30">
                <SvgIcon className="w-8 h-8" id="IC-morebars" />
                <span className="text-lg font-bold">{strings.more}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col gap-3 justify-center items-center -mt-3">
        <div className="max-w-3xl w-full flex flex-col gap-3" id="ugpostsline">
          {isInitialLoading ? (
            <>
              <FeedPostSkeleton />
              <FeedPostSkeleton />
              <FeedPostSkeleton />
            </>
          ) : errorMessage ? (
            <span className="border border-zinc-600/30 w-full text-center text-zinc-400 py-6 bg-zinc-900 rounded-3xl">
              {errorMessage}
            </span>
          ) : posts.length > 0 ? (
            <PostsRenderer
              currentUserId={user?.id ?? null}
              lang={postCardLang}
              onBookmark={handleBookmark}
              onComment={openCommentsModal}
              onDelete={(post) => {
                setDeleteTarget(post);
                setIsDeleteModalOpen(true);
              }}
              onNavigate={(href) => router.push(href)}
              onReport={(post) => openReportModal(post.id, 2)}
              onShare={openShareModal}
              onTranslate={translatePost}
              onVote={handleVote}
              posts={posts}
              shareBaseUrl="https://ancial.ru/feed/post"
            />
          ) : (
            <EmptyIllustration title={strings.noposts} description={strings.nopostsdesc} />
          )}
        </div>

        {isLoadingMore && (
          <div id="load-more-indicator" className="text-center py-6 pt-0 w-full max-w-3xl px-3 md:px-0 flex flex-col gap-3">
            <FeedPostSkeleton/>
            <FeedPostSkeleton/>
          </div>
        )}

        {!isInitialLoading && !isLoadingMore && posts.length > 0 && !hasMorePages && (
          <div id="load-more-indicator" className="text-center w-full max-w-3xl px-3 md:px-0">
            <div className="border border-zinc-600/30 w-full text-center text-zinc-400 py-6 bg-zinc-900 rounded-3xl">
              {strings.nomoreposts}
            </div>
          </div>
        )}

        <div ref={loadMoreRef} className="h-1 w-full max-w-3xl"></div>
      </div>

      <Modal
        isOpen={isTopicsModalOpen}
        onClose={() => setIsTopicsModalOpen(false)}
        title={strings.more}
        width="md"
      >
        <div className="grid grid-cols-2 gap-3 w-full max-h-96 viewport">
          {topicOptions.map((option) => (
            <MobileTopicCard
              key={option.value}
              active={topic === option.value}
              icon={option.icon}
              label={option.label}
              onClick={() => {
                setIsTopicsModalOpen(false);
                openTopic(option.value);
              }}
            />
          ))}
          <div className="w-full h-[1px]"></div>
        </div>
      </Modal>

      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title={strings.report}
        width="sm"
      >
        <div className="flex flex-col justify-center rounded-3xl shadow overflow-hidden">
          <button
            type="button"
            onClick={() => void handleReport('Спам')}
            className="text-left p-1.5 bg-zinc-800 text-lg cursor-pointer duration-300 hover:bg-zinc-700 active:scale-95 active:rounded-xl"
          >
            {strings.spam}
          </button>
          <button
            type="button"
            onClick={() => void handleReport('Запрещённый товар')}
            className="text-left p-1.5 bg-zinc-800 text-lg cursor-pointer duration-300 hover:bg-zinc-700 active:scale-95 active:rounded-xl"
          >
            {strings.prohibitedgood}
          </button>
          <button
            type="button"
            onClick={() => void handleReport('Обман')}
            className="text-left p-1.5 bg-zinc-800 text-lg cursor-pointer duration-300 hover:bg-zinc-700 active:scale-95 active:rounded-xl"
          >
            {strings.scam}
          </button>
          <button
            type="button"
            onClick={() => void handleReport('Насилие и вражда')}
            className="text-left p-1.5 bg-zinc-800 text-lg cursor-pointer duration-300 hover:bg-zinc-700 active:scale-95 active:rounded-xl"
          >
            {strings.violence}
          </button>
          <button
            type="button"
            onClick={() => void handleReport('Откровенное изображение')}
            className="text-left p-1.5 bg-zinc-800 text-lg cursor-pointer duration-300 hover:bg-zinc-700 active:scale-95 active:rounded-xl"
          >
            {strings.candidimage}
          </button>
          <button
            type="button"
            onClick={() => void handleReport('Нарушение интеллектуальных прав')}
            className="text-left p-1.5 bg-zinc-800 text-lg cursor-pointer duration-300 hover:bg-zinc-700 active:scale-95 active:rounded-xl"
          >
            {strings.propertyrights}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={isCommentsModalOpen}
        onClose={() => setIsCommentsModalOpen(false)}
        title={strings.postcomments}
        width="md"
        bodyClassName="p-0 pt-[84px] lg:pt-[72px]"
      >
        <div className="flex flex-col text-zinc-100">
          {isAuthenticated && (
            <div className="sticky top-0 pb-3 bg-gradient-to-b from-zinc-900 via-zinc-900 to-transparent z-10">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleCreateComment();
                }}
                className="flex bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 rounded-full w-full p-1 h-12"
              >
                <input
                  value={commentInput}
                  onChange={(event) => setCommentInput(event.target.value)}
                  placeholder={strings.writecomment}
                  type="text"
                  autoComplete="off"
                  className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600"
                />
                <button
                  type="submit"
                  className="cursor-pointer shrink-0 w-10 h-10 flex items-center justify-center active:scale-95 duration-300 rounded-full hover:bg-zinc-700"
                >
                  <svg className="fill-white w-8 h-8 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <path d="M39.175,10.016c1.687,0,2.131,1.276,1.632,4.272c-0.571,3.426-2.216,14.769-3.528,21.83 c-0.502,2.702-1.407,3.867-2.724,3.867c-0.724,0-1.572-0.352-2.546-0.995c-1.32-0.872-7.984-5.279-9.431-6.314 c-1.32-0.943-3.141-2.078-0.857-4.312c0.813-0.796,6.14-5.883,10.29-9.842c0.443-0.423,0.072-1.068-0.42-1.068 c-0.112,0-0.231,0.034-0.347,0.111c-5.594,3.71-13.351,8.859-14.338,9.53c-0.987,0.67-1.949,1.1-3.231,1.1 c-0.655,0-1.394-0.112-2.263-0.362c-1.943-0.558-3.84-1.223-4.579-1.477c-2.845-0.976-2.17-2.241,0.593-3.457 c11.078-4.873,25.413-10.815,27.392-11.637C36.746,10.461,38.178,10.016,39.175,10.016 M39.175,7.016L39.175,7.016 c-1.368,0-3.015,0.441-5.506,1.474L33.37,8.614C22.735,13.03,13.092,17.128,6.218,20.152c-1.074,0.473-4.341,1.91-4.214,4.916 c0.054,1.297,0.768,3.065,3.856,4.124l0.228,0.078c0.862,0.297,2.657,0.916,4.497,1.445c1.12,0.322,2.132,0.478,3.091,0.478 c1.664,0,2.953-0.475,3.961-1.028c-0.005,0.168-0.001,0.337,0.012,0.507c0.182,2.312,1.97,3.58,3.038,4.338l0.149,0.106 c1.577,1.128,8.714,5.843,9.522,6.376c1.521,1.004,2.894,1.491,4.199,1.491c2.052,0,4.703-1.096,5.673-6.318 c0.921-4.953,1.985-11.872,2.762-16.924c0.331-2.156,0.603-3.924,0.776-4.961c0.349-2.094,0.509-4.466-0.948-6.185 C42.208,7.875,41.08,7.016,39.175,7.016L39.175,7.016z"></path>
                  </svg>
                </button>
              </form>
            </div>
          )}

          <div className="flex flex-col justify-center items-center gap-1.5 pb-3" id="pcomments">
            {isCommentsLoading ? (
              <div className="w-full flex items-center justify-center py-6">
                <svg className="w-16 h-16 inline animate-spin fill-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path d="M 24 4 A 1.50015 1.50015 0 1 0 24 7 C 30.255882 7 35.765936 10.406785 38.703125 15.455078 A 1.5005776 1.5005776 0 1 0 41.296875 13.945312 C 37.834064 7.9936061 31.344118 4 24 4 z"></path>
                </svg>
              </div>
            ) : comments.length > 0 ? (
              comments.map((comment) => (
                <FeedCommentCard
                  key={comment.id}
                  comment={comment}
                  deleteLabel={strings.delete}
                  reportLabel={strings.report}
                  onDelete={(targetComment) => void handleDeleteComment(targetComment)}
                  onNavigateToUser={(username) => {
                    setIsCommentsModalOpen(false);
                    router.push(`/@${username}`);
                  }}
                  onReport={(targetComment) => openReportModal(targetComment.id, 4)}
                />
              ))
            ) : (
              <CommentsEmptyState
                title={strings.emptycomments}
                description={strings.emptycommentsdesc}
              />
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={strings.share}
        width="sm"
      >
        <div className="flex flex-col gap-3 justify-center items-center">
          <span className="hidden">{shareUrl}</span>
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => handleShareTo('vk')}
              className="w-16 h-16 rounded-2xl bg-blue-500 hover:bg-blue-600 cursor-pointer active:scale-95 duration-300 flex items-center justify-center shadow"
            >
              <Image src="/img/socials/vk.png" alt="VK" width={48} height={48} className="w-12 h-12" />
            </button>
            <button
              type="button"
              onClick={() => handleShareTo('tg')}
              className="w-16 h-16 rounded-2xl bg-sky-400 hover:bg-sky-500 cursor-pointer active:scale-95 duration-300 flex items-center justify-center shadow"
            >
              <Image src="/img/socials/tg.png" alt="Telegram" width={48} height={48} className="w-12 h-12" />
            </button>
            <button
              type="button"
              onClick={() => handleShareTo('x')}
              className="w-16 h-16 rounded-2xl bg-slate-800 hover:bg-slate-900 cursor-pointer active:scale-95 duration-300 flex items-center justify-center shadow"
            >
              <Image src="/img/socials/x.png" alt="X" width={48} height={48} className="w-12 h-12" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => void handleCopyShareLink()}
            className="cursor-pointer w-full border border-zinc-600/30 rounded-3xl flex items-center justify-center gap-3 px-4 py-2 duration-300 active:scale-95 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
          >
            {strings.copylink}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={strings.deletepost}
        width="sm"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 justify-center items-center">
            <svg className="w-24 h-24 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path d="M 20.5 4 A 1.50015 1.50015 0 0 0 19.066406 6 L 14.640625 6 C 12.803372 6 11.082924 6.9194511 10.064453 8.4492188 L 7.6972656 12 L 7.5 12 A 1.50015 1.50015 0 1 0 7.5 15 L 8.2636719 15 A 1.50015 1.50015 0 0 0 8.6523438 15.007812 L 11.125 38.085938 C 11.423352 40.868277 13.795836 43 16.59375 43 L 31.404297 43 C 34.202211 43 36.574695 40.868277 36.873047 38.085938 L 39.347656 15.007812 A 1.50015 1.50015 0 0 0 39.728516 15 L 40.5 15 A 1.50015 1.50015 0 1 0 40.5 12 L 40.302734 12 L 37.935547 8.4492188 C 36.916254 6.9202798 35.196001 6 33.359375 6 L 28.933594 6 A 1.50015 1.50015 0 0 0 27.5 4 L 20.5 4 z M 14.640625 9 L 33.359375 9 C 34.196749 9 34.974746 9.4162203 35.439453 10.113281 L 36.697266 12 L 11.302734 12 L 12.560547 10.113281 A 1.50015 1.50015 0 0 0 12.5625 10.111328 C 13.025982 9.4151428 13.801878 9 14.640625 9 z M 11.669922 15 L 36.330078 15 L 33.890625 37.765625 C 33.752977 39.049286 32.694383 40 31.404297 40 L 16.59375 40 C 15.303664 40 14.247023 39.049286 14.109375 37.765625 L 11.669922 15 z"></path>
            </svg>
            <span className="text-base text-zinc-200">{strings.reallywantdeletepost}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => void handleDeletePost()}
              className="flex items-center justify-center gap-3 px-4 py-2 duration-300 active:scale-95 bg-red-600 hover:bg-red-700 text-white rounded-2xl w-full shadow"
            >
              {strings.yes}
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex items-center justify-center gap-3 px-4 py-2 duration-300 active:scale-95 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-2xl w-full shadow"
            >
              {strings.no}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
