'use client';

import React from 'react';
import { cn, SvgIcon } from '../feed/editor-shared';
import { useAuth } from '../context/AuthContext';

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
  badges?: string | null;
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
  const { lang } = useAuth();
  const displayName = name ?? getUserDisplayName(user, fallback);
  const verifyStatus = getVerifyStatus(user, verify);
  
  const badgesString = user?.badges || '';
  const badgesList = badgesString.split(',').map(b => b.trim().toLowerCase()).filter(Boolean);

  return (
    <Component
      onClick={onClick}
      className={cn('inline-flex items-center gap-1.5 min-w-0 max-w-full', className)}
    >
      <span className={cn('truncate', nameClassName)}>{displayName}</span>
      {children}
      {showBadges && verifyStatus === 1 && (
        <span title={lang?.badge_verify || 'Подтверждённый аккаунт'} className="inline-flex shrink-0">
          <SvgIcon
            className={cn('w-5 h-5 inline fill-blue-500', badgeClassName)}
            id="IC-verify"
            viewBox="0 0 48 48"
          />
        </span>
      )}
      {showBadges && badgesList.includes('ai') && (
        <span title={lang?.badge_ai || 'Искусственный интеллект / Бот'} className="inline-flex items-center shrink-0">
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
      {showBadges && badgesList.includes('developer') && (
        <span title={lang?.badge_developer || 'Разработчик Ancial'} className="inline-flex items-center shrink-0">
          <svg
            className={cn('w-4 h-4 text-cyan-400 shrink-0 inline drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]', badgeClassName)}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </span>
      )}
      {showBadges && badgesList.includes('staff') && (
        <span title={lang?.badge_staff || 'Команда Ancial'} className="inline-flex items-center shrink-0">
          <svg
            className={cn('w-4 h-4 text-rose-500 shrink-0 inline drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]', badgeClassName)}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </span>
      )}
      {showBadges && badgesList.includes('brand') && (
        <span title={lang?.badge_brand || 'Бизнес-аккаунт'} className="inline-flex items-center shrink-0">
          <svg
            className={cn('w-4 h-4 text-blue-400 shrink-0 inline drop-shadow-[0_0_6px_rgba(96,165,250,0.5)]', badgeClassName)}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M20 7h-4V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-10-2h4v2h-4V5z" />
          </svg>
        </span>
      )}
      {showBadges && badgesList.includes('pioneer') && (
        <span title={lang?.badge_pioneer || 'Первопроходец'} className="inline-flex items-center shrink-0">
          <svg
            className={cn('w-4 h-4 text-orange-500 shrink-0 inline drop-shadow-[0_0_6px_rgba(249,115,22,0.5)]', badgeClassName)}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
          </svg>
        </span>
      )}
      {showBadges && badgesList.includes('beta_tester') && (
        <span title={lang?.badge_beta_tester || 'Бета-тестер'} className="inline-flex items-center shrink-0">
          <svg
            className={cn('w-4 h-4 text-emerald-500 shrink-0 inline drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]', badgeClassName)}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <path d="M4.93 10.93 2 12" />
            <path d="M19.07 10.93 22 12" />
            <path d="M2 18h2" />
            <path d="M20 18h2" />
            <path d="M12 22v-4" />
            <rect x="7" y="6" width="10" height="12" rx="5" />
            <path d="M12 11v4" />
            <path d="M8 11h8" />
            <path d="M8 15h8" />
          </svg>
        </span>
      )}
      {showBadges && badgesList.includes('creator') && (
        <span title={lang?.badge_creator || 'Известный автор'} className="inline-flex items-center shrink-0">
          <svg
            className={cn('w-4 h-4 text-amber-500 shrink-0 inline drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]', badgeClassName)}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
        </span>
      )}
    </Component>
  );
}
