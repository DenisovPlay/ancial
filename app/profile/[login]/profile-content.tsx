'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Modal from '../../components/modal';
import { Dropdown, DropdownItem } from '../../components/navigation';
import { CommentsModal, type FeedComment } from '../../components/comments-modal';
import {
  EmptyIllustration,
  GroupMiniCard,
  PeopleSection,
  ProfileAvatar,
  ProfileMediaButton,
  ProfileSkeleton,
  RelationGridModal,
  type GroupPreview,
  type UserPreview,
  UserMiniCard,
} from '../../components/profile-ui';
import PostsRenderer, {
  type PostData,
} from '../../components/posts-renderer';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useDragScroll } from '../../hooks/useDragScroll';
import { authFetch, authFetchJson, authFetchText } from '../../lib/auth-fetch';
import {
  cn,
  SvgIcon,
  uploadImageToImgbb,
} from '../../feed/editor-shared';
import FeedPostSkeleton from '../../feed/feed-post-skeleton';

type Id = string | number;

interface UserFriendButton {
  action?: string | null;
  relation_id?: Id | null;
  status?: string | number | null;
  target_id?: Id | null;
}

interface UserPageData {
  active?: boolean | number | string | null;
  cover?: string | null;
  description?: string | null;
  fname?: string | null;
  friend_button?: UserFriendButton | null;
  friends?: UserPreview[] | null;
  groups?: GroupPreview[] | null;
  id: Id;
  img?: string | null;
  is_owner?: boolean | number | string | null;
  lname?: string | null;
  login?: string | null;
  online?: boolean | number | string | null;
  subscribers?: UserPreview[] | null;
  verify?: boolean | number | string | null;
}

interface UserPageResponse {
  data?: UserPageData;
  error?: string;
  success?: boolean;
}

interface FeedResponse {
  has_more?: boolean;
  last_id?: Id;
  posts?: PostData[];
}

interface ReportTarget {
  id: Id;
  type: number;
}

interface UserProfileCacheEntry {
  currentLastId: Id;
  hasMorePages: boolean;
  posts: PostData[];
  userData: UserPageData;
}

function flag(value: boolean | number | string | null | undefined) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function toNumber(value: number | string | boolean | null | undefined) {
  const nextValue = Number(value ?? 0);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

function getUserProfileCacheKey(
  login: string,
  userId: string | null | undefined,
  isAuthenticated: boolean,
) {
  const normalizedLogin = login.trim().toLowerCase() || '__unknown__';
  const viewer = isAuthenticated ? `user-${userId ?? 'auth'}` : 'guest';
  return `user_profile_cache:${viewer}:${normalizedLogin}`;
}

function readUserProfileCache(key: string): UserProfileCacheEntry | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = window.localStorage.getItem(key);
    if (!cached) return null;

    const parsed = JSON.parse(cached) as Partial<UserProfileCacheEntry>;
    if (!parsed.userData || !Array.isArray(parsed.posts)) return null;

    return {
      currentLastId: parsed.currentLastId ?? 0,
      hasMorePages: typeof parsed.hasMorePages === 'boolean' ? parsed.hasMorePages : true,
      posts: parsed.posts,
      userData: parsed.userData,
    };
  } catch (error) {
    console.error('Failed to read user profile cache', error);
    return null;
  }
}

function writeUserProfileCache(key: string, value: UserProfileCacheEntry) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to write user profile cache', error);
  }
}

function clearUserProfileCache(key: string) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear user profile cache', error);
  }
}

async function apiJson<T>(path: string, init?: RequestInit) {
  return authFetchJson<T>(path, init);
}

async function apiText(path: string, init?: RequestInit) {
  return authFetchText(path, init);
}

