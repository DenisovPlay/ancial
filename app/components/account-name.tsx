'use client';

import React from 'react';
import { cn, SvgIcon } from '../feed/editor-shared';

export interface AccountData {
  id?: string | number | null;
  name?: string | null;
  fname?: string | null;
  lname?: string | null;
  username?: string | null;
  login?: string | null;
  title?: string | null;
  verify?: boolean | number | string | null;
  veriflevel?: boolean | number | string | null;
  official?: boolean | number | string | null;
  is_verified?: boolean | number | string | null;
  isVerified?: boolean | number | string | null;
  Uverify?: boolean | number | string | null;
  type?: 'user' | 'group' | string | null;
}

/**
 * Извлекает и форматирует имя пользователя или сообщества
 */
export function getUserDisplayName(
  account?: AccountData | null,
  fallback: string = 'Пользователь'
): string {
  if (!account) return fallback;

  const fname = (account.fname ?? '').trim();
  const lname = (account.lname ?? '').trim();
  const combinedName = `${fname} ${lname}`.trim();

  if (combinedName) {
    return combinedName;
  }

  const directName = (account.name ?? account.title ?? '').trim();
  if (directName) {
    return directName;
  }

  const username = (account.username ?? account.login ?? '').trim();
  if (username) {
    return username;
  }

  return fallback;
}

/**
 * Проверяет наличие статуса верификации у аккаунта
 */
export function isAccountVerified(account?: AccountData | null): boolean {
  if (!account) return false;
  const v =
    account.verify ??
    account.veriflevel ??
    account.official ??
    account.is_verified ??
    account.isVerified ??
    account.Uverify;

  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') {
    const trimmed = v.trim().toLowerCase();
    return trimmed === '1' || trimmed === 'true';
  }
  return false;
}

export interface AccountNameProps {
  /** Объект пользователя или сообщества */
  user?: AccountData | null;
  /** Прямое указание имени (перекрывает user.name/fname/lname) */
  name?: string | null;
  /** Прямой флаг верификации */
  verify?: boolean | number | string | null;
  /** Показывать ли значки (верификации и др.). По умолчанию true. Для кошелька и некоторых списков можно отключать (false) */
  showBadges?: boolean;
  /** Запасной текст, если имя пустое */
  fallback?: string;
  /** Дополнительные CSS классы для обёртки */
  className?: string;
  /** Стили для самого имени (размер текста, жирность, цвет и т.д.) */
  nameClassName?: string;
  /** Стили для значка верификации */
  badgeClassName?: string;
  /** Элемент контейнера (по умолчанию 'span') */
  as?: React.ElementType;
  /** Событие клика */
  onClick?: (e: React.MouseEvent) => void;
  /** Дополнительное содержимое рядом с именем */
  children?: React.ReactNode;
}

/**
 * Единый адаптивный компонент отображения имени аккаунта и его значков
 */
export default function AccountName({
  user,
  name,
  verify,
  showBadges = true,
  fallback = 'Пользователь',
  className,
  nameClassName,
  badgeClassName,
  as: Component = 'span',
  onClick,
  children,
}: AccountNameProps) {
  const displayName = name ?? getUserDisplayName(user, fallback);
  const verified =
    verify !== undefined ? isAccountVerified({ verify }) : isAccountVerified(user);

  return (
    <Component
      onClick={onClick}
      className={cn('inline-flex items-center gap-1.5 min-w-0 max-w-full', className)}
    >
      <span className={cn('truncate', nameClassName)}>{displayName}</span>
      {children}
      {showBadges && verified && (
        <SvgIcon
          className={cn('w-5 h-5 shrink-0 inline fill-blue-500', badgeClassName)}
          id="IC-verify"
          viewBox="0 0 48 48"
        />
      )}
    </Component>
  );
}
