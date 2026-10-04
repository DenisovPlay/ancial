'use client';

import { cn } from '../lib/cn';
import Icon from './svg-icon';

/** Круглый флажок в стиле полей формы: нативный input скрыт (клавиатура, скринридер), виден круг с галочкой. */
export default function RoundCheck({
  checked,
  className,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  className?: string;
  disabled?: boolean;
  label: React.ReactNode;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={cn('flex select-none items-center gap-3 text-sm text-zinc-300', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer', className)}>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-600/30 bg-zinc-900 duration-300 peer-checked:border-purple-500 peer-checked:bg-purple-500 peer-focus-visible:ring-2 peer-focus-visible:ring-purple-500/60 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
      >
        <Icon name="IC-check-bold" className="h-4 w-4 fill-white duration-300" />
      </span>
      <span>{label}</span>
    </label>
  );
}
