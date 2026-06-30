'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Modal from '../../components/modal';
import ShareModal from '../../components/share-modal';
import { CommentsModal, type FeedComment } from '../../components/comments-modal';
import {
  GroupMiniCard,
  PeopleSection,
  RelationGridModal,
  type UserPreview,
  UserMiniCard,
} from '../../components/profile-ui';
import PostsRenderer, {
  type PostCardLang,
  type PostData,
} from '../../components/posts-renderer';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useDragScroll } from '../../hooks/useDragScroll';
import { AncialAPI } from '../../lib/api-v2';
import {
  cn,
  SvgIcon,
  uploadImageToImgbb,
} from '../../feed/editor-shared';
import FeedPostSkeleton from '../../feed/feed-post-skeleton';

type Id = string | number;

interface OfficialGroupPreview {
  id: Id;
  img?: string | null;
  name?: string | null;
  slnk?: string | null;
}

interface GroupPageData {
  cover?: string | null;
  creator?: Id | null;
  description?: string | null;
  id: Id;
  img?: string | null;
  is_creator?: boolean | number | string | null;
  is_subscribed?: boolean | number | string | null;
  name?: string | null;
  official_groups?: OfficialGroupPreview[] | null;
  slnk?: string | null;
  status?: boolean | number | string | null;
  subscribers?: UserPreview[] | null;
  verify?: boolean | number | string | null;
}

interface GroupPageResponse {
  blocked?: boolean;
  data?: GroupPageData;
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

interface GroupProfileCacheEntry {
  currentLastId: Id;
  groupData: GroupPageData;
  hasMorePages: boolean;
  posts: PostData[];
}

function flag(value: boolean | number | string | null | undefined) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function toNumber(value: number | string | boolean | null | undefined) {
  const nextValue = Number(value ?? 0);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

function getGroupProfileCacheKey(
  link: string,
  userId: string | null | undefined,
  isAuthenticated: boolean,
) {
  const normalizedLink = link.trim().toLowerCase() || '__unknown__';
  const viewer = isAuthenticated ? `user-${userId ?? 'auth'}` : 'guest';
  return `group_profile_cache:${viewer}:${normalizedLink}`;
}

function readGroupProfileCache(key: string): GroupProfileCacheEntry | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = window.localStorage.getItem(key);
    if (!cached) return null;

    const parsed = JSON.parse(cached) as Partial<GroupProfileCacheEntry>;
    if (!parsed.groupData || !Array.isArray(parsed.posts)) return null;

    return {
      currentLastId: parsed.currentLastId ?? 0,
      groupData: parsed.groupData,
      hasMorePages: typeof parsed.hasMorePages === 'boolean' ? parsed.hasMorePages : true,
      posts: parsed.posts,
    };
  } catch (error) {
    console.error('Failed to read group profile cache', error);
    return null;
  }
}

function writeGroupProfileCache(key: string, value: GroupProfileCacheEntry) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to write group profile cache', error);
  }
}

function clearGroupProfileCache(key: string) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear group profile cache', error);
  }
}

