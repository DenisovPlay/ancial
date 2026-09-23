'use client';

import React from 'react';
import { cn, } from '../feed/editor-shared';
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
 * Декодирует HTML-сущности в строку
 */
import { decodeHtmlEntities } from '../lib/convert';
import Icon from './svg-icon';

export { decodeHtmlEntities };

/**
 * Извлекает и форматирует имя пользователя или сообщества
 */
export function getUserDisplayName(
  account?: AccountData | null,
  fallback: string = 'Пользователь'
): string {
  if (!account) return fallback;

  const fname = decodeHtmlEntities(account.fname ?? '').trim();
  const lname = decodeHtmlEntities(account.lname ?? '').trim();
  const combinedName = `${fname} ${lname}`.trim();

  if (combinedName) {
    return combinedName;
  }

  const directName = decodeHtmlEntities(account.name ?? account.title ?? '').trim();
  if (directName) {
    return directName;
  }

  const username = decodeHtmlEntities(account.username ?? account.login ?? '').trim();
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
          <Icon name="IC-verify" className={cn('w-5 h-5 inline fill-blue-500', badgeClassName)} />
        </span>
      )}
      {showBadges && badgesList.includes('ai') && (
        <span title={lang?.badge_ai || 'Искусственный интеллект / Бот'} className="inline-flex items-center shrink-0">
          <Icon name="IC-badge-ai" className={cn('w-4 h-4 text-purple-400 fill-current shrink-0 inline drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]', badgeClassName)} />
        </span>
      )}
      {showBadges && badgesList.includes('developer') && (
        <span title={lang?.badge_developer || 'Разработчик Zypo'} className="inline-flex items-center shrink-0">
          <Icon name="IC-badge-developer" className={cn('w-4 h-4 text-cyan-400 shrink-0 inline drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]', badgeClassName)} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </span>
      )}
      {showBadges && badgesList.includes('staff') && (
        <span title={lang?.badge_staff || 'Команда Zypo'} className="inline-flex items-center shrink-0">
          <Icon name="IC-badge-staff" className={cn('w-4 h-4 text-rose-500 shrink-0 inline drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]', badgeClassName)} fill="currentColor" />
        </span>
      )}
      {showBadges && badgesList.includes('brand') && (
        <span title={lang?.badge_brand || 'Бизнес-аккаунт'} className="inline-flex items-center shrink-0">
          <Icon name="IC-badge-brand" className={cn('w-4 h-4 text-blue-400 shrink-0 inline drop-shadow-[0_0_6px_rgba(96,165,250,0.5)]', badgeClassName)} fill="currentColor" />
        </span>
      )}
      {showBadges && badgesList.includes('pioneer') && (
        <span title={lang?.badge_pioneer || 'Первопроходец'} className="inline-flex items-center shrink-0">
          <Icon name="IC-badge-pioneer" className={cn('w-4 h-4 text-orange-500 shrink-0 inline drop-shadow-[0_0_6px_rgba(249,115,22,0.5)]', badgeClassName)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </span>
      )}
      {showBadges && badgesList.includes('beta_tester') && (
        <span title={lang?.badge_beta_tester || 'Бета-тестер'} className="inline-flex items-center shrink-0">
          <Icon name="IC-badge-beta-tester" className={cn('w-4 h-4 text-emerald-500 shrink-0 inline drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]', badgeClassName)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </span>
      )}
      {showBadges && badgesList.includes('creator') && (
        <span title={lang?.badge_creator || 'Известный автор'} className="inline-flex items-center shrink-0">
          <Icon name="IC-badge-creator" className={cn('w-4 h-4 text-amber-500 shrink-0 inline drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]', badgeClassName)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </span>
      )}
    </Component>
  );
}