export default function UserProfileContent({ login }: { login: string }) {
  const router = useRouter();
  const { checkAuth, isAuthenticated, isLoading: authLoading, lang, user } = useAuth();
  const { showNote } = useNotification();

  const abortRef = useRef<AbortController | null>(null);
  const currentLastIdRef = useRef<Id>(0);
  const hasMorePagesRef = useRef(true);
  const profileIdRef = useRef<Id | null>(null);
  const loadPostsRef = useRef<
    (
      profileId: Id,
      lastId: Id,
      append?: boolean,
      options?: { preserveExisting?: boolean },
    ) => Promise<void>
  >(async () => {});
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserPageData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [activeCommentsPost, setActiveCommentsPost] = useState<PostData | null>(null);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PostData | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [isSubscribersModalOpen, setIsSubscribersModalOpen] = useState(false);
  const [isGroupsModalOpen, setIsGroupsModalOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const profileCacheKey = useMemo(
    () => getUserProfileCacheKey(login, user?.id, isAuthenticated),
    [isAuthenticated, login, user?.id],
  );

  const strings = useMemo(() => {
    const fallback = {
      accept: 'Принять',
      add: 'Добавить',
      adult_content_warning: 'Изображение может содержать контент 18+',
      blockedaccdesc: 'Аккаунт заблокирован',
      bookmarkadded: 'Добавлено в закладки',
      bookmarked: 'В закладках',
      bookmarkremoved: 'Удалено из закладок',
      candidimage: 'Откровенное изображение',
      cancel: 'Отменить',
      copylink: 'Скопировать ссылку',
      delete: 'Удалить',
      deletepost: 'Удалить пост',
      dialogblocked: 'Диалог заблокирован',
      dialogcreated: 'Диалог создан',
      edit: 'Редактировать',
      emptycomments: 'Комментариев пока нет',
      emptycommentsdesc: 'Будьте первым, кто что-то напишет.',
      errorhappend: 'Произошла ошибка =(',
      friends: 'Друзья',
      groups: 'Сообщества',
      home: 'Home',
      langname: 'en',
      less: 'Скрыть',
      linkcopied: 'Ссылка скопирована',
      loading: 'Загрузка...',
      logintoreact: 'Войдите, чтобы взаимодействовать с публикациями',
      more: 'Подробнее',
      no: 'Нет',
      noposts: 'Постов пока нет',
      nopostsdesc: 'У этого пользователя пока нет публикаций.',
      pagenotfound: 'Пользователь не найден',
      postcomments: 'Комментарии',
      prohibitedgood: 'Запрещённый товар',
      propertyrights: 'Нарушение интеллектуальных прав',
      reallywantdeletepost: 'Вы действительно хотите удалить пост?',
      report: 'Пожаловаться',
      scam: 'Обман',
      share: 'Поделиться',
      somethingwrong: 'Что-то пошло не так',
      spam: 'Спам',
      subscribers: 'Подписчики',
      successProfileUpdate: 'Это успех! Все готово, проверяйте!',
      tbookmark: 'В закладки',
      updateprofilecover: 'Обновить обложку профиля',
      updateprofilepicture: 'Обновить фото профиля',
      uploadphoto: 'Выберите изображение',
      violence: 'Насилие и вражда',
      writecomment: 'Напишите комментарий',
      writetouser: 'Написать',
      yes: 'Да',
      translate: 'Перевести',
    };

    return {
      accept: lang?.accept || fallback.accept,
      add: lang?.add || fallback.add,
      adult_content_warning: lang?.adult_content_warning || fallback.adult_content_warning,
      blockedaccdesc: lang?.blockedaccdesc || fallback.blockedaccdesc,
      bookmarkadded: lang?.bookmarkadded || fallback.bookmarkadded,
      bookmarked: lang?.bookmarked || fallback.bookmarked,
      bookmarkremoved: lang?.bookmarkremoved || fallback.bookmarkremoved,
      candidimage: lang?.candidimage || fallback.candidimage,
      cancel: lang?.cancel || fallback.cancel,
      copylink: lang?.copylink || fallback.copylink,
      delete: lang?.delete || fallback.delete,
      deletepost: lang?.deletepost || fallback.deletepost,
      dialogblocked: lang?.dialogblocked || fallback.dialogblocked,
      dialogcreated: lang?.dialogcreated || fallback.dialogcreated,
      edit: lang?.edit || fallback.edit,
      emptycomments: lang?.emptycomments || fallback.emptycomments,
      emptycommentsdesc: lang?.emptycommentsdesc || fallback.emptycommentsdesc,
      errorhappend: lang?.errorhappend || fallback.errorhappend,
      friends: lang?.friends || fallback.friends,
      groups: lang?.groups || fallback.groups,
      home: lang?.Home || lang?.home || fallback.home,
      langname: lang?.langname || fallback.langname,
      less: lang?.less || fallback.less,
      linkcopied: lang?.linkcopied || fallback.linkcopied,
      loading: lang?.['loading...'] || fallback.loading,
      logintoreact: lang?.logintoreact || fallback.logintoreact,
      more: lang?.more || fallback.more,
      no: lang?.no || fallback.no,
      noposts: lang?.noposts || fallback.noposts,
      nopostsdesc: lang?.nopostsdesc || fallback.nopostsdesc,
      pagenotfound: lang?.pagenotfound || fallback.pagenotfound,
      postcomments: lang?.postcomments || fallback.postcomments,
      prohibitedgood: lang?.prohibitedgood || fallback.prohibitedgood,
      propertyrights: lang?.propertyrights || fallback.propertyrights,
      reallywantdeletepost: lang?.reallywantdeletepost || fallback.reallywantdeletepost,
      report: lang?.report || fallback.report,
      scam: lang?.scam || fallback.scam,
      share: lang?.share || fallback.share,
      somethingwrong: lang?.somethingwrong || fallback.somethingwrong,
      spam: lang?.spam || fallback.spam,
      subscribers: lang?.subscribers || fallback.subscribers,
      successProfileUpdate: fallback.successProfileUpdate,
      tbookmark: lang?.tobookmarks || fallback.tbookmark,
      updateprofilecover: lang?.updateprofilecover || fallback.updateprofilecover,
      updateprofilepicture: lang?.updateprofilepicture || fallback.updateprofilepicture,
      uploadphoto: lang?.photo || fallback.uploadphoto,
      violence: lang?.violence || fallback.violence,
      writecomment: lang?.writecomment || fallback.writecomment,
      writetouser: lang?.writetouser || fallback.writetouser,
      yes: lang?.yes || fallback.yes,
      translate: lang?.translate || fallback.translate,
    };
  }, [lang]);

  const hasFriends = Boolean(userData?.friends?.length);
  const hasSubscribers = Boolean(userData?.subscribers?.length);
  const hasGroups = Boolean(userData?.groups?.length);

  const navigateToUser = useCallback(
    (username: string | null | undefined) => {
      if (!username) return;
      router.push(`/@${username}`);
    },
    [router],
  );

  const navigateToGroup = useCallback(
    (slnk: string | null | undefined) => {
      if (!slnk) return;
      router.push(`/$${slnk}`);
    },
    [router],
  );

  const loadComments = useCallback(
    async (postId: Id) => {
      setIsCommentsLoading(true);

      try {
        const nextComments = await apiJson<FeedComment[]>(`/api/posts/comments.php?id=${postId}`);
        setComments(Array.isArray(nextComments) ? nextComments : []);
      } catch (nextError) {
        console.error('Failed to load comments', nextError);
        setComments([]);
        showNote({
          content: strings.somethingwrong,
          type: 'error',
          time: 5,
        });
      } finally {
        setIsCommentsLoading(false);
      }
    },
    [showNote, strings.somethingwrong],
  );

  const updatePost = useCallback((postId: Id, updater: (post: PostData) => PostData) => {
    setPosts((currentPosts) =>
      currentPosts.map((currentPost) =>
        String(currentPost.id) === String(postId) ? updater(currentPost) : currentPost,
      ),
    );
  }, []);

  const loadProfile = useCallback(
    async (options?: { preserveExisting?: boolean }) => {
      const preserveExisting = options?.preserveExisting ?? false;

      if (!preserveExisting) {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await apiJson<UserPageResponse>(
          `/api/user/get_user_page.php?login=${encodeURIComponent(login)}`,
        );

        if (!response.success || !response.data) {
          clearUserProfileCache(profileCacheKey);
          setUserData(null);
          profileIdRef.current = null;
          setError(response.error || strings.pagenotfound);
          setPosts([]);
          setPostsLoading(false);
          currentLastIdRef.current = 0;
          setHasMorePages(false);
          hasMorePagesRef.current = false;
          return;
        }

        if (String(response.data.active ?? 1) === '0') {
          clearUserProfileCache(profileCacheKey);
          setUserData(null);
          profileIdRef.current = null;
          setError(strings.blockedaccdesc);
          setPosts([]);
          setPostsLoading(false);
          currentLastIdRef.current = 0;
          setHasMorePages(false);
          hasMorePagesRef.current = false;
          return;
        }

        setUserData(response.data);
        profileIdRef.current = response.data.id;
        setError(null);

        if (!preserveExisting) {
          setPosts([]);
          currentLastIdRef.current = 0;
          setHasMorePages(true);
          hasMorePagesRef.current = true;
          setPostsLoading(true);
        }

        void loadPostsRef.current(response.data.id, 0, false, { preserveExisting });
      } catch (nextError) {
        console.error('Failed to load profile', nextError);

        if (!preserveExisting) {
          setUserData(null);
          profileIdRef.current = null;
          setError(strings.somethingwrong);
          setPosts([]);
          setPostsLoading(false);
          currentLastIdRef.current = 0;
          setHasMorePages(false);
          hasMorePagesRef.current = false;
        }
      } finally {
        if (!preserveExisting) {
          setLoading(false);
        }
      }
    },
    [login, profileCacheKey, strings.blockedaccdesc, strings.pagenotfound, strings.somethingwrong],
  );

  const loadPosts = useCallback(
    async (
      profileId: Id,
      lastId: Id,
      append = false,
      options?: { preserveExisting?: boolean },
    ) => {
      if (!profileId) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (append) {
        setIsLoadingMore(true);
      } else {
        const preserveExisting = options?.preserveExisting ?? false;
        if (!preserveExisting) {
          setPostsLoading(true);
        }
      }

      try {
        const response = await apiJson<FeedResponse>(
          `/api/posts/feed.php?last_id=${lastId}&id=${profileId}&type=1`,
          { signal: controller.signal },
        );

        if (controller.signal.aborted) return;

        const nextPosts = Array.isArray(response.posts) ? response.posts : [];

        if (nextPosts.length > 0) {
          const nextLastId = response.last_id ?? lastId;
          const nextHasMorePages = Boolean(response.has_more);

          setPosts((currentPosts) => (append ? [...currentPosts, ...nextPosts] : nextPosts));
          currentLastIdRef.current = nextLastId;
          setHasMorePages(nextHasMorePages);
          hasMorePagesRef.current = nextHasMorePages;
        } else if (!append) {
          setPosts([]);
          currentLastIdRef.current = 0;
          setHasMorePages(false);
          hasMorePagesRef.current = false;
        } else {
          setHasMorePages(false);
          hasMorePagesRef.current = false;
        }
      } catch (nextError) {
        if (nextError instanceof DOMException && nextError.name === 'AbortError') {
          return;
        }

        console.error('Failed to load user posts', nextError);

        if (!append && !options?.preserveExisting) {
          setPosts([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setPostsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [],
  );

  loadPostsRef.current = loadPosts;

  useEffect(() => {
    if (authLoading) return;

    const cached = readUserProfileCache(profileCacheKey);
    if (cached) {
      setError(null);
      setUserData(cached.userData);
      profileIdRef.current = cached.userData.id;
      setPosts(cached.posts);
      setPostsLoading(false);
      currentLastIdRef.current = cached.currentLastId;
      setHasMorePages(cached.hasMorePages);
      hasMorePagesRef.current = cached.hasMorePages;
      setLoading(false);
      void loadProfile({ preserveExisting: true });
      return;
    }

    void loadProfile();

    return () => {
      abortRef.current?.abort();
    };
  }, [authLoading, loadProfile, profileCacheKey]);

  useEffect(() => {
    if (loading || postsLoading || !userData) return;

    writeUserProfileCache(profileCacheKey, {
      currentLastId: currentLastIdRef.current,
      hasMorePages,
      posts,
      userData,
    });
  }, [hasMorePages, loading, posts, postsLoading, profileCacheKey, userData]);

  useEffect(() => {
    const indicator = loadMoreRef.current;
    if (!indicator) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!hasMorePagesRef.current || postsLoading || isLoadingMore) return;
        if (!profileIdRef.current) return;

        void loadPostsRef.current(profileIdRef.current, currentLastIdRef.current, true);
      },
      { rootMargin: '0px 0px 20% 0px' },
    );

    observer.observe(indicator);
    return () => observer.disconnect();
  }, [isLoadingMore, posts.length, postsLoading, userData?.id]);

  const handleBookmark = async (post: PostData, nextValue: boolean) => {
    try {
      const response = await apiText(`/api/posts/bookmarks.php?pid=${post.id}`);

      showNote({
        content: response,
        html: true,
        type: 'success',
        time: 5,
      });

      updatePost(post.id, (currentPost) => {
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
      });
    } catch (nextError) {
      console.error('Bookmark failed', nextError);
      showNote({
        content: strings.somethingwrong,
        type: 'error',
        time: 5,
      });
    }
  };

  const handleVote = async (post: PostData, direction: 'up' | 'down') => {
    try {
      const response = await apiText(`/api/posts/vote.php?pid=${post.id}&vt=${direction}`);

      if (response === 'nlog') {
        showNote({
          content: strings.logintoreact,
          type: 'success',
          time: 5,
        });
        return;
      }

      updatePost(post.id, (currentPost) => {
        const currentVote =
          currentPost.user_vote_up === 'voted'
            ? 'up'
            : currentPost.user_vote_down === 'voted'
              ? 'down'
              : null;

        if (direction === 'up') {
          if (currentVote === 'up') return currentPost;

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

        if (currentVote === 'down') return currentPost;

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
      });
    } catch (nextError) {
      console.error('Vote failed', nextError);
      showNote({
        content: strings.somethingwrong,
        type: 'error',
        time: 5,
      });
    }
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

      updatePost(post.id, (currentPost) => ({
        ...currentPost,
        title: translatedTitle,
        content: translatedContent,
      }));
    } catch (nextError) {
      console.error('Translate failed', nextError);
    }
  };

  const openCommentsModal = (post: PostData) => {
    setActiveCommentsPost(post);
    setComments([]);
    setCommentInput('');
    setIsCommentsModalOpen(true);
    void loadComments(post.id);
  };

  const incrementCommentsCount = useCallback((postId: Id, delta: number) => {
    updatePost(postId, (currentPost) => ({
      ...currentPost,
      comments_count: Math.max(0, toNumber(currentPost.comments_count) + delta),
    }));
  }, [updatePost]);

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
    } catch (nextError) {
      console.error('Create comment failed', nextError);
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
    } catch (nextError) {
      console.error('Delete comment failed', nextError);
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
    } catch (nextError) {
      console.error('Report failed', nextError);
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

      if (activeCommentsPost && String(activeCommentsPost.id) === String(currentTarget.id)) {
        setIsCommentsModalOpen(false);
        setActiveCommentsPost(null);
      }
    } catch (nextError) {
      console.error('Delete post failed', nextError);
      showNote({
        content: strings.errorhappend,
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
    } catch (nextError) {
      console.error('Copy link failed', nextError);
      showNote({
        content: strings.somethingwrong,
        type: 'error',
        time: 5,
      });
    }
  };

  const handleFriendButtonClick = async () => {
    const friendButton = userData?.friend_button;
    if (!friendButton) return;

    const token = localStorage.getItem('token') || '';

    let path = '';
    if (friendButton.action === 'delete' || friendButton.action === 'cancel') {
      path = `/api/friends/delete.php?frid=${friendButton.relation_id}&token=${encodeURIComponent(token)}`;
    } else if (friendButton.action === 'accept') {
      path = `/api/friends/add.php?frid=${friendButton.relation_id}&token=${encodeURIComponent(token)}`;
    } else if (friendButton.action === 'add') {
      path = `/api/friends/create.php?fid=${friendButton.target_id}&token=${encodeURIComponent(token)}`;
    }

    if (!path) return;

    try {
      const response = await apiText(path);

      showNote({
        content: response,
        html: true,
        type: 'success',
        time: 5,
      });

      await loadProfile();
    } catch (nextError) {
      console.error('Friend action failed', nextError);
      showNote({
        content: strings.errorhappend,
        type: 'error',
        time: 5,
      });
    }
  };

  const handleCreateDialog = async () => {
    if (!userData) return;

    try {
      const token = localStorage.getItem('token') || '';
      const response = await authFetch('/api/messages/createdialog.php', {
        body: new URLSearchParams({
          token,
          withu: String(userData.id),
        }).toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const html = await response.text();

      if (html === strings.dialogcreated || html === strings.dialogblocked) {
        showNote({
          content: html,
          html: true,
          type: 'success',
          time: 5,
        });
        return;
      }

      router.push(`/messages/${html}`);
    } catch (nextError) {
      console.error('Create dialog failed', nextError);
      showNote({
        content: strings.errorhappend,
        type: 'error',
        time: 5,
      });
    }
  };

  const updateProfileMedia = async (field: 'cover' | 'img', file: File | null) => {
    if (!file) return;

    const setUploading = field === 'img' ? setIsUploadingPhoto : setIsUploadingCover;
    setUploading(true);

    try {
      showNote({
        content: strings.loading,
        type: 'info',
        time: 5,
      });

      const uploadedUrl = await uploadImageToImgbb(file);
      const token = localStorage.getItem('token') || '';
      const body = new URLSearchParams({
        [field]: uploadedUrl,
        token,
      });

      const response = await authFetch('/api/user/updateinfo.php', {
        body: body.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const message = (await response.text()) || strings.successProfileUpdate;

      showNote({
        content: message,
        html: true,
        type: 'success',
        time: 5,
      });

      if (field === 'img') {
        setIsPhotoModalOpen(false);
      } else {
        setIsCoverModalOpen(false);
      }

      await checkAuth();
      await loadProfile();
    } catch (nextError) {
      console.error('Profile media update failed', nextError);
      showNote({
        content: strings.errorhappend,
        type: 'error',
        time: 5,
      });
    } finally {
      setUploading(false);
    }
  };

  const friendButtonConfig = useMemo(() => {
    const button = userData?.friend_button;
    if (!button) return null;

    const isAddAction = button.action === 'add' || button.action === 'accept';

    return {
      colorClassName: isAddAction ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600',
      icon:
        button.action === 'add' || button.action === 'accept' ? (
          <SvgIcon className="w-6 h-6 inline fill-white mr-2" id="IC-plus" />
        ) : (
          <SvgIcon className="w-6 h-6 inline fill-white mr-2" id="IC-times" />
        ),
      label:
        button.action === 'accept'
          ? strings.accept
          : button.action === 'add'
            ? strings.add
            : toNumber(button.status) === 1
              ? strings.delete
              : strings.cancel,
    };
  }, [strings.accept, strings.add, strings.cancel, strings.delete, userData?.friend_button]);

  const currentCover = userData?.cover || '/img/covers/placeholder.png';
  const currentAvatar = userData?.img || 'https://ancial.ru/includes/img/new_user.png';

  return (
    <div className="flex justify-center items-center md:pb-3">
      {loading ? (
        <ProfileSkeleton />
      ) : error ? (
        <div className="flex flex-col gap-3 min-h-screen items-center justify-center -m-3 p-3">
          <Image
            src="/img/status/nothingfound.webp"
            alt="Profile error"
            width={224}
            height={224}
            className="h-56 w-auto"
          />
          <div className="text-center text-zinc-200">{error}</div>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="cursor-pointer px-4 py-2 rounded-3xl shadow bg-purple-500 hover:bg-purple-600 duration-300 active:scale-95 uppercase"
          >
            {strings.home}
          </button>
        </div>
      ) : userData ? (
        <div className="flex flex-col gap-3 items-center flex-grow w-full max-w-screen-2xl">
          <span className="text-3xl font-extralight w-full pt-3 pl-3 md:pl-0 truncate z-[30]">
            @{userData.login}
          </span>

          <div
            className={cn(
              'border border-zinc-600/30 md:border-b bg-zinc-900 md:rounded-3xl flex flex-col w-full md:shadow duration-300 rounded-t-3xl',
              hasFriends || hasSubscribers || hasGroups
                ? 'border-b-0'
                : 'rounded-b-3xl',
            )}
          >
            <div className="relative group flex">
              {isAuthenticated && flag(userData.is_owner) ? (
                <ProfileMediaButton
                  className="absolute top-3 right-3 h-8 w-8 opacity-0 group-hover:opacity-100 duration-300 z-[20]"
                  onClick={() => setIsCoverModalOpen(true)}
                />
              ) : null}

              <div
                className="h-32 w-full max-w-screen-2xl object-cover lg:h-48 blur-lg rounded-3xl rounded-b-none bg-cover bg-center"
                style={{ backgroundImage: `url('${currentCover}')` }}
              />
              <div
                className="h-32 w-full max-w-screen-2xl object-cover lg:h-48 absolute rounded-3xl rounded-b-none bg-cover bg-center"
                style={{ backgroundImage: `url('${currentCover}')` }}
              />
            </div>

            <div className="p-3 flex flex-col md:flex-row gap-3">
              <div className="flex gap-1.5 items-center md:-mt-12 md:items-end flex-grow">
                <div className="group relative shrink-0">
                  {flag(userData.is_owner) ? (
                    <ProfileMediaButton
                      className="absolute -top-3 -right-3 w-8 h-8 opacity-0 group-hover:opacity-100 duration-300 z-[20]"
                      onClick={() => setIsPhotoModalOpen(true)}
                    />
                  ) : null}

                  <ProfileAvatar
                    image={currentAvatar}
                    isOnline={flag(userData.online)}
                    sizeClassName="h-16 w-16 md:h-24 md:w-24"
                  />
                </div>

                <div className="flex flex-col">
                  <span className="text-xl font-bold text-zinc-100 flex items-center gap-1.5">
                    <span>{`${userData.fname || ''} ${userData.lname || ''}`.trim()}</span>
                    {isAuthenticated && flag(userData.verify) ? (
                    <SvgIcon className="w-5 h-5 inline fill-blue-500" id="IC-verify" viewBox="0 0 48 48" />
                  ) : null}
                  </span>
                  {userData.description?.trim() ? (
                    <span className="text-xs md:text-sm text-zinc-300 lg:truncate lg:w-96">
                      {userData.description}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 items-center shrink-0">
                {isAuthenticated && user && friendButtonConfig ? (
                  <button
                    type="button"
                    onClick={() => void handleFriendButtonClick()}
                    className={cn(
                      'border border-zinc-600/30 flex items-center justify-center px-3 py-1 duration-300 active:scale-95 rounded-3xl w-full md:w-auto cursor-pointer',
                      friendButtonConfig.colorClassName,
                    )}
                  >
                    {friendButtonConfig.icon}
                    {friendButtonConfig.label}
                  </button>
                ) : null}

                {isAuthenticated &&
                user &&
                !flag(userData.is_owner) &&
                String(userData.id) !== String(user?.id) ? (
                  <button
                    type="button"
                    onClick={() => void handleCreateDialog()}
                    className="border border-zinc-600/30 flex items-center justify-center px-3 py-1 bg-zinc-700 hover:bg-zinc-700/70 duration-300 active:scale-95 rounded-3xl w-full md:w-auto cursor-pointer"
                  >
                    <SvgIcon className="inline w-6 h-6 fill-white mr-2" id="IC-comments" />
                    <span>{strings.writetouser}</span>
                  </button>
                ) : null}

                {isAuthenticated && flag(userData.is_owner) ? (
                  <button
                    type="button"
                    onClick={() => router.push('/settings/account')}
                    className="border border-zinc-600/30 flex items-center justify-center px-3 py-1 bg-purple-500 hover:bg-purple-600 duration-300 active:scale-95 rounded-3xl w-full md:w-auto cursor-pointer"
                  >
                    <SvgIcon className="w-6 h-6 fill-white inline mr-2" id="IC-edit" />
                    <span>{strings.edit}</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse md:flex-row gap-3 flex-grow w-full">
            <div className="flex flex-grow min-w-0 w-full flex-col gap-3">
              <div
                id={`postsuser${userData.id}`}
                className="flex-grow flex flex-col gap-3 w-full min-w-0"
              >
                {postsLoading && posts.length === 0 ? (
                  <FeedPostSkeleton />
                ) : posts.length > 0 ? (
                  <PostsRenderer
                    currentUserId={user?.id ?? null}
                    lang={{
                      adultContentWarning: strings.adult_content_warning,
                      bookmarked: strings.bookmarked,
                      delete: strings.delete,
                      edit: strings.edit,
                      less: strings.less,
                      more: strings.more,
                      report: strings.report,
                      share: strings.share,
                      tobookmarks: strings.tbookmark,
                      translate: strings.translate,
                    }}
                    onBookmark={handleBookmark}
                    onComment={openCommentsModal}
                    onDelete={(post) => {
                      setDeleteTarget(post);
                      setIsDeleteModalOpen(true);
                    }}
                    onEdit={(post) => router.push(`/feed/edit?id=${post.id}`)}
                    onNavigate={(href) => router.push(href)}
                    onReport={(post) => {
                      setReportTarget({ id: post.id, type: 2 });
                      setIsReportModalOpen(true);
                    }}
                    onShare={(url) => {
                      setShareUrl(url);
                      setIsShareModalOpen(true);
                    }}
                    onTranslate={translatePost}
                    onVote={handleVote}
                    posts={posts}
                    shareBaseUrl="https://ancial.ru/feed/post"
                  />
                ) : (
                  <EmptyIllustration
                    title={strings.noposts}
                    description={strings.nopostsdesc}
                  />
                )}
              </div>

              {hasMorePages ? <div ref={loadMoreRef} className="h-4 w-full" /> : null}

              {isLoadingMore ? <FeedPostSkeleton /> : null}
            </div>

            <div className="flex flex-col md:gap-3 md:w-80 lg:w-96 shrink-0 -mt-3 md:mt-0 rounded-b-3xl md:rounded-b-none overflow-hidden">
              {hasFriends ? (
                <PeopleSection
                  borderClassName={cn(
                    hasSubscribers || hasGroups ? 'border-x' : 'border-x border-b rounded-b-3xl',
                  )}
                  onOpen={() => setIsFriendsModalOpen(true)}
                  title={strings.friends}
                >
                  {(userData.friends || []).slice(0, 6).map((friend) => (
                    <UserMiniCard
                      key={String(friend.id)}
                      image={friend.img || 'https://ancial.ru/includes/img/new_user.png'}
                      isOnline={flag(friend.online)}
                      label={friend.fname || ''}
                      onClick={() => navigateToUser(friend.username)}
                    />
                  ))}
                </PeopleSection>
              ) : null}

              {hasSubscribers ? (
                <PeopleSection
                  borderClassName={cn(
                    hasGroups ? 'border-x' : 'border-x border-b rounded-b-3xl',
                  )}
                  onOpen={() => setIsSubscribersModalOpen(true)}
                  title={strings.subscribers}
                >
                  {(userData.subscribers || []).slice(0, 6).map((subscriber) => (
                    <UserMiniCard
                      key={String(subscriber.id)}
                      image={subscriber.img || 'https://ancial.ru/includes/img/new_user.png'}
                      isOnline={flag(subscriber.online)}
                      label={subscriber.fname || ''}
                      onClick={() => navigateToUser(subscriber.username)}
                    />
                  ))}
                </PeopleSection>
              ) : null}

              {hasGroups ? (
                <PeopleSection
                  borderClassName="border-x border-b rounded-b-3xl"
                  onOpen={() => setIsGroupsModalOpen(true)}
                  title={strings.groups}
                >
                  {(userData.groups || []).slice(0, 6).map((group) => (
                    <GroupMiniCard
                      key={String(group.id)}
                      image={group.img || 'https://ancial.ru/includes/img/new_user.png'}
                      label={group.name || ''}
                      onClick={() => navigateToGroup(group.slnk)}
                    />
                  ))}
                </PeopleSection>
              ) : null}
            </div>
          </div>

          <div className="lg:hidden">
            <br />
            <br />
            <br />
          </div>
        </div>
      ) : null}

      <RelationGridModal
        emptyText="Нет друзей..."
        isOpen={isFriendsModalOpen}
        items={userData?.friends || []}
        onClose={() => setIsFriendsModalOpen(false)}
        onOpen={(value) => {
          setIsFriendsModalOpen(false);
          navigateToUser((value as UserPreview).username);
        }}
        title={strings.friends}
        type="users"
      />

      <RelationGridModal
        emptyText="Нет подписчиков..."
        isOpen={isSubscribersModalOpen}
        items={userData?.subscribers || []}
        onClose={() => setIsSubscribersModalOpen(false)}
        onOpen={(value) => {
          setIsSubscribersModalOpen(false);
          navigateToUser((value as UserPreview).username);
        }}
        title={strings.subscribers}
        type="users"
      />

      <RelationGridModal
        emptyText="Нет групп..."
        isOpen={isGroupsModalOpen}
        items={userData?.groups || []}
        onClose={() => setIsGroupsModalOpen(false)}
        onOpen={(value) => {
          setIsGroupsModalOpen(false);
          navigateToGroup((value as GroupPreview).slnk);
        }}
        title={strings.groups}
        type="groups"
      />

      <Modal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        title={strings.updateprofilepicture}
        width="sm"
      >
        <input
          type="file"
          accept="image/*"
          disabled={isUploadingPhoto}
          onChange={(event) => {
            void updateProfileMedia('img', event.target.files?.[0] || null);
            event.currentTarget.value = '';
          }}
          className="mt-1 block w-full text-sm text-zinc-200 file:mr-4 file:rounded-full file:border-0 file:bg-purple-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-purple-600"
        />
      </Modal>

      <Modal
        isOpen={isCoverModalOpen}
        onClose={() => setIsCoverModalOpen(false)}
        title={strings.updateprofilecover}
        width="sm"
      >
        <input
          type="file"
          accept="image/*"
          disabled={isUploadingCover}
          onChange={(event) => {
            void updateProfileMedia('cover', event.target.files?.[0] || null);
            event.currentTarget.value = '';
          }}
          className="mt-1 block w-full text-sm text-zinc-200 file:mr-4 file:rounded-full file:border-0 file:bg-purple-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-purple-600"
        />
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
        onReport={(targetComment) => {
          setReportTarget({ id: targetComment.id, type: 4 });
          setIsReportModalOpen(true);
        }}
        onNavigateToUser={(username) => {
          setIsCommentsModalOpen(false);
          navigateToUser(username);
        }}
        deleteLabel={strings.delete}
        reportLabel={strings.report}
        emptyTitle={strings.emptycomments}
        emptyDescription={strings.emptycommentsdesc}
        writeCommentPlaceholder={strings.writecomment}
      />

      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title={strings.report}
        width="sm"
      >
        <div className="flex flex-col justify-center rounded-3xl shadow overflow-hidden">
          {[
            { label: strings.spam, value: 'Спам' },
            { label: strings.prohibitedgood, value: 'Запрещённый товар' },
            { label: strings.scam, value: 'Обман' },
            { label: strings.violence, value: 'Насилие и вражда' },
            { label: strings.candidimage, value: 'Откровенное изображение' },
            { label: strings.propertyrights, value: 'Нарушение интеллектуальных прав' },
          ].map((reason) => (
            <button
              key={reason.value}
              type="button"
              onClick={() => void handleReport(reason.value)}
              className="text-left p-1.5 bg-zinc-800 text-lg cursor-pointer duration-300 hover:bg-zinc-700 active:scale-95 active:rounded-xl"
            >
              {reason.label}
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={strings.share}
        width="sm"
      >
        <div className="flex flex-col gap-3 justify-center items-center">
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
            <SvgIcon className="w-24 h-24 fill-white" id="IC-times" />
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
