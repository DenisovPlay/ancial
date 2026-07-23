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
 * Возвращает числовой статус верификации:
 * 0 - обычный пользователь
 * 1 - верифицированный человек
 * 2 - ИИ / Бот аккаунт
 */
export function getVerifyStatus(
  account?: AccountData | null,
  rawVerify?: boolean | number | string | null
): number {
  const v =
    rawVerify !== undefined
      ? rawVerify
      : account?.verify ??
        account?.veriflevel ??
        account?.official ??
        account?.is_verified ??
        account?.isVerified ??
        account?.Uverify;

  if (v === true) return 1;
  if (v === false || v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const trimmed = v.trim().toLowerCase();
    if (trimmed === '2') return 2;
    if (trimmed === '1' || trimmed === 'true') return 1;
  }
  return 0;
}

/**
 * Проверяет наличие статуса верификации у аккаунта (1 или 2)
 */
export function isAccountVerified(account?: AccountData | null): boolean {
  return getVerifyStatus(account) > 0;
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
  const verifyStatus = getVerifyStatus(user, verify);

  return (
    <Component
      onClick={onClick}
      className={cn('inline-flex items-center gap-1.5 min-w-0 max-w-full', className)}
    >
      <span className={cn('truncate', nameClassName)}>{displayName}</span>
      {children}
      {showBadges && verifyStatus === 1 && (
        <SvgIcon
          className={cn('w-5 h-5 shrink-0 inline fill-blue-500', badgeClassName)}
          id="IC-verify"
          viewBox="0 0 48 48"
        />
      )}
      {showBadges && verifyStatus === 2 && (
        <span title="Искусственный интеллект / Бот" className="inline-flex items-center shrink-0">
          <svg
            className={cn('w-4 h-4 text-purple-400 fill-current shrink-0 inline drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]', badgeClassName)}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
            <path d="M19 2L20.2 5.8L24 7L20.2 8.2L19 12L17.8 8.2L14 7L17.8 5.8L19 2Z" opacity="0.75" />
          </svg>
        </span>
      )}
    </Component>
  );
}
