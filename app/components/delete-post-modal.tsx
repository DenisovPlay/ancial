'use client';

import Modal from './modal';

interface DeletePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  strings: {
    deletepost: string;
    reallywantdeletepost: string;
    yes: string;
    no: string;
  };
}

export default function DeletePostModal({
  isOpen,
  onClose,
  onConfirm,
  strings,
}: DeletePostModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={strings.deletepost}
      width="sm"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 justify-center items-center">
          <svg className="w-24 h-24 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <use href="#IC-trash"></use>
          </svg>
          <span className="text-base text-zinc-200 text-center">{strings.reallywantdeletepost}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center justify-center gap-3 px-4 py-2 duration-300 active:scale-95 bg-red-600 hover:bg-red-700 text-white rounded-3xl cursor-pointer border border-zinc-600/30 w-full shadow"
          >
            {strings.yes}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center gap-3 px-4 py-2 duration-300 active:scale-95 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-3xl cursor-pointer border border-zinc-600/30 w-full shadow"
          >
            {strings.no}
          </button>
        </div>
      </div>
    </Modal>
  );
}
