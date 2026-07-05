'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

import Modal from './modal';
import { getShareServiceUrl, type ShareService } from './share-modal-model';
import { AncialAPI } from '../lib/api-v2';
import { cn } from '../pulse/pulse-components';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { SvgIcon } from '../feed/editor-shared';
import { useDragScroll } from '../hooks/useDragScroll';

type ShareModalProps = {
  copyLabel: string;
  isOpen: boolean;
  onClose: () => void;
  onCopied?: () => void;
  onCopyFailed?: () => void;
  shareUrl: string;
  title: string;
  // Для режима «Ответить/Репост»
  replyPostId?: number | string | null;
  replyPostPreview?: {
    authorName: string;
    authorImg: string;
    contentSnippet: string;
    firstImage?: string;
  } | null;
  onReply?: () => void;
  // Для репоста произвольных вложений (например, треков)
  attachmentWidgets?: any[];
  attachmentPreview?: {
    authorName: string;
    authorImg: string;
    contentSnippet: string;
    firstImage?: string;
  } | null;
};

type DialogListItem = {
  id: number;
  Uname: string;
  Uimg: string;
  Ulastonline?: number | string | null;
};

function isOnline(lastOnlineTime: number | string | null | undefined) {
  const onlineAt = Number(lastOnlineTime) || 0;
  if (!onlineAt) return false;
  return onlineAt + 500 >= Math.floor(Date.now() / 1000);
}