function sanitizeGroupLink(value: string) {
  return value.replace(/[-_*/+=()~!@#$%^&*.<>|]/g, '');
}

// Local helpers removed

function EmptyIllustration({
  description,
  title,
}: {
  description?: string;
  title: string;
}) {
  return (
    <div className="text-center w-full flex flex-col gap-0.5 justify-center items-center bg-zinc-900 text-zinc-100 rounded-3xl p-6 border border-zinc-600/30">
      <Image
        src="/img/status/nothingfound.webp"
        alt="Nothing found"
        width={224}
        height={224}
        className="h-56 w-auto"
      />
      <span className="text-base text-zinc-200 w-full text-center font-black">{title}</span>
      {description ? (
        <span className="text-sm text-zinc-400 w-full text-center font-medium">{description}</span>
      ) : null}
    </div>
  );
}

function GroupSkeleton() {
  return (
    <div className="flex flex-col gap-3 items-center flex-grow w-screen md:max-w-screen-2xl">
      <div className="w-full px-3">
        <div className="animate-pulse bg-zinc-700 h-8 w-48 rounded-md mt-3"></div>
      </div>
      <div className="bg-zinc-900 border border-zinc-600/30 rounded-3xl flex flex-col w-full md:shadow duration-300">
        <div className="animate-pulse bg-zinc-700 h-32 lg:h-48 w-full rounded-t-3xl"></div>
        <div className="p-3 flex flex-col md:flex-row gap-3">
          <div className="flex gap-1.5 items-center flex-grow">
            <div className="animate-pulse bg-zinc-700 w-16 h-16 md:w-24 md:h-24 rounded-full"></div>
            <div className="flex flex-col gap-2">
              <div className="animate-pulse bg-zinc-700 h-6 w-32 rounded-md"></div>
              <div className="animate-pulse bg-zinc-700 h-4 w-48 rounded-md"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileMediaButton({
  className,
  onClick,
}: {
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'active:scale-95 border border-zinc-600/30 bg-zinc-800/80 hover:bg-zinc-700/80 backdrop-blur-lg flex items-center justify-center text-zinc-100 rounded-2xl hover:text-zinc-300 cursor-pointer duration-300',
        className,
      )}
    >
      <SvgIcon className="w-6 h-6 fill-white inline" id="IC-edit" />
    </button>
  );
}

export default function GroupProfileContent({ link }: { link: string }) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, lang, user } = useAuth();
  const { showNote } = useNotification();

  const abortRef = useRef<AbortController | null>(null);
  const currentLastIdRef = useRef<Id>(0);
  const hasMorePagesRef = useRef(true);
  const groupIdRef = useRef<Id | null>(null);
  const loadPostsRef = useRef<
    (
      groupId: Id,
      lastId: Id,
      append?: boolean,
      options?: { preserveExisting?: boolean },
    ) => Promise<void>
  >(async () => { });
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [groupData, setGroupData] = useState<GroupPageData | null>(null);
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
  const [isSubscribersModalOpen, setIsSubscribersModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isSavingGroupInfo, setIsSavingGroupInfo] = useState(false);
  const [editForm, setEditForm] = useState({
    desk: '',
    name: '',
    slnk: '',
  });

  const officialGroupsScrollRef = useDragScroll({ speed: 2 });

  const groupCacheKey = useMemo(
    () => getGroupProfileCacheKey(link, user?.id, isAuthenticated),
    [isAuthenticated, link, user?.id],
  );
  const groupDocumentTitle = useMemo(() => {
    if (!groupData) return null;

    const handle = groupData.slnk?.trim() || link;
    const name = groupData.name?.trim();
    return name ? `${name} ($${handle})` : `$${handle}`;
  }, [groupData, link]);

  useDocumentTitle(groupDocumentTitle);

  const strings = useMemo(() => {
    const fb = {
      adult_content_warning: 'Изображение может содержать контент 18+',
      apply: 'Применить',
      blockedgroupdesc: 'Сообщество заблокировано',
      bookmarked: 'В закладках',
      bookmarkadded: 'Добавлено в закладки',
      bookmarkremoved: 'Удалено из закладок',
      candidimage: 'Откровенное изображение',
      copylink: 'Скопировать ссылку',
      delete: 'Удалить',
      deletepost: 'Удалить пост',
      edit: 'Редактировать',
      editgroup: 'Редактировать сообщество',
      editgroupWARN: 'Будьте внимательны при изменении ссылки сообщества.',
      emptycomments: 'Комментариев пока нет',
      emptycommentsdesc: 'Будьте первым, кто что-то напишет.',
      errorhappend: 'Произошла ошибка =(',
      follow: 'Подписаться',
      groupdesc: 'Описание сообщества',
      groupname: 'Название сообщества',
      groupnotfound: 'Сообщество не найдено',
      home: 'Home',
      langname: 'en',
      less: 'Скрыть',
      linkcopied: 'Ссылка скопирована',
      linktogroup: 'Ссылка на сообщество',
      loading: 'Загрузка...',
      logintoreact: 'Войдите, чтобы взаимодействовать с публикациями',
      more: 'Подробнее',
      no: 'Нет',
      nomoreposts: 'Больше постов нет',
      noposts: 'Постов нет',
      nopostsdesc: 'Пока что здесь пусто...',
      nosubscribersgr: 'Пока здесь нет подписчиков',
      officialgroups: 'Официальные сообщества',
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
      successGroupUpdate: 'Это успех! Все готово, проверяйте!',
      tobookmarks: 'В закладки',
      translate: 'Перевести',
      unfollow: 'Отписаться',
      updateprofilecover: 'Обновить обложку профиля',
      updateprofilepicture: 'Обновить фото профиля',
      violence: 'Насилие и вражда',
      writecomment: 'Напишите комментарий',
      yes: 'Да',
    };
    return {
      adult_content_warning: lang?.adult_content_warning || fb.adult_content_warning,
      apply: lang?.apply || fb.apply,
      blockedgroupdesc: lang?.blockedgroupdesc || fb.blockedgroupdesc,
      bookmarked: lang?.bookmarked || fb.bookmarked,
      bookmarkadded: lang?.bookmarkadded || fb.bookmarkadded,
      bookmarkremoved: lang?.bookmarkremoved || fb.bookmarkremoved,
      candidimage: lang?.candidimage || fb.candidimage,
      copylink: lang?.copylink || fb.copylink,
      delete: lang?.delete || fb.delete,
      deletepost: lang?.deletepost || fb.deletepost,
      edit: lang?.edit || fb.edit,
      editgroup: lang?.editgroup || fb.editgroup,
      editgroupWARN: lang?.editgroupWARN || fb.editgroupWARN,
      emptycomments: lang?.emptycomments || fb.emptycomments,
      emptycommentsdesc: lang?.emptycommentsdesc || fb.emptycommentsdesc,
      errorhappend: lang?.errorhappend || fb.errorhappend,
      follow: lang?.follow || fb.follow,
      groupdesc: lang?.groupdesc || fb.groupdesc,
      groupname: lang?.groupname || fb.groupname,
      groupnotfound: lang?.groupnotfound || fb.groupnotfound,
      home: lang?.Home || lang?.home || fb.home,
      langname: lang?.langname || fb.langname,
      less: lang?.less || fb.less,
      linkcopied: lang?.linkcopied || fb.linkcopied,
      linktogroup: lang?.linktogroup || fb.linktogroup,
      loading: lang?.['loading...'] || fb.loading,
      logintoreact: lang?.logintoreact || fb.logintoreact,
      more: lang?.more || fb.more,
      no: lang?.no || fb.no,
      nomoreposts: lang?.nomoreposts || fb.nomoreposts,
      noposts: lang?.noposts || fb.noposts,
      nopostsdesc: lang?.nopostsdesc || fb.nopostsdesc,
      nosubscribersgr: lang?.nosubscribersgr || fb.nosubscribersgr,
      officialgroups: lang?.officialgroups || fb.officialgroups,
      postcomments: lang?.postcomments || fb.postcomments,
      prohibitedgood: lang?.prohibitedgood || fb.prohibitedgood,
      propertyrights: lang?.propertyrights || fb.propertyrights,
      reallywantdeletepost: lang?.reallywantdeletepost || fb.reallywantdeletepost,
      report: lang?.report || fb.report,
      scam: lang?.scam || fb.scam,
      share: lang?.share || fb.share,
      somethingwrong: lang?.somethingwrong || fb.somethingwrong,
      spam: lang?.spam || fb.spam,
      subscribers: lang?.subscribers || fb.subscribers,
      successGroupUpdate: fb.successGroupUpdate,
      tobookmarks: lang?.tobookmarks || fb.tobookmarks,
      translate: lang?.translate || fb.translate,
      unfollow: lang?.unfollow || fb.unfollow,
      updateprofilecover: lang?.updateprofilecover || fb.updateprofilecover,
      updateprofilepicture: lang?.updateprofilepicture || fb.updateprofilepicture,
      violence: lang?.violence || fb.violence,
      writecomment: lang?.writecomment || fb.writecomment,
      yes: lang?.yes || fb.yes,
    };
  }, [lang]);

  const postCardLang: Partial<PostCardLang> = {
    adultContentWarning: strings.adult_content_warning,
    bookmarked: strings.bookmarked,
    delete: strings.delete,
    edit: strings.edit,
    less: strings.less,
    more: strings.more,
    report: strings.report,
    share: strings.share,
    tobookmarks: strings.tobookmarks,
    translate: strings.translate,
  };

  const hasSubscribers = Boolean(groupData?.subscribers?.length);
  const hasOfficialGroups = Boolean(groupData?.official_groups?.length);

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
        const nextComments = await AncialAPI.getComments<FeedComment[]>(postId);
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

  const loadGroup = useCallback(
    async (options?: { preserveExisting?: boolean }) => {
      const preserveExisting = options?.preserveExisting ?? false;

      if (!preserveExisting) {
        setLoading(true);
      }
      setError(null);
      setBlocked(false);

      try {
        const data = await AncialAPI.getGroupPage<GroupPageData>(link);

        if (!data) {
          clearGroupProfileCache(groupCacheKey);
          setGroupData(null);
          groupIdRef.current = null;
          setBlocked(false);
          setError(strings.groupnotfound);
          setPosts([]);
          setPostsLoading(false);
          currentLastIdRef.current = 0;
          setHasMorePages(false);
          hasMorePagesRef.current = false;
          return;
        }

        if (String(data.status ?? 1) === '0') {
          clearGroupProfileCache(groupCacheKey);
          setGroupData(null);
          groupIdRef.current = null;
          setBlocked(true);
          setError(null);
          setPosts([]);
          setPostsLoading(false);
          currentLastIdRef.current = 0;
          setHasMorePages(false);
          hasMorePagesRef.current = false;
          return;
        }

        setGroupData(data);
        groupIdRef.current = data.id;
        setEditForm({
          desk: data.description || '',
          name: data.name || '',
          slnk: data.slnk || '',
        });
        setBlocked(false);
        setError(null);

        if (!preserveExisting) {
          setPosts([]);
          currentLastIdRef.current = 0;
          setHasMorePages(true);
          hasMorePagesRef.current = true;
          setPostsLoading(true);
        }

        void loadPostsRef.current(data.id, 0, false, { preserveExisting });
      } catch (nextError) {
        console.error('Failed to load group', nextError);

        if (!preserveExisting) {
          setGroupData(null);
          groupIdRef.current = null;
          setBlocked(false);
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
    [groupCacheKey, link, strings.groupnotfound, strings.somethingwrong],
  );

  const loadPosts = useCallback(
    async (
      groupId: Id,
      lastId: Id,
      append = false,
      options?: { preserveExisting?: boolean },
    ) => {
      if (!groupId) return;

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
        const response = await AncialAPI.getFeed<FeedResponse>(
          undefined,
          lastId,
          groupId,
          2,
          { signal: controller.signal }
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

        console.error('Failed to load group posts', nextError);
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

    const cached = readGroupProfileCache(groupCacheKey);
    if (cached) {
      setError(null);
      setBlocked(false);
      setGroupData(cached.groupData);
      setEditForm({
        desk: cached.groupData.description || '',
        name: cached.groupData.name || '',
        slnk: cached.groupData.slnk || '',
      });
      groupIdRef.current = cached.groupData.id;
      setPosts(cached.posts);
      setPostsLoading(false);
      currentLastIdRef.current = cached.currentLastId;
      setHasMorePages(cached.hasMorePages);
      hasMorePagesRef.current = cached.hasMorePages;
      setLoading(false);
      void loadGroup({ preserveExisting: true });
      return;
    }

    void loadGroup();

    return () => {
      abortRef.current?.abort();
    };
  }, [authLoading, groupCacheKey, loadGroup]);

  useEffect(() => {
    if (loading || postsLoading || !groupData || error || blocked) return;

    writeGroupProfileCache(groupCacheKey, {
      currentLastId: currentLastIdRef.current,
      groupData,
      hasMorePages,
      posts,
    });
  }, [blocked, error, groupCacheKey, groupData, hasMorePages, loading, posts, postsLoading]);

  useEffect(() => {
    const indicator = loadMoreRef.current;
    if (!indicator) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!hasMorePagesRef.current || postsLoading || isLoadingMore) return;
        if (!groupIdRef.current) return;

        void loadPostsRef.current(groupIdRef.current, currentLastIdRef.current, true);
      },
      { rootMargin: '0px 0px 20% 0px' },
    );

    observer.observe(indicator);
    return () => observer.disconnect();
  }, [isLoadingMore, posts.length, postsLoading, groupData?.id]);

  const handleBookmark = async (post: PostData, nextValue: boolean) => {
    try {
      const response = (await AncialAPI.postAction('bookmark', { pid: post.id })) as { message: string, action: string };

      showNote({
        content: response.message,
        html: true,
        type: 'success',
        time: 5,
      });

      updatePost(post.id, (currentPost) => {
        const isAdded = response.action === 'added';
        const isRemoved = response.action === 'removed';
        const nextBookmarked = isAdded ? true : isRemoved ? false : nextValue;
        const currentAmount = toNumber(currentPost.bookmarked_amount);

        return {
          ...currentPost,
          bookmarked_amount: Math.max(
            0,
            isAdded
              ? currentAmount + 1
              : isRemoved
                ? currentAmount - 1
                : currentAmount + (nextBookmarked ? 1 : -1),
          ),
          is_bookmarked: nextBookmarked,
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
      const response = (await AncialAPI.votePost(post.id, direction)) as { status: string };

      if (response.status === 'nlog') {
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
        content: translatedContent,
        title: translatedTitle,
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
      await AncialAPI.createComment(activeCommentsPost.id, commentInput.trim());

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
      const response = (await AncialAPI.reportAction({ id: currentTarget.id, type: currentTarget.type, comment: reason })) as { message: string };

      showNote({
        content: response.message || 'Жалоба отправлена',
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

  const handleSubscription = async (action: 'sub' | 'unsub') => {
    if (!groupData) return;

    try {
      const response = (await AncialAPI.groupSubscription(action, groupData.id)) as { message: string };

      showNote({
        content: response.message || 'Готово',
        html: true,
        type: 'success',
        time: 5,
      });

      await loadGroup({ preserveExisting: true });
    } catch (nextError) {
      console.error('Subscription action failed', nextError);
      showNote({
        content: strings.errorhappend,
        type: 'error',
        time: 5,
      });
    }
  };

  const updateGroupMedia = async (field: 'cover' | 'img', file: File | null) => {
    if (!file || !groupData) return;

    const setUploading = field === 'img' ? setIsUploadingPhoto : setIsUploadingCover;
    setUploading(true);

    try {
      showNote({
        content: strings.loading,
        type: 'info',
        time: 5,
      });

      const uploadedUrl = await uploadImageToImgbb(file);

      const response = (await AncialAPI.updateGroupInfo({
        gid: String(groupData.id),
        [field]: uploadedUrl,
      })) as { message: string };

      const message = response.message || strings.successGroupUpdate;

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

      await loadGroup({ preserveExisting: true });
    } catch (nextError) {
      console.error('Group media update failed', nextError);
      showNote({
        content: strings.errorhappend,
        type: 'error',
        time: 5,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEditFieldChange = (field: 'desk' | 'name' | 'slnk', value: string) => {
    setEditForm((current) => ({
      ...current,
      [field]: field === 'slnk' ? sanitizeGroupLink(value) : value,
    }));
  };

  const handleSaveGroupInfo = async () => {
    if (!groupData) return;

    setIsSavingGroupInfo(true);

    try {
      const response = (await AncialAPI.updateGroupInfo({
        desk: editForm.desk,
        gid: String(groupData.id),
        name: editForm.name,
        slnk: editForm.slnk,
      })) as { message: string };

      const message = response.message || 'Данные обновлены!';

      showNote({
        content: message,
        html: true,
        type: 'success',
        time: 5,
      });

      if (message.trim() === 'Данные обновлены!') {
        clearGroupProfileCache(groupCacheKey);
        setIsEditModalOpen(false);

        const nextLink = editForm.slnk.trim() || String(groupData.slnk || link);
        if (nextLink !== String(groupData.slnk || link)) {
          router.push(`/$${nextLink}`);
          return;
        }

        await loadGroup({ preserveExisting: true });
      }
    } catch (nextError) {
      console.error('Save group info failed', nextError);
      showNote({
        content: strings.errorhappend,
        type: 'error',
        time: 5,
      });
    } finally {
      setIsSavingGroupInfo(false);
    }
  };

  const currentCover = groupData?.cover || '/img/covers/placeholder.png';
  const currentAvatar = groupData?.img || 'https://ancial.ru/includes/img/new_user.png';

  return (
    <div className="flex justify-center items-center md:py-3">
      {loading ? (
        <GroupSkeleton />
      ) : blocked ? (
        <div className="flex flex-col gap-3 min-h-screen items-center justify-center -m-3 p-3">
          <Image
            src="/img/status/nothingfound.webp"
            alt="Blocked group"
            width={224}
            height={224}
            className="h-56 w-auto"
          />
          <div className="text-center text-zinc-200">{strings.blockedgroupdesc}</div>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="cursor-pointer px-4 py-2 rounded-3xl shadow bg-purple-500 hover:bg-purple-600 duration-300 active:scale-95 uppercase"
          >
            {strings.home}
          </button>
        </div>
      ) : error ? (
        <div className="flex flex-col gap-3 min-h-screen items-center justify-center -m-3 p-3">
          <Image
            src="/img/status/nothingfound.webp"
            alt="Group error"
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
      ) : groupData ? (
        <div className="flex flex-col gap-3 items-center flex-grow w-screen md:max-w-screen-2xl">
          <span className="text-3xl font-extralight w-full pt-3 pl-3 md:pt-0 md:pl-0 truncate">
            ${groupData.slnk}
          </span>

          <div className="border border-zinc-600/30 border-b-0 md:border-b bg-zinc-900 md:rounded-3xl flex flex-col w-full md:shadow duration-300 rounded-t-3xl">
            <div className="relative group flex">
              {isAuthenticated && flag(groupData.is_creator) ? (
                <ProfileMediaButton
                  className="absolute top-3 right-3 h-8 w-8 opacity-0 group-hover:opacity-100 duration-300 z-[20]"
                  onClick={() => setIsCoverModalOpen(true)}
                />
              ) : null}

              <div
                className="h-32 w-full max-w-screen-2xl lg:h-48 blur-lg rounded-3xl rounded-b-none bg-cover bg-center"
                style={{ backgroundImage: `url('${currentCover}')` }}
              />
              <div
                className="h-32 w-full max-w-screen-2xl lg:h-48 absolute rounded-3xl rounded-b-none bg-cover bg-center"
                style={{ backgroundImage: `url('${currentCover}')` }}
              />
            </div>

            <div className="p-3 flex flex-col md:flex-row gap-3">
              <div className="flex gap-1.5 items-center md:-mt-12 md:items-end flex-grow">
                <div className="group relative shrink-0">
                  {flag(groupData.is_creator) ? (
                    <ProfileMediaButton
                      className="absolute -top-3 -right-3 w-8 h-8 opacity-0 group-hover:opacity-100 duration-300 z-[20]"
                      onClick={() => setIsPhotoModalOpen(true)}
                    />
                  ) : null}

                  <div
                    className="shadow duration-300 h-16 w-16 md:h-24 md:w-24 rounded-full bg-cover bg-center"
                    style={{ backgroundImage: `url('${currentAvatar}')` }}
                  />
                </div>

                <div className="flex flex-col">
                  <span className="text-xl font-bold text-zinc-100 flex items-center gap-1.5">
                    <span>{groupData.name}</span>
                    {flag(groupData.verify) ? (
                      <SvgIcon className="w-5 h-5 inline fill-blue-500" id="IC-verify" viewBox="0 0 48 48" />
                    ) : null}
                  </span>
                  {groupData.description?.trim() ? (
                    <span className="text-xs md:text-sm text-zinc-300 lg:truncate lg:w-96">
                      {groupData.description}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 items-center shrink-0">
                {isAuthenticated && flag(groupData.is_creator) ? (
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="border border-zinc-600/30 cursor-pointer flex items-center justify-center px-3 py-1 bg-purple-500 hover:bg-purple-600 duration-300 active:scale-95 rounded-3xl w-full md:w-auto"
                  >
                    <SvgIcon className="w-6 h-6 fill-white inline mr-2" id="IC-edit" />
                    <span>{strings.edit}</span>
                  </button>
                ) : null}

                {isAuthenticated && !flag(groupData.is_subscribed) ? (
                  <button
                    type="button"
                    onClick={() => void handleSubscription('sub')}
                    className="border border-zinc-600/30 cursor-pointer flex items-center justify-center px-3 py-1 bg-emerald-500 hover:bg-emerald-600 duration-300 active:scale-95 rounded-3xl w-full md:w-auto"
                  >
                    <SvgIcon className="w-6 h-6 inline fill-white mr-2" id="IC-plus" />
                    <span>{strings.follow}</span>
                  </button>
                ) : null}

                {isAuthenticated && flag(groupData.is_subscribed) ? (
                  <button
                    type="button"
                    onClick={() => void handleSubscription('unsub')}
                    className="border border-zinc-600/30 cursor-pointer flex items-center justify-center px-3 py-1 bg-red-500 hover:bg-red-600 duration-300 active:scale-95 rounded-3xl w-full md:w-auto"
                  >
                    <SvgIcon className="w-6 h-6 inline fill-white mr-2" id="IC-times" />
                    <span>{strings.unfollow}</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse md:flex-row gap-3 flex-grow w-full">
            <div className="flex flex-grow w-full flex-col gap-3">
              <div
                id={`postsgroup${groupData.id}`}
                className="flex-grow flex flex-col gap-3 w-full"
              >
                {postsLoading && posts.length === 0 ? (
                  <FeedPostSkeleton />
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
                  <EmptyIllustration title={strings.noposts} description={strings.nopostsdesc} />
                )}
              </div>

              {hasMorePages ? <div ref={loadMoreRef} className="h-4 w-full" /> : null}

              {isLoadingMore ? <FeedPostSkeleton /> : null}
            </div>

            <div className="flex flex-col md:gap-3 md:w-80 lg:w-96 shrink-0 -mt-3 md:mt-0 rounded-b-3xl md:rounded-b-none overflow-hidden">
              {hasSubscribers ? (
                <PeopleSection
                  borderClassName={hasOfficialGroups ? 'border-x' : 'border-x border-b rounded-b-3xl'}
                  onOpen={() => setIsSubscribersModalOpen(true)}
                  title={strings.subscribers}
                >
                  {(groupData.subscribers || []).slice(0, 6).map((subscriber) => (
                    <UserMiniCard
                      key={String(subscriber.id)}
                      image={subscriber.img || 'https://ancial.ru/includes/img/new_user.png'}
                      isOnline={flag(subscriber.online)}
                      label={subscriber.fname || ''}
                      onClick={() => navigateToUser(subscriber.username)}
                    />
                  ))}
                </PeopleSection>
              ) : (
                <div
                  className={cn(
                    'md:rounded-3xl md:border border-zinc-600/30 bg-zinc-900 flex flex-col items-center md:shadow duration-300',
                    hasOfficialGroups ? 'border-x' : 'border-x border-b rounded-3xl',
                  )}
                >
                  <div className="flex justify-start items-start w-full px-3 md:pt-3">
                    <span className="text-zinc-300 text-lg font-thin">{strings.subscribers}</span>
                  </div>
                  <div className="w-full px-3 mb-3">
                    <span className="text-zinc-400 text-xs md:text-sm">{strings.nosubscribersgr}</span>
                  </div>
                </div>
              )}

              {hasOfficialGroups ? (
                <div className="md:rounded-3xl md:border border-zinc-600/30 bg-zinc-900 flex flex-col items-center md:shadow duration-300 border-x border-b rounded-b-3xl">
                  <div className="flex justify-start items-start w-full px-3 md:pt-3">
                    <span className="text-zinc-300 text-lg font-thin duration-300">
                      {strings.officialgroups}
                    </span>
                  </div>
                  <div ref={officialGroupsScrollRef} className="drag-scroll overflow-x-auto viewport w-full px-3 mb-3 flex flex-nowrap md:rounded-2xl">
                    <div className="flex flex-row flex-nowrap gap-3 justify-center items-center flex-shrink-0">
                      {(groupData.official_groups || []).map((officialGroup) => (
                        <GroupMiniCard
                          key={String(officialGroup.id)}
                          image={officialGroup.img || 'https://ancial.ru/includes/img/new_user.png'}
                          label={officialGroup.name || ''}
                          onClick={() => navigateToGroup(officialGroup.slnk)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="lg:hidden bg-default">
            <br />
            <br />
            <br />
          </div>
        </div>
      ) : null}

      <RelationGridModal
        emptyText="Нет подписчиков..."
        isOpen={isSubscribersModalOpen}
        items={groupData?.subscribers || []}
        onClose={() => setIsSubscribersModalOpen(false)}
        onOpen={(value) => {
          setIsSubscribersModalOpen(false);
          navigateToUser('username' in value ? value.username : '');
        }}
        title={strings.subscribers}
        type="users"
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
            void updateGroupMedia('img', event.target.files?.[0] || null);
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
            void updateGroupMedia('cover', event.target.files?.[0] || null);
            event.currentTarget.value = '';
          }}
          className="mt-1 block w-full text-sm text-zinc-200 file:mr-4 file:rounded-full file:border-0 file:bg-purple-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-purple-600"
        />
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={strings.editgroup}
        width="sm"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSaveGroupInfo();
          }}
          className="flex flex-col gap-3"
        >
          <div
            className="border border-zinc-600/30 p-3 bg-amber-500/25 text-amber-400 shadow rounded-3xl w-full"
            dangerouslySetInnerHTML={{ __html: strings.editgroupWARN }}
          />

          <div className="form-control">
            <label className="label">
              <span className="label-text">{strings.linktogroup}</span>
            </label>
            <div className="flex">
              <span className="border border-zinc-600/30 bg-zinc-700 p-2 text-zinc-300 placeholder-zinc-500 rounded-l-3xl h-12 w-40 sm:w-48 cursor-not-allowed flex items-center justify-start">
                ancial.ru/$
              </span>
              <input
                type="text"
                value={editForm.slnk}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  handleEditFieldChange('slnk', event.target.value)
                }
                className="border border-zinc-600/30 bg-zinc-800 p-2 text-zinc-100 placeholder-zinc-500 rounded-r-3xl h-12 w-full"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">{strings.groupname}</span>
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleEditFieldChange('name', event.target.value)
              }
              className="border border-zinc-600/30 bg-zinc-800 p-2 text-zinc-100 placeholder-zinc-500 rounded-3xl h-12 w-full"
              autoComplete="off"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">{strings.groupdesc}</span>
            </label>
            <input
              type="text"
              value={editForm.desk}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleEditFieldChange('desk', event.target.value)
              }
              className="border border-zinc-600/30 bg-zinc-800 p-2 text-zinc-100 placeholder-zinc-500 rounded-3xl h-12 w-full"
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingGroupInfo}
            className={cn(
              'border border-zinc-600/30 cursor-pointer w-full rounded-3xl flex items-center justify-center bg-purple-500 hover:bg-purple-600 duration-300 active:scale-95 px-3 py-2',
              isSavingGroupInfo && 'opacity-60 cursor-not-allowed',
            )}
          >
            {strings.apply}
          </button>
        </form>
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

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={strings.share}
        shareUrl={shareUrl}
        copyLabel={strings.copylink}
        onCopied={() => {
          showNote({
            content: strings.linkcopied,
            type: 'success',
            time: 5,
          });
        }}
        onCopyFailed={() => {
          showNote({
            content: strings.somethingwrong,
            type: 'error',
            time: 5,
          });
        }}
      />

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
