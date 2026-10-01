'use client';
import { coerceToFinite as toNumber } from '../../../lib/convert';

import { goBackOr } from '../../../lib/go-back';
import { clearFeedSnapshots } from '../../feed-snapshot';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSanitizedHtml } from '../../../lib/use-sanitized-html';

import { CommentsEmptyState } from '../../../components/comments-modal';
import { cn } from '../../../lib/cn';
import DeletePostModal from '../../../components/delete-post-modal';
import { EmptyIllustration } from '../../../components/profile-ui';
import ReportModal from '../../../components/report-modal';
import { buildPostReportReasons } from '../../../lib/report-reasons';
import ShareModal from '../../../components/share-modal';
import { Dropdown, DropdownItem } from '../../../components/navigation';
import { PostCard, type PostCardLang, type PostData } from '../../../components/posts-renderer';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { useCopyToClipboard } from '../../../hooks/use-copy-to-clipboard';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { AncialAPI, getApiMessage } from '../../../lib/api-v2';
import { applyBookmarkResult } from '../../../lib/post-bookmark';
import { applyVoteResult } from '../../../lib/post-vote';
import AccountName from '../../../components/account-name';
import FeedPostSkeleton from '../../feed-post-skeleton';
import { parsePostContentToHtml } from '../../../components/post-parser';
import { formatRelativeTime } from '../../../lib/time';
import AppImage from '../../../components/app-image';
import Icon from '../../../components/svg-icon';

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

interface FeedCommentReplyTo {
  id: number;
  name: string;
  preview: string;
  username: string;
}

interface FeedComment {
  content: string;
  date: string;
  id: Id;
  is_own_comment?: boolean | number | string | null;
  parent_id?: number | null;
  reply_to?: FeedCommentReplyTo | null;
  user: FeedCommentUser;
}

interface ReportTarget {
  id: Id;
  type: number;
}

