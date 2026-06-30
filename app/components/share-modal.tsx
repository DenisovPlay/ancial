'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

import Modal from './modal';
import { getShareServiceUrl, type ShareService } from './share-modal-model';
import { AncialAPI } from '../lib/api-v2';
import { cn } from '../pulse/pulse-components';
import { useAuth } from '../context/AuthContext';

type ShareModalProps = {
  copyLabel: string;
  isOpen: boolean;
  onClose: () => void;
  onCopied?: () => void;
  onCopyFailed?: () => void;
  shareUrl: string;
  title: string;
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
}: ShareModalProps) {
  const { lang } = useAuth();
  const [dialogs, setDialogs] = useState<DialogListItem[]>([]);
  const [selectedDialog, setSelectedDialog] = useState<DialogListItem | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      AncialAPI.getDialogList<{ dialogs: DialogListItem[] }>()
        .then(res => setDialogs(res?.dialogs || []))
        .catch(console.error);
    } else {
      setSelectedDialog(null);
      setComment('');
      setSent(false);
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} width="sm" bodyClassName="!px-0 !pb-0">
      <div className="flex flex-col gap-3 justify-center items-center">
        <span className="hidden">{shareUrl}</span>

        {/* Список друзей (диалогов) */}
        {!selectedDialog && dialogs.length > 0 && (
          <div className="w-full flex overflow-x-auto pb-2 pt-2 -mt-2 scrollbar-hide px-3 gap-3">
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
            <div className="w-full flex flex-col gap-3 bg-zinc-800/50 p-4 rounded-3xl border border-zinc-700/50">
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
                  className="w-full bg-zinc-900/50 text-white text-sm rounded-3xl px-4 py-3 outline-none resize-none border border-zinc-700/50 focus:border-purple-500 duration-300"
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
              {copyLabel}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
