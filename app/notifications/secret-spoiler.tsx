'use client';

import { useCallback, useEffect, useState } from 'react';

import Icon from '../components/svg-icon';
import { AncialAPI, AncialAPIError } from '../lib/api-v2';
import { formatCountdown, secondsLeft, type Lang } from '../lib/notifications/kinds';
import type { RichNotification } from '../lib/notifications/types';

type RevealError = 'expired' | 'generic' | 'rate_limited' | 'used';

/**
 * Код входа в ленте: скрыт спойлером, настоящий код приходит отдельным запросом по нажатию.
 * Код живёт только в состоянии компонента (не в кэше), прячется, когда срок вышел.
 */
export default function SecretSpoiler({ notification, lang }: { notification: RichNotification; lang: Lang }) {
  const secret = notification.secret;
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(secret?.expires_at ?? null);
  const [left, setLeft] = useState(() => secondsLeft(secret?.expires_at ?? null));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<RevealError | null>(null);

  // Обратный отсчёт: по истечении срока код пропадает с экрана.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = secondsLeft(expiresAt);
      setLeft(next);
      if (next === 0) setCode(null);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const reveal = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await AncialAPI.revealNotificationSecret(notification.id);
      setExpiresAt(result.expires_at);
      setLeft(secondsLeft(result.expires_at));
      setCode(result.code);
    } catch (revealError) {
      if (revealError instanceof AncialAPIError) {
        const reason = (revealError.payload as { error?: string } | undefined)?.error;
        setError(reason === 'rate_limited' ? 'rate_limited' : reason === 'already_used' ? 'used' : reason === 'expired' ? 'expired' : 'generic');
      } else {
        setError('generic');
      }
    } finally {
      setBusy(false);
    }
  }, [busy, notification.id]);

  if (!secret) return null;

  const stateDone = secret.state === 'confirmed' || error === 'used';
  const stateExpired = !stateDone && (secret.state === 'expired' || error === 'expired' || (secret.expired && left === 0) || left === 0);

  if (stateDone) {
    return (
      <span className="pointer-events-auto flex w-fit items-center gap-1.5 rounded-full border border-zinc-600/30 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300">
        <Icon name="IC-check" className="h-4 w-4 fill-lime-400" />
        {lang?.notif_code_confirmed || 'Вход подтверждён'}
      </span>
    );
  }
  if (stateExpired) {
    return (
      <span className="pointer-events-auto flex w-fit items-center gap-1.5 rounded-full border border-zinc-600/30 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-500">
        <Icon name="IC-clock" className="h-4 w-4 fill-zinc-500" />
        {lang?.notif_code_expired || 'Код истёк'}
      </span>
    );
  }

  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-3">
      {code ? (
        <>
          <span className="rounded-full border border-zinc-600/30 bg-zinc-800 px-4 py-2 select-all font-mono text-xl font-bold tracking-[0.3em] text-white">{code}</span>
          <span className="text-xs tabular-nums text-zinc-500">{formatCountdown(left)}</span>
        </>
      ) : (
        <button
          type="button"
          onClick={() => void reveal()}
          disabled={busy}
          aria-label={lang?.notif_show_code || 'Показать код'}
          className="group/spoiler flex cursor-pointer items-center gap-3 rounded-full border border-zinc-600/30 bg-zinc-800 px-4 py-2 duration-300 hover:bg-zinc-700 active:scale-95 disabled:opacity-60"
        >
          <span aria-hidden="true" className="select-none font-mono text-xl font-bold tracking-[0.3em] text-zinc-200 blur-[5px] duration-300 group-hover/spoiler:blur-[3px]">000000</span>
          <span className="text-sm font-medium text-purple-300">{lang?.notif_show_code || 'Показать код'}</span>
        </button>
      )}
      {error === 'rate_limited' ? <span className="text-xs text-amber-400">{lang?.notif_code_rate_limited || 'Слишком часто, попробуйте позже'}</span> : null}
      {error === 'generic' ? <span className="text-xs text-red-400">{lang?.notif_code_error || 'Не удалось показать код'}</span> : null}
    </div>
  );
}
