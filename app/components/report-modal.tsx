'use client';

import Modal from './modal';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReport: (reason: string) => void;
  strings: {
    report: string;
    spam: string;
    prohibitedgood: string;
    scam: string;
    violence: string;
    candidimage: string;
    propertyrights: string;
  };
}

export default function ReportModal({
  isOpen,
  onClose,
  onReport,
  strings,
}: ReportModalProps) {
  const options = [
    { label: strings.spam, value: strings.spam },
    { label: strings.prohibitedgood, value: strings.prohibitedgood },
    { label: strings.scam, value: strings.scam },
    { label: strings.violence, value: strings.violence },
    { label: strings.candidimage, value: strings.candidimage },
    { label: strings.propertyrights, value: strings.propertyrights },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={strings.report}
      width="sm"
    >
      <div className="flex flex-col justify-center rounded-3xl shadow overflow-hidden">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onReport(option.value)}
            className="text-left p-2.5 bg-zinc-800 text-base cursor-pointer duration-300 hover:bg-zinc-700 active:scale-95 active:rounded-xl text-zinc-200 hover:text-white"
          >
            {option.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
