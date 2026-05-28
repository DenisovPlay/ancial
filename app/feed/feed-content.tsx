'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import Modal from '../components/modal';
import { CommentsModal, type FeedComment } from '../components/comments-modal';
import { Dropdown, DropdownItem } from '../components/navigation';
import PostsRenderer, {
  type PostCardLang,
  type PostData,
} from '../components/posts-renderer';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useDragScroll } from '../hooks/useDragScroll';
import { AncialAPI } from '../lib/api-v2';
import { cn, SvgIcon } from './editor-shared';
import FeedPostSkeleton from './feed-post-skeleton';

type Id = string | number;

interface FeedResponse {
  has_more?: boolean;
  last_id?: Id;
  posts?: PostData[];
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

// Removed local api helpers

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
      className="cursor-pointer rounded-3xl bg-gradient-to-br from-zinc-800 to-zinc-700 duration-300 shadow active:scale-95 border border-zinc-600/30"
    >
      <div
        className={cn(
          'h-24 p-3 w-full flex items-center justify-start rounded-3xl duration-300 relative overflow-hidden',
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
    const fb = {
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
      all: lang?.all || fb.all,
      bookmarkadded: lang?.bookmarkadded || fb.bookmarkadded,
      bookmarked: lang?.bookmarked || fb.bookmarked,
      bookmarkremoved: lang?.bookmarkremoved || fb.bookmarkremoved,
      bookmarks: lang?.bookmarks || fb.bookmarks,
      candidimage: lang?.candidimage || fb.candidimage,
      copylink: lang?.copylink || fb.copylink,
      delete: lang?.delete || fb.delete,
      deletepost: lang?.deletepost || fb.deletepost,
      emptycomments: lang?.emptycomments || fb.emptycomments,
      emptycommentsdesc: lang?.emptycommentsdesc || fb.emptycommentsdesc,
      feed: lang?.feed || fb.feed,
      films: lang?.films || fb.films,
      food: lang?.food || fb.food,
      games: lang?.games || fb.games,
      humor: lang?.humor || fb.humor,
      investment: lang?.investment || fb.investment,
      it: lang?.it || fb.it,
      langname: lang?.langname || fb.langname,
      less: lang?.less || fb.less,
      linkcopied: lang?.linkcopied || fb.linkcopied,
      logintoreact: lang?.logintoreact || fb.logintoreact,
      more: lang?.more || fb.more,
      music: lang?.music || fb.music,
      my: lang?.my || fb.my,
      news: lang?.news || fb.news,
      no: lang?.no || fb.no,
      nomoreposts: lang?.nomoreposts || fb.nomoreposts,
      noposts: lang?.noposts || fb.noposts,
      nopostsdesc: lang?.nopostsdesc || fb.nopostsdesc,
      photo: lang?.photo || fb.photo,
      post: lang?.post || fb.post,
      postcomments: lang?.postcomments || fb.postcomments,
      prohibitedgood: lang?.prohibitedgood || fb.prohibitedgood,
      propertyrights: lang?.propertyrights || fb.propertyrights,
      reallywantdeletepost: lang?.reallywantdeletepost || fb.reallywantdeletepost,
      report: lang?.report || fb.report,
      scam: lang?.scam || fb.scam,
      science: lang?.science || fb.science,
      share: lang?.share || fb.share,
      somethingwrong: lang?.somethingwrong || fb.somethingwrong,
      spam: lang?.spam || fb.spam,
      sport: lang?.sport || fb.sport,
      tbookmark: lang?.tobookmarks || fb.tbookmark,
      tourism: lang?.tourism || fb.tourism,
      violence: lang?.violence || fb.violence,
      writecomment: lang?.writecomment || fb.writecomment,
      yes: lang?.yes || fb.yes,
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
      const nextComments = await AncialAPI.getComments<FeedComment[]>(postId);
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
      const response = await AncialAPI.getFeed<FeedResponse>(
        requestedTopic ?? undefined,
        lastId,
        undefined,
        undefined,
        { signal: controller.signal }
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
      const response = (await AncialAPI.postAction('bookmark', { pid: post.id })) as { message: string, action: string };

      showNote({
        content: response.message,
        html: true,
        type: 'success',
        time: 5,
      });

      setPosts((currentPosts) =>
        currentPosts.map((currentPost) => {
          if (String(currentPost.id) !== String(post.id)) {
            return currentPost;
          }

          const isAdded = response.action === 'added';
          const isRemoved = response.action === 'removed';
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
      const response = (await AncialAPI.votePost(post.id, direction)) as { status: string };

      if (response.status === 'nlog') {
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
      await AncialAPI.createComment(activeCommentsPost.id, commentInput.trim());

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
      const response = await AncialAPI.deleteComment<{ message?: string }>(comment.id);

      showNote({
        content: response?.message || 'Удалено',
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
      const response = (await AncialAPI.reportAction({ id: currentTarget.id, type: currentTarget.type, comment: reason })) as { message: string };

      showNote({
        content: response.message || 'Жалоба отправлена',
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
      const response = (await AncialAPI.deletePost(currentTarget.id)) as { message: string };

      showNote({
        content: response.message || 'Пост удален',
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

      <CommentsModal
        isOpen={isCommentsModalOpen}
        onClose={() => setIsCommentsModalOpen(false)}
        title={strings.postcomments}
        comments={comments}
        isLoading={isCommentsLoading}
        isAuthenticated={isAuthenticated}
        commentInput={commentInput}
        onCommentInputChange={setCommentInput}
        onSubmit={() => void handleCreateComment()}
        onDelete={(targetComment) => void handleDeleteComment(targetComment)}
        onReport={(targetComment) => openReportModal(targetComment.id, 4)}
        onNavigateToUser={(username) => {
          setIsCommentsModalOpen(false);
          router.push(`/@${username}`);
        }}
        deleteLabel={strings.delete}
        reportLabel={strings.report}
        emptyTitle={strings.emptycomments}
        emptyDescription={strings.emptycommentsdesc}
        writeCommentPlaceholder={strings.writecomment}
      />

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
             <use href="#IC-trash"></use>
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
