'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppImage from './app-image';
import { cn, } from '../feed/editor-shared';
import { sanitizeUserHtml } from '../lib/sanitize-html';
import Modal from './modal';
import { Dropdown, DropdownItem } from './navigation';
import AccountName from './account-name';
import { parsePostContentToHtml } from './post-parser';
import Icon from './svg-icon';

export interface FeedComment {
  content: string;
  date: string;
  id: string | number;
  is_own_comment?: boolean | number | string | null;
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
  deleteLabel,
  reportLabel,
  emptyTitle,
  emptyDescription,
  writeCommentPlaceholder,
}: CommentsModalProps) {
  const commentsContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const el = commentsContainerRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-user], a[data-group]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
      router.push(href);
    };
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [router, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} width="lg">
      <div className="flex flex-col gap-3 relative">
        {isAuthenticated ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
            className="form-control flex-1 text-zinc-100 rounded-full shadow sticky top-0 z-[90]"
          >
            <div className="glass-panel [--glass-blur:8px] [--glass-sat:2] relative border border-zinc-600/30 flex rounded-full w-full p-1 h-12">
              <input
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

        <div ref={commentsContainerRef} className="flex flex-col gap-3">
          {isLoading ? (
            <div className="w-full flex items-center justify-center py-6">
              <Icon name="IC-loader" className="w-16 h-16 inline animate-spin fill-purple-500" />
            </div>
          ) : comments.length > 0 ? (
            comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                deleteLabel={deleteLabel}
                reportLabel={reportLabel}
                onDelete={onDelete}
                onReport={onReport}
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

function CommentCard({
  comment,
  deleteLabel,
  reportLabel,
  onDelete,
  onReport,
  onNavigateToUser,
}: {
  comment: FeedComment;
  deleteLabel: string;
  reportLabel: string;
  onDelete: (comment: FeedComment) => void;
  onReport: (comment: FeedComment) => void;
  onNavigateToUser: (username: string) => void;
}) {
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
          {comment.is_own_comment === true ||
          comment.is_own_comment === 1 ||
          comment.is_own_comment === '1' ||
          comment.is_own_comment === 'true' ? (
            <DropdownItem
              onClick={() => onDelete(comment)}
              icon="IC-times"
              className="p-1 text-sm"
              iconClassName="w-5 h-5"
            >
              {deleteLabel}
            </DropdownItem>
          ) : null}
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

      <div className="text-base lg:text-lg text-zinc-200 font-medium whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: sanitizeUserHtml(parsePostContentToHtml(comment.content), { preloadImages: true }) }} />
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
