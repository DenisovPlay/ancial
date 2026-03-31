'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import Modal from '../../../components/modal';
import { Dropdown, DropdownItem } from '../../../components/navigation';
import { PostCard, type PostCardLang, type PostData } from '../../../components/posts-renderer';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import FeedPostSkeleton from '../../feed-post-skeleton';

type Id = string | number;

interface SinglePostResponse {
  data?: PostData;
  error?: string;
  success?: boolean;
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
      <use href="/icons.svg#verify"></use>
    </svg>
  );
}

function EmptyIllustration({
  title,
}: {
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

export default function SinglePostContent({ postId }: { postId: string }) {
  const router = useRouter();
  const { lang, isAuthenticated, user } = useAuth();
  const { showNote } = useNotification();
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const commentsSectionRef = useRef<HTMLDivElement | null>(null);

  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PostData | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const strings = useMemo(() => {
    const fallback = {
      bookmarkadded: 'Добавлено в закладки',
      bookmarked: 'В закладках',
      bookmarkremoved: 'Удалено из закладок',
      candidimage: 'Откровенное изображение',
      copylink: 'Скопировать ссылку',
      delete: 'Удалить',
      deletepost: 'Удалить пост',
      emptycomments: 'Комментариев пока нет',
      emptycommentsdesc: 'Будьте первым, кто что-то напишет.',
      langname: 'en',
      less: 'Скрыть',
      linkcopied: 'Ссылка скопирована',
      logintoreact: 'Войдите, чтобы взаимодействовать с публикациями',
      more: 'Подробнее',
      no: 'Нет',
      post: 'Пост',
      postcomments: 'Комментарии',
      postnotfound: 'Запись не найдена',
      prohibitedgood: 'Запрещённый товар',
      propertyrights: 'Нарушение интеллектуальных прав',
      reallywantdeletepost: 'Вы действительно хотите удалить пост?',
      report: 'Пожаловаться',
      scam: 'Обман',
      share: 'Поделиться',
      somethingwrong: 'Что-то пошло не так',
      spam: 'Спам',
      tbookmark: 'В закладки',
      violence: 'Насилие и вражда',
      writecomment: 'Напишите комментарий',
      yes: 'Да',
    };

    return {
      bookmarkadded: lang?.bookmarkadded || fallback.bookmarkadded,
      bookmarked: lang?.bookmarked || fallback.bookmarked,
      bookmarkremoved: lang?.bookmarkremoved || fallback.bookmarkremoved,
      candidimage: lang?.candidimage || fallback.candidimage,
      copylink: lang?.copylink || fallback.copylink,
      delete: lang?.delete || fallback.delete,
      deletepost: lang?.deletepost || fallback.deletepost,
      emptycomments: lang?.emptycomments || fallback.emptycomments,
      emptycommentsdesc: lang?.emptycommentsdesc || fallback.emptycommentsdesc,
      langname: lang?.langname || fallback.langname,
      less: lang?.less || fallback.less,
      linkcopied: lang?.linkcopied || fallback.linkcopied,
      logintoreact: lang?.logintoreact || fallback.logintoreact,
      more: lang?.more || fallback.more,
      no: lang?.no || fallback.no,
      post: lang?.post || fallback.post,
      postcomments: lang?.postcomments || fallback.postcomments,
      postnotfound: lang?.postnotfound || fallback.postnotfound,
      prohibitedgood: lang?.prohibitedgood || fallback.prohibitedgood,
      propertyrights: lang?.propertyrights || fallback.propertyrights,
      reallywantdeletepost: lang?.reallywantdeletepost || fallback.reallywantdeletepost,
      report: lang?.report || fallback.report,
      scam: lang?.scam || fallback.scam,
      share: lang?.share || fallback.share,
      somethingwrong: lang?.somethingwrong || fallback.somethingwrong,
      spam: lang?.spam || fallback.spam,
      tbookmark: lang?.tobookmarks || fallback.tbookmark,
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

  const loadComments = useCallback(async (nextPostId: Id) => {
    setIsCommentsLoading(true);

    try {
      const nextComments = await apiJson<FeedComment[]>(`/api/posts/comments.php?id=${nextPostId}`);
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
  }, [showNote, strings.somethingwrong]);

  useEffect(() => {
    const loadPost = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiJson<SinglePostResponse>(`/api/posts/get_post.php?id=${postId}`);

        if (result.success && result.data) {
          setPost(result.data);
          await loadComments(result.data.id);
        } else {
          setError(result.error || strings.postnotfound);
        }
      } catch (nextError) {
        console.error('Error loading post:', nextError);
        setError(strings.somethingwrong);
      } finally {
        setLoading(false);
      }
    };

    void loadPost();
  }, [loadComments, postId, strings.postnotfound, strings.somethingwrong]);

  const updatePost = (updater: (currentPost: PostData) => PostData) => {
    setPost((currentPost) => (currentPost ? updater(currentPost) : currentPost));
  };

  const handleBookmark = async (targetPost: PostData, nextValue: boolean) => {
    try {
      const response = await apiText(`/api/posts/bookmarks.php?pid=${targetPost.id}`);

      showNote({
        content: response,
        html: true,
        type: 'success',
        time: 5,
      });

      updatePost((currentPost) => {
        if (String(currentPost.id) !== String(targetPost.id)) return currentPost;

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

  const handleVote = async (targetPost: PostData, direction: 'up' | 'down') => {
    try {
      const response = await apiText(`/api/posts/vote.php?pid=${targetPost.id}&vt=${direction}`);

      if (response === 'nlog') {
        showNote({
          content: strings.logintoreact,
          type: 'success',
          time: 5,
        });
        return;
      }

      updatePost((currentPost) => {
        if (String(currentPost.id) !== String(targetPost.id)) return currentPost;

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

  const translatePost = async (targetPost: PostData) => {
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
        translateText(htmlToText(targetPost.title)),
        translateText(htmlToText(targetPost.content)),
      ]);

      updatePost((currentPost) => ({
        ...currentPost,
        title: translatedTitle,
        content: translatedContent,
      }));
    } catch (nextError) {
      console.error('Translate failed', nextError);
    }
  };

  const scrollToComments = () => {
    commentsSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });

    if (isAuthenticated) {
      window.setTimeout(() => {
        commentInputRef.current?.focus();
      }, 250);
    }
  };

  const handleCreateComment = async () => {
    if (!post || !commentInput.trim()) return;

    try {
      await apiText(`/api/posts/createcomment.php?pid=${post.id}`, {
        body: new URLSearchParams({ content: commentInput.trim() }).toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      });

      setCommentInput('');
      updatePost((currentPost) => ({
        ...currentPost,
        comments_count: toNumber(currentPost.comments_count) + 1,
      }));
      await loadComments(post.id);
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

      updatePost((currentPost) => ({
        ...currentPost,
        comments_count: Math.max(0, toNumber(currentPost.comments_count) - 1),
      }));
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

      router.push('/feed');
    } catch (nextError) {
      console.error('Delete post failed', nextError);
      showNote({
        content: strings.somethingwrong,
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

  return (
    <div className="flex flex-col jusitify-center items-center gap-3 pb-64">
      <div className="max-w-3xl w-full flex pt-3 pl-3 md:pl-0 -mb-3 z-[30]">
        <button
          type="button"
          onClick={() => router.push('/feed')}
          className="text-3xl font-extralight flex items-center gap-1.5 duration-300 active:scale-95 cursor-pointer"
        >
          <SvgIcon
            className="w-8 h-8 fill-white inline hover:fill-zinc-300"
            id="IC-chevron-left"
          />
          <span>{strings.post}</span>
        </button>
      </div>

      <div className="w-full flex flex-col gap-3 justify-center items-center pt-3">
        <div className="max-w-3xl w-full flex flex-col gap-3">
          {loading && <FeedPostSkeleton />}

          {!loading && error && <EmptyIllustration title={error} />}

          {!loading && !error && post && (
            <>
              <PostCard
                currentUserId={user?.id ?? null}
                hideComments={true}
                lang={postCardLang}
                onBookmark={handleBookmark}
                onComment={scrollToComments}
                onDelete={(targetPost) => {
                  setDeleteTarget(targetPost);
                  setIsDeleteModalOpen(true);
                }}
                onNavigate={(href) => router.push(href)}
                onReport={(targetPost) => {
                  setReportTarget({ id: targetPost.id, type: 2 });
                  setIsReportModalOpen(true);
                }}
                onShare={(url) => {
                  setShareUrl(url);
                  setIsShareModalOpen(true);
                }}
                onTranslate={translatePost}
                onVote={handleVote}
                post={post}
                renderIndex={1}
                shareBaseUrl="https://ancial.ru/feed/post"
              />

              <div
                ref={commentsSectionRef}
                className="bg-zinc-900 rounded-3xl border border-zinc-600/30 p-3 text-zinc-100"
              >
                <div className="flex items-center gap-3 mb-3">
                  <SvgIcon className="w-6 h-6 fill-white" id="IC-comments" />
                  <span className="text-xl font-bold">{strings.postcomments}</span>
                  <span className="text-zinc-400">{`(${toNumber(post.comments_count)})`}</span>
                </div>

                {isAuthenticated && (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleCreateComment();
                    }}
                    className="form-control flex-1 text-zinc-100 mb-3 rounded-full shadow"
                  >
                    <div className="relative flex bg-zinc-800 rounded-full w-full p-1 h-12">
                      <input
                        ref={commentInputRef}
                        placeholder={strings.writecomment}
                        type="text"
                        autoComplete="off"
                        value={commentInput}
                        onChange={(event) => setCommentInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && event.ctrlKey) {
                            event.preventDefault();
                            void handleCreateComment();
                          }
                        }}
                        className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600"
                      />
                      <button
                        type="submit"
                        disabled={!commentInput.trim()}
                        className={cn(
                          'cursor-pointer shrink-0 w-10 h-10 flex items-center justify-center active:scale-95 duration-300 rounded-full hover:bg-zinc-900',
                          !commentInput.trim() && 'opacity-50',
                        )}
                      >
                        <svg className="fill-white w-8 h-8 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                          <path d="M39.175,10.016c1.687,0,2.131,1.276,1.632,4.272c-0.571,3.426-2.216,14.769-3.528,21.83 c-0.502,2.702-1.407,3.867-2.724,3.867c-0.724,0-1.572-0.352-2.546-0.995c-1.32-0.872-7.984-5.279-9.431-6.314 c-1.32-0.943-3.141-2.078-0.857-4.312c0.813-0.796,6.14-5.883,10.29-9.842c0.443-0.423,0.072-1.068-0.42-1.068 c-0.112,0-0.231,0.034-0.347,0.111c-5.594,3.71-13.351,8.859-14.338,9.53c-0.987,0.67-1.949,1.1-3.231,1.1 c-0.655,0-1.394-0.112-2.263-0.362c-1.943-0.558-3.84-1.223-4.579-1.477c-2.845-0.976-2.17-2.241,0.593-3.457 c11.078-4.873,25.413-10.815,27.392-11.637C36.746,10.461,38.178,10.016,39.175,10.016 M39.175,7.016L39.175,7.016 c-1.368,0-3.015,0.441-5.506,1.474L33.37,8.614C22.735,13.03,13.092,17.128,6.218,20.152c-1.074,0.473-4.341,1.91-4.214,4.916 c0.054,1.297,0.768,3.065,3.856,4.124l0.228,0.078c0.862,0.297,2.657,0.916,4.497,1.445c1.12,0.322,2.132,0.478,3.091,0.478 c1.664,0,2.953-0.475,3.961-1.028c-0.005,0.168-0.001,0.337,0.012,0.507c0.182,2.312,1.97,3.58,3.038,4.338l0.149,0.106 c1.577,1.128,8.714,5.843,9.522,6.376c1.521,1.004,2.894,1.491,4.199,1.491c2.052,0,4.703-1.096,5.673-6.318 c0.921-4.953,1.985-11.872,2.762-16.924c0.331-2.156,0.603-3.924,0.776-4.961c0.349-2.094,0.509-4.466-0.948-6.185 C42.208,7.875,41.08,7.016,39.175,7.016L39.175,7.016z"></path>
                        </svg>
                      </button>
                    </div>
                  </form>
                )}

                <div id="comments-container" className="flex flex-col gap-3">
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
                        onNavigateToUser={(username) => router.push(`/@${username}`)}
                        onReport={(targetComment) => {
                          setReportTarget({ id: targetComment.id, type: 4 });
                          setIsReportModalOpen(true);
                        }}
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
            </>
          )}
        </div>
      </div>

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
