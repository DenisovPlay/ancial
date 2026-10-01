'use client';

import { useCallback, useEffect, useState } from 'react';

import Icon from '../../components/svg-icon';
import { useNotification } from '../../context/NotificationContext';
import { AncialAPI } from '../../lib/api-v2';
import { cn } from '../../lib/cn';

type Lang = Record<string, string> | null | undefined;
type Pref = { inapp: boolean; push: boolean };

const CATEGORIES = [
  { id: 'social', key: 'notif_cat_social', fallback: 'Комментарии и оценки' },
  { id: 'people', key: 'notif_cat_people', fallback: 'Друзья и звонки' },
  { id: 'chat', key: 'notif_cat_chat', fallback: 'Сообщения в чатах' },
  { id: 'wallet', key: 'notif_cat_wallet', fallback: 'Кошелёк' },
] as const;

function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 shrink-0 cursor-pointer rounded-full border border-zinc-600/30 duration-300 active:scale-95',
        checked ? 'bg-purple-600' : 'bg-zinc-800',
      )}
    >
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white duration-300', checked ? 'left-6' : 'left-1')} />
    </button>
  );
}

/** Какие уведомления получать: по категориям — в ленте и push. Безопасность не отключается. */
export default function NotificationPrefs({ lang }: { lang: Lang }) {
  const { showNote } = useNotification();
  const [prefs, setPrefs] = useState<Record<string, Pref> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void AncialAPI.getNotificationPrefs()
      .then((result) => {
        if (!cancelled) setPrefs(result.prefs);
      })
      .catch((error: unknown) => console.error('Failed to load notification prefs', error));
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(
    (category: string, patch: Partial<Pref>) => {
      const previous = prefs?.[category] ?? { inapp: true, push: true };
      const next = { ...previous, ...patch };
      setPrefs((current) => ({ ...(current ?? {}), [category]: next }));
      AncialAPI.setNotificationPref(category, next.push, next.inapp).catch((error: unknown) => {
        console.error('Failed to save notification pref', error);
        setPrefs((current) => ({ ...(current ?? {}), [category]: previous }));
        showNote({ content: lang?.somethingwrong || 'Что-то пошло не так', type: 'error', time: 5 });
      });
    },
    [lang?.somethingwrong, prefs, showNote],
  );

  if (!prefs) return null;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-3 px-3 lg:px-0">
      <span className="text-xl font-semibold text-zinc-100">{lang?.notif_prefs_title || 'Какие уведомления получать'}</span>
      <div className="flex flex-col gap-3 rounded-3xl border border-zinc-600/30 bg-zinc-900/70 p-3">
        <div className="flex items-center gap-3 px-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <span className="flex-grow" />
          <span className="w-12 text-center">{lang?.notif_pref_inapp || 'В ленте'}</span>
          <span className="w-12 text-center">{lang?.notif_pref_push || 'Push'}</span>
        </div>
        {CATEGORIES.map((category) => {
          const pref = prefs[category.id] ?? { inapp: true, push: true };
          const label = lang?.[category.key] || category.fallback;
          return (
            <div key={category.id} className="flex items-center gap-3 rounded-full bg-zinc-800/60 px-3 py-2">
              <span className="flex-grow text-zinc-100">{label}</span>
              <Switch checked={pref.inapp} label={`${label}: ${lang?.notif_pref_inapp || 'В ленте'}`} onChange={(next) => update(category.id, { inapp: next })} />
              <Switch checked={pref.push} label={`${label}: ${lang?.notif_pref_push || 'Push'}`} onChange={(next) => update(category.id, { push: next })} />
            </div>
          );
        })}
        <div className="flex items-center gap-3 rounded-full bg-zinc-800/60 px-3 py-2 text-zinc-300">
          <Icon name="IC-lock" className="h-5 w-5 shrink-0 fill-zinc-400" />
          <span className="flex-grow">{lang?.notif_cat_security || 'Безопасность (всегда включено)'}</span>
        </div>
      </div>
    </div>
  );
}
