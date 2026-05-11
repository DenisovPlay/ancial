'use client';

import React from 'react';

import Modal from '../components/modal';
import { cn } from './pulse-components';

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
      bodyClassName={cn(
        scrollable && 'max-h-[80vh] overflow-y-auto',
        contentClassName,
      )}
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="w-full max-w-xl sm:mx-3"
      title={title}
      width="full"
    >
      <div className="flex w-full flex-col gap-3">
        {children}
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
