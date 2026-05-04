'use client';

import React from 'react';

import Modal from '../components/modal';
import { ActionIcon, cn } from './pulse-components';

type PulseModalProps = {
  children: React.ReactNode;
  contentClassName?: string;
  isOpen: boolean;
  onClose: () => void;
  scrollable?: boolean;
  title: string;
};

export function PulseModal({
  children,
  contentClassName,
  isOpen,
  onClose,
  scrollable = false,
  title,
}: PulseModalProps) {
  return (
    <Modal
      align="responsive"
      animation="sheet"
      bodyClassName="p-0"
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="w-full max-w-xl sm:mx-3"
      showHeader={false}
      unstyled
      width="full"
    >
      <div
        className={cn(
          'w-full rounded-2xl border border-zinc-600/30 bg-zinc-900/70 px-3 py-3 text-zinc-100 shadow-2xl backdrop-blur-lg',
          scrollable && 'max-h-[80vh] overflow-y-auto',
          contentClassName,
        )}
      >
        <div className="px-20 md:hidden">
          <div className="rounded-full bg-zinc-500 px-6 py-0.5" />
        </div>

        <div className="flex items-center">
          <span className="flex-grow text-left text-lg font-medium text-zinc-100">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="hidden h-5 w-5 cursor-pointer items-center justify-center duration-300 hover:opacity-80 active:scale-95 md:flex"
            aria-label="Закрыть"
          >
            <ActionIcon className="h-5 w-5 fill-white" name="IC-times" />
          </button>
        </div>

        <div className="mt-2 flex w-full flex-col gap-3">
          {children}
        </div>
      </div>
    </Modal>
  );
}

type PulseModalFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  label: string;
};

export function PulseModalField({ label, ...inputProps }: PulseModalFieldProps) {
  return (
    <div className="flex w-full flex-col">
      <span className="z-20 pl-4 text-zinc-400">{label}</span>
      <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
        <input
          {...inputProps}
          className="w-full bg-transparent pl-2 text-zinc-100 placeholder-zinc-600 focus:border-0 focus:outline-0 focus:ring-0"
        />
      </div>
    </div>
  );
}

type PulseModalSelectFieldProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> & {
  children: React.ReactNode;
  label: string;
};

export function PulseModalSelectField({ children, label, ...selectProps }: PulseModalSelectFieldProps) {
  return (
    <div className="flex w-full flex-col">
      <span className="z-20 pl-4 text-zinc-400">{label}</span>
      <div className="-mt-3 z-10 flex h-12 w-full rounded-full border border-zinc-600/30 bg-zinc-800/90 p-1">
        <select
          {...selectProps}
          className="w-full cursor-pointer rounded-full bg-zinc-800/90 pl-2 text-zinc-100 focus:outline-none"
        >
          {children}
        </select>
      </div>
    </div>
  );
}

