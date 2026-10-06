'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppImage from './app-image';
import { cn, } from '../feed/editor-shared';
import Modal from './modal';
import { useAuth } from '../context/AuthContext';
import CommentCard, { ReplyBar } from './comment-card';
import Icon from './svg-icon';

export interface FeedComment {
  content: string;
  date: string;
  id: string | number;
  is_own_comment?: boolean | number | string | null;
  parent_id?: number | null;
  reply_to?: { id: number; name: string; preview: string; username: string } | null;
  user: {
    img: string;
    is_verified?: boolean | number | string | null;
    name: string;
    username: string;
  };
}

export interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  comments: FeedComment[];
  isLoading: boolean;
  isAuthenticated: boolean;
  commentInput: string;
  onCommentInputChange: (value: string) => void;
  onSubmit: () => void;
  onDelete: (comment: FeedComment) => void;
  onReport: (comment: FeedComment) => void;
  onNavigateToUser: (username: string) => void;
  /** Ответ на комментарий: выбранный комментарий, выбор и сброс. Без onReply кнопки «Ответить» нет. */
  replyTo?: FeedComment | null;
  onReply?: (comment: FeedComment) => void;
  onCancelReply?: () => void;
  deleteLabel: string;
  reportLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  writeCommentPlaceholder: string;
}

export function CommentsModal({
  isOpen,
  onClose,
  title,
  comments,
  isLoading,
  isAuthenticated,
  commentInput,
  onCommentInputChange,
  onSubmit,
  onDelete,
  onReport,
  onNavigateToUser,
  replyTo,
  onReply,
  onCancelReply,
  deleteLabel,
  reportLabel,
  emptyTitle,
  emptyDescription,
  writeCommentPlaceholder,
}: CommentsModalProps) {
  const router = useRouter();
  const { lang } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleReply = onReply && isAuthenticated
    ? (comment: FeedComment) => {
        onReply(comment);
        inputRef.current?.focus();
      }
    : undefined;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} width="lg">
      <div className="flex flex-col gap-3 relative">
        {isAuthenticated ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
            className="form-control flex-1 text-zinc-100 sticky top-0 z-40"
          >
            {replyTo ? <ReplyBar name={replyTo.user.name} onCancel={() => onCancelReply?.()} /> : null}
            <div className="glass-panel [--glass-blur:8px] [--glass-sat:2] relative border border-zinc-600/30 flex rounded-full w-full p-1 h-12">
              <input
                ref={inputRef}
                placeholder={writeCommentPlaceholder}
                type="text"
                autoComplete="off"
                value={commentInput}
                onChange={(event) => onCommentInputChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && event.ctrlKey) {
                    event.preventDefault();
                    onSubmit();
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
                <Icon name="IC-send" className="w-8 h-8 fill-white inline" />
              </button>
            </div>
          </form>
        ) : null}

        <div className="flex flex-col gap-3">
          {isLoading ? (
            <>
              {[0, 1, 2].map((index) => <CommentSkeleton key={index} />)}
            </>
          ) : comments.length > 0 ? (
            comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                deleteLabel={deleteLabel}
                reportLabel={reportLabel}
                replyLabel={lang?.comment_reply_btn || 'Ответить'}
                onDelete={onDelete}
                onReport={onReport}
                onReply={handleReply}
                onLinkNavigate={(href) => {
                  onClose();
                  router.push(href);
                }}
                onNavigateToUser={onNavigateToUser}
              />
            ))
          ) : (
            <CommentsEmptyState title={emptyTitle} description={emptyDescription} />
          )}
        </div>
      </div>
    </Modal>
  );
}

/** Скелетон карточки комментария (аватар, имя, время, две строки текста). */
function CommentSkeleton() {
  return (
    <div aria-hidden className="flex animate-pulse flex-col gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-800" />
        <div className="flex flex-col gap-1.5">
          <div className="h-4 w-32 rounded-full bg-zinc-800" />
          <div className="h-3 w-16 rounded-full bg-zinc-800" />
        </div>
      </div>
      <div className="h-4 w-3/4 rounded-full bg-zinc-800" />
    </div>
  );
}

export function CommentsEmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="text-center w-full flex flex-col gap-0.5 justify-center items-center">
      <AppImage
        src="/img/load-placeholders/nothingfound.webp"
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
