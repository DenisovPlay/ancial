'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import Modal from '../../../components/modal';
import ShareModal from '../../../components/share-modal';
import { Dropdown, DropdownItem } from '../../../components/navigation';
import { PostCard, type PostCardLang, type PostData } from '../../../components/posts-renderer';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle';
import { AncialAPI } from '../../../lib/api-v2';
import { SvgIcon } from '../../editor-shared';
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

function getPostDocumentTitle(post: PostData | null, lang: any) {
  if (!post) return null;

  const title = htmlToPlainText(post.title);
  if (title) return title;

  const content = htmlToPlainText(post.content);
  if (content) return truncateText(content, 60);

  const authorName = post.author?.name?.trim();
  return authorName ? `${lang?.post || 'Пост'} ${lang?.from || 'от'} ${authorName}` : (lang?.post || 'Пост');
}

// Removed local api helpers

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
            {flag(comment.user.is_verified) && (
              <SvgIcon className="w-5 h-5 inline fill-blue-500" id="IC-verify" viewBox="0 0 48 48" />
            )}
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
        content: response.message,
        html: true,
        type: 'success',
        time: 5,
      });

      updatePost((currentPost) => {
        if (String(currentPost.id) !== String(targetPost.id)) return currentPost;

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
      const response = (await AncialAPI.votePost(targetPost.id, direction)) as { status: string };

      if (response.status === 'nlog') {
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
      await AncialAPI.createComment(post.id, commentInput.trim());

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
      const response = await AncialAPI.deleteComment<{ message?: string }>(comment.id);

      showNote({
        content: response?.message || (lang?.deleted || 'Удалено'),
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
      const response = (await AncialAPI.reportAction({ id: currentTarget.id, type: currentTarget.type, comment: reason })) as { message: string };

      showNote({
        content: response.message || (lang?.report_sent || 'Жалоба отправлена'),
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
        content: response.message || (lang?.post_deleted || 'Пост удален'),
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
                onTranslate={translatePost}
                onVote={handleVote}
                post={post}
                shareBaseUrl="https://ancial.ru/feed/post"
                renderIndex={1}
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
                          <use href="#IC-send"></use>
                        </svg>
                      </button>
                    </div>
                  </form>
                )}

                <div id="comments-container" className="flex flex-col gap-3">
                  {isCommentsLoading ? (
                    <div className="w-full flex items-center justify-center py-6">
                      <svg className="w-16 h-16 inline animate-spin fill-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                        <use href="#IC-loader"></use>
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
            onClick={() => void handleReport(strings.spam)}
            className="text-left p-1.5 bg-zinc-800 text-lg cursor-pointer duration-300 hover:bg-zinc-700 active:scale-95 active:rounded-xl"
          >
            {strings.spam}
          </button>
          <button
            type="button"
            onClick={() => void handleReport(strings.prohibitedgood)}
            className="text-left p-1.5 bg-zinc-800 text-lg cursor-pointer duration-300 hover:bg-zinc-700 active:scale-95 active:rounded-xl"
          >
            {strings.prohibitedgood}
          </button>
          <button
            type="button"
            onClick={() => void handleReport(strings.scam)}
            className="text-left p-1.5 bg-zinc-800 text-lg cursor-pointer duration-300 hover:bg-zinc-700 active:scale-95 active:rounded-xl"
          >
            {strings.scam}
          </button>
          <button
            type="button"
            onClick={() => void handleReport(strings.violence)}
            className="text-left p-1.5 bg-zinc-800 text-lg cursor-pointer duration-300 hover:bg-zinc-700 active:scale-95 active:rounded-xl"
          >
            {strings.violence}
          </button>
          <button
            type="button"
            onClick={() => void handleReport(strings.candidimage)}
            className="text-left p-1.5 bg-zinc-800 text-lg cursor-pointer duration-300 hover:bg-zinc-700 active:scale-95 active:rounded-xl"
          >
            {strings.candidimage}
          </button>
          <button
            type="button"
            onClick={() => void handleReport(strings.propertyrights)}
            className="text-left p-1.5 bg-zinc-800 text-lg cursor-pointer duration-300 hover:bg-zinc-700 active:scale-95 active:rounded-xl"
          >
            {strings.propertyrights}
          </button>
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