export default function ShareModal({
  copyLabel,
  isOpen,
  onClose,
  onCopied,
  onCopyFailed,
  shareUrl,
  title,
  replyPostId = null,
  replyPostPreview = null,
  onReply,
  attachmentWidgets,
  attachmentPreview,
}: ShareModalProps) {
  const { lang } = useAuth();
  const dialogsScrollRef = useDragScroll({ speed: 1.5, enabled: isOpen });
  const [dialogs, setDialogs] = useState<DialogListItem[]>([]);
  const [selectedDialog, setSelectedDialog] = useState<DialogListItem | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Состояние ответа на пост
  const [isReplying, setIsReplying] = useState(false);
  const { showNote } = useNotification();

  const [replyText, setReplyText] = useState('');
  const [replySent, setReplySent] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      AncialAPI.getDialogList<{ dialogs: DialogListItem[] }>()
        .then(res => setDialogs(res?.dialogs || []))
        .catch(console.error);
    } else {
      setSelectedDialog(null);
      setComment('');
      setSent(false);
      setReplyText('');
      setReplySent(false);
      setIsReplying(false);
    }
  }, [isOpen]);

  const handleShareTo = (service: ShareService) => {
    if (!shareUrl) return;

    window.open(
      getShareServiceUrl(shareUrl, service),
      'Поделиться',
      'width=800, height=600',
    );
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopied?.();
    } catch {
      onCopyFailed?.();
    }
  };

  const handleSendToFriend = async () => {
    if (!selectedDialog || !shareUrl) return;
    setLoading(true);
    try {
      const payload = comment ? `${shareUrl}\n\n${comment}` : shareUrl;
      await AncialAPI.sendMessage({ di_id: selectedDialog.id, message: payload });
      setSent(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e) {
      console.error('Failed to send share message', e);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    const hasAttachments = attachmentWidgets && attachmentWidgets.length > 0;
    if ((!replyPostId && !hasAttachments) || replyLoading || replySent) return;
    setReplyLoading(true);
    try {
      const widgetsStr = hasAttachments
        ? JSON.stringify(attachmentWidgets)
        : JSON.stringify([{ type: 'quote', post_id: Number(replyPostId) }]);

      // Используем пустую строку, так как бэкенд ругается на слишком короткий текст (например '.') 
      // если есть виджеты, пустой текст должен проходить валидацию
      const textContent = replyText.trim();

      await AncialAPI.createPost<{ message?: string }>({
        author_type: '1',
        gid: '0',
        tags: 'null',
        contentext: textContent,
        new_post_title: '',
        photosurls: '',
        widgets: widgetsStr,
      });
      setReplySent(true);
      onReply?.();
      setTimeout(() => onClose(), 1500);
    } catch (e) {
      console.error('Reply failed', e);
      showNote({
        content: e instanceof Error ? e.message : 'Произошла ошибка при публикации',
        type: 'error',
        time: 5,
        html: true,
      });
    } finally {
      setReplyLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || lang?.share || 'Поделиться'} width="md" bodyClassName="!px-0 !pb-0">
      <div className="flex flex-col gap-3 w-full">
        <span className="hidden">{shareUrl}</span>

        {/* Список друзей (диалогов) */}
        <div
          ref={dialogsScrollRef}
          className={cn(
            "w-full overflow-x-auto pb-2 pt-2 -mt-2 scrollbar-hide px-3 drag-scroll cursor-grab",
            (!selectedDialog && !isReplying && dialogs.length > 0) ? "block" : "hidden"
          )}
        >
          <div className="flex flex-row flex-nowrap gap-3 flex-shrink-0">
            {dialogs.map((dialog) => (
              <div
                key={dialog.id}
                className="flex flex-col items-center gap-1 cursor-pointer active:scale-95 duration-300 select-none shrink-0 w-[64px]"
                onClick={() => setSelectedDialog(dialog)}
              >
                <div className={cn(
                  "w-16 h-16 rounded-full overflow-hidden ring-2 duration-300 shrink-0",
                  isOnline(dialog.Ulastonline) ? "ring-green-500" : "ring-transparent hover:ring-purple-500"
                )}>
                  <Image
                    src={dialog.Uimg || '/img/noimg.png'}
                    alt={dialog.Uname}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover pointer-events-none"
                    draggable={false}
                  />
                </div>
                <span className="text-xs text-zinc-300 text-center truncate w-full px-1 pointer-events-none" title={dialog.Uname.split(' ')[0]}>
                  {dialog.Uname.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Форма отправки другу */}
        {selectedDialog && (
          <div className="w-full flex flex-col gap-3 bg-zinc-800/50 p-3 rounded-3xl border border-zinc-600/30">
            <div className="flex items-center gap-3">
              <Image
                src={selectedDialog.Uimg || '/img/noimg.png'}
                alt={selectedDialog.Uname}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">{selectedDialog.Uname}</span>
                <span className="text-xs text-zinc-400">{lang?.send_message || 'Отправить сообщение'}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDialog(null)}
                className="cursor-pointer ml-auto w-8 h-8 flex items-center justify-center rounded-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300 duration-300 active:scale-95 shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-current" viewBox="0 0 24 24"><use href="/icons.svg#IC-chevron-left"></use></svg>
              </button>
            </div>

            {!sent && (
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={lang?.comment || 'Ваш комментарий (необязательно)'}
                className="w-full bg-zinc-900/50 text-white text-sm rounded-3xl px-4 py-3 outline-none resize-none border border-zinc-600/30 focus:border-purple-500 duration-300"
                rows={2}
              />
            )}

            <button
              type="button"
              onClick={() => void handleSendToFriend()}
              disabled={loading || sent}
              className={cn(
                "cursor-pointer border border-zinc-600/30 w-full rounded-3xl flex items-center justify-center gap-2 px-4 py-3 font-medium duration-300 active:scale-95 text-sm",
                sent
                  ? "bg-green-500 text-white cursor-default"
                  : "bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-900/20"
              )}
            >
              {sent ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                  {lang?.sent || 'Отправлено!'}
                </>
              ) : loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                  {lang?.send || 'Отправить'}
                </>
              )}
            </button>
          </div>
        )}

        {/* Форма ответа/репоста */}
        {isReplying && (replyPostPreview || attachmentPreview) && (
          <div className="w-full flex flex-col gap-3 bg-zinc-800/50 p-3 rounded-3xl border border-zinc-600/30">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full bg-cover bg-center shrink-0 border border-zinc-600/30"
                style={{ backgroundImage: `url(${(replyPostPreview || attachmentPreview)?.authorImg || '/includes/img/anlite/default_avatar.png'})` }}
              />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium text-white truncate">{(replyPostPreview || attachmentPreview)?.authorName}</span>
                <span className="text-xs text-zinc-400 truncate">{(replyPostPreview || attachmentPreview)?.contentSnippet || (lang?.share || 'Поделиться')}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsReplying(false)}
                className="cursor-pointer ml-auto shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300 duration-300 active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-current" viewBox="0 0 24 24"><use href="/icons.svg#IC-chevron-left"></use></svg>
              </button>
            </div>

            {!replySent && (
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={lang?.comment || 'Ваш комментарий (необязательно)'}
                className="w-full bg-zinc-900/50 text-white text-sm rounded-3xl px-4 py-3 outline-none resize-none border border-zinc-600/30 focus:border-purple-500 duration-300"
                rows={2}
              />
            )}

            <button
              type="button"
              onClick={() => void handleReply()}
              disabled={replyLoading || replySent}
              className={cn(
                "cursor-pointer border border-zinc-600/30 w-full rounded-3xl flex items-center justify-center gap-2 px-4 py-3 font-medium duration-300 active:scale-95 text-sm",
                replySent
                  ? "bg-green-500 text-white cursor-default"
                  : "bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-900/20"
              )}
            >
              {replySent ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                  {lang?.published || 'Опубликовано!'}
                </>
              ) : replyLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  <SvgIcon className="w-5 h-5 fill-current" id="IC-share" />
                  {lang?.do_repost || 'Поделиться на своей стене'}
                </>
              )}
            </button>
          </div>
        )}

        {/* Социальные сети и прочие кнопки (скрываем, если выбран друг или пишем репост) */}
        {!selectedDialog && !isReplying && (
          <div className="w-full px-3 flex flex-col gap-3 pb-3">
            <div className="flex gap-3 w-full">
              {(replyPostId || (attachmentWidgets && attachmentWidgets.length > 0)) && (
                <button
                  type="button"
                  onClick={() => setIsReplying(true)}
                  className="w-16 h-16 shrink-0 rounded-3xl bg-purple-500 hover:bg-purple-500/80 cursor-pointer active:scale-95 duration-300 flex items-center justify-center shadow border border-zinc-600/30"
                >
                  <SvgIcon id="IC-reply" className="w-10 h-10 fill-white" />
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleCopyShareLink()}
                className={cn(
                  "w-16 h-16 shrink-0 rounded-3xl cursor-pointer active:scale-95 duration-300 flex items-center justify-center shadow border border-zinc-600/30",
                  copied ? "bg-lime-600 hover:bg-lime-600/80" : "bg-amber-600 hover:bg-amber-600/80"
                )}
              >
                <SvgIcon id="IC-copy-file" className="w-10 h-10 fill-white" />
              </button>
              <button
                type="button"
                onClick={() => handleShareTo('vk')}
                className="w-16 h-16 shrink-0 rounded-3xl bg-blue-500 hover:bg-blue-500/80 cursor-pointer active:scale-95 duration-300 flex items-center justify-center shadow border border-zinc-600/30"
              >
                <Image src="/img/socials/vk.png" alt="VK" width={48} height={48} className="w-12 h-12" />
              </button>
              <button
                type="button"
                onClick={() => handleShareTo('tg')}
                className="w-16 h-16 shrink-0 rounded-3xl bg-sky-400 hover:bg-sky-400/80 cursor-pointer active:scale-95 duration-300 flex items-center justify-center shadow border border-zinc-600/30"
              >
                <Image src="/img/socials/tg.png" alt="Telegram" width={48} height={48} className="w-12 h-12" />
              </button>
              <button
                type="button"
                onClick={() => handleShareTo('x')}
                className="w-16 h-16 shrink-0 rounded-3xl bg-slate-800 hover:bg-slate-800/80 cursor-pointer active:scale-95 duration-300 flex items-center justify-center shadow border border-zinc-600/30"
              >
                <Image src="/img/socials/x.png" alt="X" width={48} height={48} className="w-12 h-12" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
