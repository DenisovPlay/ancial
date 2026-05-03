'use client';

import Image from 'next/image';

import Modal from './modal';
import { getShareServiceUrl, type ShareService } from './share-modal-model';

type ShareModalProps = {
  copyLabel: string;
  isOpen: boolean;
  onClose: () => void;
  onCopied?: () => void;
  onCopyFailed?: () => void;
  shareUrl: string;
  title: string;
};

export default function ShareModal({
  copyLabel,
  isOpen,
  onClose,
  onCopied,
  onCopyFailed,
  shareUrl,
  title,
}: ShareModalProps) {
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} width="sm">
      <div className="flex flex-col gap-3 justify-center items-center">
        <span className="hidden">{shareUrl}</span>
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
    </Modal>
  );
}
