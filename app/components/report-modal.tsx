'use client';

import Modal from './modal';
import type { ReportReason } from '../lib/report-reasons';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReport: (reason: string) => void | Promise<void>;
  reasons: ReportReason[];
  title: string;
}

export default function ReportModal({
  isOpen,
  onClose,
  onReport,
  reasons,
  title,
}: ReportModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width="sm"
    >
      <div className="flex flex-col justify-center rounded-3xl shadow overflow-hidden">
        {reasons.map((reason) => (
          <button
            key={reason.value}
            type="button"
            onClick={() => {
              void onReport(reason.value);
            }}
            className="text-left p-2.5 bg-zinc-800 text-base cursor-pointer duration-300 hover:bg-zinc-700 active:scale-95 active:rounded-xl text-zinc-200 hover:text-white"
          >
            {reason.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
