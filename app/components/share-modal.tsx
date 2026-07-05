'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

import Modal from './modal';
import { getShareServiceUrl, type ShareService } from './share-modal-model';
import { AncialAPI } from '../lib/api-v2';
import { cn } from '../pulse/pulse-components';
import { useAuth } from '../context/AuthContext';
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
}: ShareModalProps) {
  const { lang } = useAuth();
  const dialogsScrollRef = useDragScroll({ speed: 1.5 });
  const [dialogs, setDialogs] = useState<DialogListItem[]>([]);
  const [selectedDialog, setSelectedDialog] = useState<DialogListItem | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  // Состояние ответа на пост
  const [replyTab, setReplyTab] = useState<'repost' | 'reply'>('repost');
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
      setReplyTab('repost');
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
    if (!replyPostId || replyLoading || replySent) return;
    setReplyLoading(true);
    try {
      const widgets = JSON.stringify([{ type: 'quote', post_id: Number(replyPostId) }]);
      const textContent = replyTab === 'reply' ? replyText.trim() : '.';
      // Для репоста без текста — используем точку как контент (валидация требует >10 символов для создания поста)
      // Поэтому в виде репоста — пустой текст не пройдёт; используем специальный маркер
      await AncialAPI.createPost<{ message?: string }>({
        author_type: '1',
        gid: '0',
        tags: 'null',
        contentext: replyTab === 'reply' ? textContent : '.',
        new_post_title: '',
        photosurls: '',
        widgets,
      });
      setReplySent(true);
      onReply?.();
      setTimeout(() => onClose(), 1500);
    } catch (e) {
      console.error('Reply failed', e);
    } finally {
      setReplyLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || lang?.share || 'Поделиться'} width="md" bodyClassName="!px-0 !pb-0">
      <div className="flex flex-col gap-3 justify-center items-center">
        <span className="hidden">{shareUrl}</span>

        {/* Секция ответа на пост */}
        {replyPostId && !selectedDialog && (
          <div className="w-full px-3 flex flex-col gap-3">
            {/* Вкладки */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setReplyTab('repost')}
                className={cn(
                  'flex-1 py-2 rounded-3xl text-sm font-medium transition-all duration-200 active:scale-95 cursor-pointer',
                  replyTab === 'repost'
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
                )}
              >
                {lang?.repost || 'Репост'}
              </button>
              <button
                type="button"
                onClick={() => setReplyTab('reply')}
                className={cn(
                  'flex-1 py-2 rounded-3xl text-sm font-medium transition-all duration-200 active:scale-95 cursor-pointer',
                  replyTab === 'reply'
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700',
                )}
              >
                {lang?.reply || 'Ответить'}
              </button>
            </div>

            {/* Превью цитируемого поста */}
            {replyPostPreview && (
              <div className="border border-zinc-700/60 rounded-2xl p-1.5 bg-zinc-800/40 flex gap-1.5 items-start">
                <div
                  className="w-6 h-6 rounded-full bg-cover bg-center shrink-0 border border-zinc-600/30"
                  style={{ backgroundImage: `url(${replyPostPreview.authorImg || '/includes/img/anlite/default_avatar.png'})` }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-zinc-300">{replyPostPreview.authorName}</span>
                  <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">{replyPostPreview.contentSnippet}</p>
                </div>
                {replyPostPreview.firstImage && (
                  <div
                    className="w-10 h-10 rounded-xl shrink-0 bg-cover bg-center bg-zinc-700"
                    style={{ backgroundImage: `url(${replyPostPreview.firstImage})` }}
                  />
                )}
              </div>
            )}

            {/* Поле текста для ответа */}
            {replyTab === 'reply' && !replySent && (
              <input
                type="text"
                placeholder={lang?.your_reply || "Ваш ответ..."}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full bg-zinc-900/50 text-white text-sm rounded-3xl px-4 py-3 outline-none border border-zinc-600/30 focus:border-purple-500 duration-300"
              />
            )}

            {/* Кнопка публикации */}
            <button
              type="button"
              onClick={() => void handleReply()}
              disabled={replyLoading || replySent || (replyTab === 'reply' && !replyText.trim())}
              className={cn(
                'w-full rounded-3xl flex items-center justify-center gap-2 px-4 py-3 font-medium duration-300 active:scale-95 text-sm border border-zinc-600/30 cursor-pointer',
                replySent
                  ? 'bg-green-500 text-white cursor-default'
                  : 'bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100',
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
                  {replyTab === 'repost' ? (lang?.do_repost || 'Репостнуть') : (lang?.publish_reply || 'Опубликовать ответ')}
                </>
              )}
            </button>
            <div className="w-full h-px bg-zinc-700/50 mt-1" />
          </div>
        )}

        {/* Список друзей (диалогов) */}
        {!selectedDialog && dialogs.length > 0 && (
          <div ref={dialogsScrollRef} className="w-full flex overflow-x-auto pb-2 pt-2 -mt-2 scrollbar-hide px-3 gap-3 dragscroll">
            {dialogs.map((dialog) => (
              <div
                key={dialog.id}
                className="flex flex-col items-center gap-1 cursor-pointer active:scale-95 duration-300 snap-start"
                onClick={() => setSelectedDialog(dialog)}
              >
                <div className={cn(
                  "w-16 h-16 rounded-full overflow-hidden ring-2 duration-300",
                  isOnline(dialog.Ulastonline) ? "ring-green-500" : "ring-transparent hover:ring-purple-500"
                )}>
                  <Image
                    src={dialog.Uimg || '/img/noimg.png'}
                    alt={dialog.Uname}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-xs text-zinc-300 text-center line-clamp-1 w-full px-1">
                  {dialog.Uname.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Форма отправки другу */}
        {selectedDialog && (
          <div className="w-full">
            <div className="w-full flex flex-col gap-3 bg-zinc-800/50 p-4 rounded-3xl border border-zinc-600/30">
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
                  className="cursor-pointer ml-auto w-8 h-8 flex items-center justify-center rounded-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300 duration-300 active:scale-95"
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
                  "border border-zinc-600/30 w-full rounded-3xl flex items-center justify-center gap-2 px-4 py-3 font-medium duration-300 active:scale-95 text-sm",
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
          </div>
        )}

        {/* Социальные сети (скрываем, если выбран друг) */}
        {!selectedDialog && (
          <div className="w-full px-3 flex flex-col gap-3 pb-3">
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => handleShareTo('vk')}
                className="w-16 h-16 rounded-3xl bg-blue-500 hover:bg-blue-600 cursor-pointer active:scale-95 duration-300 flex items-center justify-center shadow"
              >
                <Image src="/img/socials/vk.png" alt="VK" width={48} height={48} className="w-12 h-12" />
              </button>
              <button
                type="button"
                onClick={() => handleShareTo('tg')}
                className="w-16 h-16 rounded-3xl bg-sky-400 hover:bg-sky-500 cursor-pointer active:scale-95 duration-300 flex items-center justify-center shadow"
              >
                <Image src="/img/socials/tg.png" alt="Telegram" width={48} height={48} className="w-12 h-12" />
              </button>
              <button
                type="button"
                onClick={() => handleShareTo('x')}
                className="w-16 h-16 rounded-3xl bg-slate-800 hover:bg-slate-900 cursor-pointer active:scale-95 duration-300 flex items-center justify-center shadow"
              >
                <Image src="/img/socials/x.png" alt="X" width={48} height={48} className="w-12 h-12" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => void handleCopyShareLink()}
              className={cn(
                "cursor-pointer w-full border border-zinc-600/30 rounded-3xl flex items-center justify-center gap-3 px-4 py-2 duration-300 active:scale-95",
                copied ? "bg-green-500 text-white border-green-500" : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
              )}
            >
              {copied ? (lang?.copied || 'Скопировано!') : (lang?.copy_link || copyLabel || 'Скопировать ссылку')}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
