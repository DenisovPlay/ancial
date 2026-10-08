'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';

import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { cn } from '../lib/cn';
import { useSearchSuggestions } from '../lib/use-search-suggestions';
import Icon from './svg-icon';

/**
 * Строка поиска Zypo: пилюля со стеклом, подсказки Google и навигация по ним стрелками.
 * Значение хранит сама; `onSearch` вызывается с готовой строкой. Чтобы подставить новый запрос снаружи,
 * меняйте `key` (так не нужен эффект «пропс → состояние»).
 */
export default function SearchBox({
  autoFocus = false,
  className,
  initialValue = '',
  onSearch,
}: {
  autoFocus?: boolean;
  className?: string;
  initialValue?: string;
  onSearch: (query: string) => void;
}) {
  const { lang, langCode } = useAuth();
  const { showNote } = useNotification();
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(-1);
  const { skipNext, suggestions } = useSearchSuggestions(value, langCode || 'ru', () => {
    showNote({ content: lang?.be_kind_to_people || 'Будьте добрее к другим людям!', type: 'error', time: 5 });
  });

  const submit = (query: string) => {
    setOpen(false);
    // Убираем фокус и выделение: иначе на телефоне остаётся клавиатура, а на странице — выделенный текст.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.getSelection()?.removeAllRanges();
    onSearch(query);
  };

  const pick = (index: number) => {
    const next = suggestions[index];
    if (next === undefined) return;
    setValue(next);
    submit(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (suggestions.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = event.key === 'ArrowDown'
        ? (focused < suggestions.length - 1 ? focused + 1 : 0)
        : (focused > 0 ? focused - 1 : suggestions.length - 1);
      setFocused(next);
      skipNext();
      setValue(suggestions[next]);
    } else if (event.key === 'Enter' && focused >= 0 && focused < suggestions.length) {
      event.preventDefault();
      pick(focused);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(value);
  };

  return (
    <div className={cn('relative flex w-full flex-col', className)}>
      <form onSubmit={onSubmit} className="glass-input [--glass-sat:2] relative z-[11] flex h-12 w-full items-center justify-center rounded-full border border-zinc-600/30 p-1">
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setFocused(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 200)}
          onKeyDown={onKeyDown}
          className="h-full w-full border-none bg-transparent pl-3 text-white placeholder-zinc-600 outline-hidden focus:ring-0"
          placeholder={lang?.search || 'Поиск...'}
          autoComplete="off"
          enterKeyHint="search"
        />
        <button type="submit" aria-label={lang?.search || 'Поиск'} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full duration-300 hover:bg-zinc-700 active:scale-95">
          <Icon name="IC-search" className="inline h-8 w-8 fill-white" />
        </button>
      </form>

      {open && suggestions.length > 0 ? (
        <div className="absolute top-0 z-[10] flex w-full flex-col gap-3 rounded-3xl pt-14">
          {suggestions.map((suggestion, index) => (
            <span
              key={suggestion}
              onMouseDown={(event) => {
                event.preventDefault();
                pick(index);
              }}
              className={cn(
                'glass-menu [--glass-blur:16px] w-full cursor-pointer overflow-hidden rounded-3xl border border-zinc-600/30 px-3 py-2 text-white shadow duration-300 active:scale-95 hover:[--glass-tint:var(--color-zinc-800)] hover:[--glass-alpha:0.9]',
                index === focused ? '[--glass-tint:var(--color-zinc-800)] [--glass-alpha:1]' : '[--glass-alpha:0.8]',
              )}
            >
              {suggestion}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