function flag(value: boolean | number | string | null | undefined) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function htmlToPlainText(value: string | null | undefined) {
  return (value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}

function getPostDocumentTitle(post: PostData | null, lang: Record<string, string> | null) {
  if (!post) return null;

  const title = htmlToPlainText(post.title);
  if (title) return title;

  const content = htmlToPlainText(post.content);
  if (content) return truncateText(content, 60);

  const authorName = post.author?.name?.trim();
  return authorName ? `${lang?.post || 'Пост'} ${lang?.from || 'от'} ${authorName}` : (lang?.post || 'Пост');
}

// Removed local api helpers


function FeedCommentCard({
  comment,
  deleteLabel,
  onDelete,
  onNavigateToUser,
  onReply,
  onReport,
  replyLabel,
  reportLabel,
}: {
  comment: FeedComment;
  deleteLabel: string;
  onDelete: (comment: FeedComment) => void;
  onNavigateToUser: (username: string) => void;
  onReply?: (comment: FeedComment) => void;
  onReport: (comment: FeedComment) => void;
  replyLabel: string;
  reportLabel: string;
}) {
  const router = useRouter();
  const { lang } = useAuth();
  const contentRef = useRef<HTMLDivElement>(null);
  const commentHtml = useMemo(() => parsePostContentToHtml(comment.content), [comment.content]);
  const commentHtmlProps = useSanitizedHtml(commentHtml, true);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-user], a[data-group]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      e.preventDefault();
      e.stopPropagation();
      router.push(href);
    };
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [router]);

  return (
    <div
      id={`comment${comment.id}`}
      className="p-3 border border-zinc-600/30 duration-300 rounded-3xl bg-zinc-800/50 flex flex-col w-full shadow"
    >
      <div className="text-sm lg:text-base text-zinc-200 font-medium flex items-center gap-1.5 min-w-0">
        <button
          type="button"
          onClick={() => onNavigateToUser(comment.user.username)}
          className="active:scale-95 duration-300 w-10 h-10 rounded-3xl shadow shrink-0 overflow-hidden"
          aria-label={comment.user.name}
        >
          <AppImage width={40} height={40} src={comment.user.img} fallbackSrc="/img/placeholders/user.png" alt="" className="block h-full w-full object-cover" />
        </button>

        <div className="flex flex-col flex-grow min-w-0">
          <button
            type="button"
            onClick={() => onNavigateToUser(comment.user.username)}
            className="cursor-pointer hover:text-zinc-100 duration-300 font-medium text-left flex items-center gap-1.5 min-w-0"
          >
            <AccountName user={comment.user} nameClassName="font-medium" />
          </button>
          <span className="text-zinc-300 text-xs">
            {formatRelativeTime(comment.date, lang, comment.date)}
          </span>
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

      {comment.reply_to ? (
        <button
          type="button"
          onClick={() => document.getElementById(`comment${comment.reply_to?.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          className="mt-3 flex w-full min-w-0 cursor-pointer flex-col rounded-2xl border-l-2 border-purple-500 bg-zinc-900/60 px-3 py-1.5 text-left duration-300 hover:bg-zinc-900 active:scale-[0.99]"
        >
          <span className="truncate text-xs font-semibold text-purple-300">{comment.reply_to.name}</span>
          {comment.reply_to.preview ? <span className="truncate text-sm text-zinc-400">{comment.reply_to.preview}</span> : null}
        </button>
      ) : null}

      <div
        ref={contentRef}
        className="text-base lg:text-lg text-zinc-200 font-medium whitespace-pre-wrap break-words"
        dangerouslySetInnerHTML={commentHtmlProps}
      />

      {onReply ? (
        <button
          type="button"
          onClick={() => onReply(comment)}
          className="mt-3 w-fit cursor-pointer rounded-full px-3 py-1.5 text-sm font-semibold text-zinc-400 duration-300 hover:bg-zinc-800 hover:text-zinc-100 active:scale-95"
        >
          {replyLabel}
        </button>
      ) : null}
    </div>
  );
}

export default function SinglePostContent({ postId }: { postId: string }) {
  const router = useRouter();
  const { lang, isAuthenticated, user } = useAuth();
  const { showNote } = useNotification();
  const copyToClipboard = useCopyToClipboard();
  const commentInputRef = useRef<HTMLInputElement | null>(null);
  const commentsSectionRef = useRef<HTMLDivElement | null>(null);

  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [replyTo, setReplyTo] = useState<FeedComment | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PostData | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const strings = useMemo(() => {
    const fb = {
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
      bookmarkadded: lang?.bookmarkadded || fb.bookmarkadded,
      bookmarked: lang?.bookmarked || fb.bookmarked,
      bookmarkremoved: lang?.bookmarkremoved || fb.bookmarkremoved,
      candidimage: lang?.candidimage || fb.candidimage,
      copylink: lang?.copylink || fb.copylink,
      delete: lang?.delete || fb.delete,
      deletepost: lang?.deletepost || fb.deletepost,
      emptycomments: lang?.emptycomments || fb.emptycomments,
      emptycommentsdesc: lang?.emptycommentsdesc || fb.emptycommentsdesc,
      langname: lang?.langname || fb.langname,
      less: lang?.less || fb.less,
      linkcopied: lang?.linkcopied || fb.linkcopied,
      logintoreact: lang?.logintoreact || fb.logintoreact,
      more: lang?.more || fb.more,
      no: lang?.no || fb.no,
      post: lang?.post || fb.post,
      postcomments: lang?.postcomments || fb.postcomments,
      postnotfound: lang?.postnotfound || fb.postnotfound,
      prohibitedgood: lang?.prohibitedgood || fb.prohibitedgood,
      propertyrights: lang?.propertyrights || fb.propertyrights,
      reallywantdeletepost: lang?.reallywantdeletepost || fb.reallywantdeletepost,
      report: lang?.report || fb.report,
      scam: lang?.scam || fb.scam,
      share: lang?.share || fb.share,
      somethingwrong: lang?.somethingwrong || fb.somethingwrong,
      spam: lang?.spam || fb.spam,
      tbookmark: lang?.tobookmarks || fb.tbookmark,
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
  const postDocumentTitle = useMemo(() => getPostDocumentTitle(post, lang), [post, lang]);

  useDocumentTitle(postDocumentTitle);

  const loadComments = useCallback(async (nextPostId: Id) => {
    setIsCommentsLoading(true);

    try {
      const nextComments = await AncialAPI.getComments<FeedComment[]>(nextPostId);
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
        const data = await AncialAPI.getPost<PostData>(postId);

        if (data) {
          setPost(data);
          await loadComments(data.id);
        } else {
          setError(strings.postnotfound);
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
      const response = (await AncialAPI.postAction('bookmark', { pid: targetPost.id })) as { message: string, action: string };

      showNote({
        content: getApiMessage(response.message, lang),
        html: true,
        type: 'success',
        time: 5,
      });

      updatePost((currentPost) =>
        String(currentPost.id) === String(targetPost.id)
          ? applyBookmarkResult(currentPost, response.action, nextValue)
          : currentPost,
      );
    } catch (nextError) {
      console.error('Bookmark failed', nextError);
      showNote({
        content: getApiMessage(nextError instanceof Error ? nextError.message : null, lang, strings.somethingwrong),
        type: 'error',
        time: 5,
      });
    }
  };

  const handleVote = async (targetPost: PostData, direction: 'up' | 'down') => {
    try {
      const response = (await AncialAPI.votePost(targetPost.id, direction)) as { status: string };

      if (response.status === 'nlog') {
        showNote({
          content: strings.logintoreact,
          type: 'success',
          time: 5,
        });
        return;
      }

      updatePost((currentPost) =>
        String(currentPost.id) === String(targetPost.id)
          ? applyVoteResult(currentPost, direction)
          : currentPost,
      );
    } catch (nextError) {
      console.error('Vote failed', nextError);
      showNote({
        content: getApiMessage(nextError instanceof Error ? nextError.message : null, lang, strings.somethingwrong),
        type: 'error',
        time: 5,
      });
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

  // Переход из уведомления (/feed/post/ID?comment=ID): прокручиваем к комментарию и подсвечиваем его.
  const focusedCommentRef = useRef<string | null>(null);
  const extraCommentsLoadedRef = useRef(false);
  useEffect(() => {
    if (isCommentsLoading || comments.length === 0) return;
    const target = new URLSearchParams(window.location.search).get('comment');
    if (!target || focusedCommentRef.current === target) return;
    const element = document.getElementById(`comment${target}`);
    if (!element) {
      // Комментарий дальше первой страницы — один раз подгружаем побольше.
      if (!extraCommentsLoadedRef.current && post) {
        extraCommentsLoadedRef.current = true;
        void AncialAPI.getComments<FeedComment[]>(post.id, 200)
          .then((list) => setComments(Array.isArray(list) ? list : []))
          .catch(() => null);
      }
      return;
    }
    focusedCommentRef.current = target;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.classList.add('ring-2', 'ring-purple-500');
    window.setTimeout(() => element.classList.remove('ring-2', 'ring-purple-500'), 3500);
  }, [comments, isCommentsLoading, post]);

  const handleReply = (comment: FeedComment) => {
    setReplyTo(comment);
    commentInputRef.current?.focus();
    commentInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleCreateComment = async () => {
    if (!post || !commentInput.trim()) return;

    try {
      await AncialAPI.createComment(post.id, commentInput.trim(), replyTo?.id ?? null);

      setCommentInput('');
      setReplyTo(null);
      updatePost((currentPost) => ({
        ...currentPost,
        comments_count: toNumber(currentPost.comments_count) + 1,
      }));
      await loadComments(post.id);
    } catch (nextError) {
      console.error('Create comment failed', nextError);
      showNote({
        content: getApiMessage(nextError instanceof Error ? nextError.message : null, lang, strings.somethingwrong),
        type: 'error',
        time: 5,
      });
    }
  };

  const handleDeleteComment = async (comment: FeedComment) => {
    try {
      const response = await AncialAPI.deleteComment<{ message?: string }>(comment.id);

      showNote({
        content: getApiMessage(response?.message, lang, lang?.deleted || 'Удалено'),
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
        content: getApiMessage(nextError instanceof Error ? nextError.message : null, lang, strings.somethingwrong),
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
        content: getApiMessage(response.message, lang, lang?.report_sent || 'Жалоба отправлена'),
        html: true,
        type: 'success',
        time: 5,
      });
    } catch (nextError) {
      console.error('Report failed', nextError);
      showNote({
        content: getApiMessage(nextError instanceof Error ? nextError.message : null, lang, strings.somethingwrong),
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
        content: getApiMessage(response.message, lang, lang?.post_deleted || 'Пост удален'),
        html: true,
        type: 'success',
        time: 5,
      });

      clearFeedSnapshots();
      router.push('/feed');
    } catch (nextError) {
      console.error('Delete post failed', nextError);
      showNote({
        content: getApiMessage(nextError instanceof Error ? nextError.message : null, lang, strings.somethingwrong),
        type: 'error',
        time: 10,
      });
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;

    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      showNote({
        content: strings.linkcopied,
        type: 'success',
        time: 5,
      });
    } else {
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
          onClick={() => goBackOr(router, '/feed')}
          className="text-3xl font-extralight flex items-center gap-1.5 duration-300 active:scale-95 cursor-pointer"
        >
          <Icon name="IC-chevron-left" className="w-8 h-8 fill-white inline hover:fill-zinc-300" />
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
                noCollapse={true}
                lang={postCardLang}
                onBookmark={handleBookmark}
                onComment={scrollToComments}
                onDelete={(targetPost) => {
                  setDeleteTarget(targetPost);
                  setIsDeleteModalOpen(true);
                }}
                onEdit={(targetPost) => router.push(`/feed/edit?id=${targetPost.id}&from=post`)}
                onNavigate={(href) => router.push(href)}
                onReport={(targetPost) => {
                  setReportTarget({ id: targetPost.id, type: 2 });
                  setIsReportModalOpen(true);
                }}
                onVote={handleVote}
                post={post}
                renderIndex={1}
              />

              <div
                ref={commentsSectionRef}
                className="bg-zinc-900 rounded-3xl border border-zinc-600/30 p-3 text-zinc-100"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Icon name="IC-comments" className="w-6 h-6 fill-white" />
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
                    {replyTo ? (
                      <div className="mb-3 flex items-center gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-800 px-3 py-1.5">
                        <span className="min-w-0 flex-1 truncate text-sm text-zinc-300">
                          <span className="text-purple-300">{lang?.comment_replying_to || 'Ответ для'}</span> {replyTo.user.name}
                        </span>
                        <button
                          type="button"
                          aria-label={lang?.comment_reply_cancel || 'Отменить ответ'}
                          onClick={() => setReplyTo(null)}
                          className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-zinc-700 active:scale-95 duration-300"
                        >
                          <Icon name="IC-times" className="h-4 w-4 fill-zinc-300" />
                        </button>
                      </div>
                    ) : null}
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
                        <Icon name="IC-send" className="fill-white w-8 h-8 inline" />
                      </button>
                    </div>
                  </form>
                )}

                <div id="comments-container" className="flex flex-col gap-3">
                  {isCommentsLoading ? (
                    <div className="w-full flex items-center justify-center py-6">
                      <Icon name="IC-loader" className="w-16 h-16 inline animate-spin fill-purple-500" />
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
                        onReply={isAuthenticated ? handleReply : undefined}
                        replyLabel={lang?.comment_reply_btn || 'Ответить'}
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

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onReport={(reason) => void handleReport(reason)}
        reasons={buildPostReportReasons(strings)}
        title={strings.report}
      />

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

      <DeletePostModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => void handleDeletePost()}
        strings={strings}
      />
    </div>
  );
}
