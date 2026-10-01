'use client';

import { useCallback, useEffect, useState } from 'react';

import SettingSelect from '../../components/setting-select';
import { useNotification } from '../../context/NotificationContext';
import { AncialAPI } from '../../lib/api-v2';

type Lang = Record<string, string> | null | undefined;
type Pref = { inapp: boolean; push: boolean };

const CATEGORIES = [
  { id: 'social', key: 'notif_cat_social', fallback: 'Комментарии и оценки' },
  { id: 'people', key: 'notif_cat_people', fallback: 'Друзья и звонки' },
  { id: 'chat', key: 'notif_cat_chat', fallback: 'Сообщения в чатах' },
  { id: 'wallet', key: 'notif_cat_wallet', fallback: 'Кошелёк' },
] as const;

type Mode = 'all' | 'push' | 'inapp' | 'none';

const toMode = (pref: Pref): Mode => (pref.inapp && pref.push ? 'all' : pref.push ? 'push' : pref.inapp ? 'inapp' : 'none');
const fromMode = (mode: Mode): Pref => ({ inapp: mode === 'all' || mode === 'inapp', push: mode === 'all' || mode === 'push' });

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
      <span className="text-xl">{lang?.notif_prefs_title || 'Какие уведомления получать'}</span>
      {CATEGORIES.map((category) => (
        <SettingSelect<Mode>
          key={category.id}
          label={lang?.[category.key] || category.fallback}
          value={toMode(prefs[category.id] ?? { inapp: true, push: true })}
          onChange={(mode) => update(category.id, fromMode(mode))}
          options={[
            { value: 'all', label: lang?.notif_mode_all || 'Везде' },
            { value: 'push', label: lang?.notif_mode_push || 'Только Push' },
            { value: 'inapp', label: lang?.notif_mode_inapp || 'Только лента уведомлений' },
            { value: 'none', label: lang?.notif_mode_none || 'Нигде' },
          ]}
        />
      ))}
      <SettingSelect<Mode>
        label={lang?.notif_cat_security || 'Безопасность'}
        value="all"
        onChange={() => {}}
        disabled
        options={[
          { value: 'all', label: lang?.notif_mode_all || 'Везде' },
          { value: 'push', label: lang?.notif_mode_push || 'Только Push' },
          { value: 'inapp', label: lang?.notif_mode_inapp || 'Только лента уведомлений' },
          { value: 'none', label: lang?.notif_mode_none || 'Нигде' },
        ]}
      />
    </div>
  );
}
