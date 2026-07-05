'use client';

import Modal from './modal';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Удалить',
  cancelLabel = 'Отмена',
}: ConfirmDeleteModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4 text-center">
        <span className="text-sm text-zinc-400">
          {description}
        </span>
        <div className="flex gap-3 w-full mt-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer flex-1 py-2 rounded-3xl bg-zinc-800/80 hover:bg-zinc-700/80 text-white duration-300 active:scale-95 border border-zinc-600/30"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="cursor-pointer flex-1 py-2 rounded-3xl bg-red-600/80 hover:bg-red-500/80 text-white duration-300 active:scale-95 border border-zinc-600/30"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
