'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI, type Passkey } from '../../../lib/api-v2';
import { createPasskey, isPasskeySupported } from '../../../lib/webauthn';

export default function PasskeysContent() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, lang } = useAuth();
  const { showNote } = useNotification();

  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?backurl=/settings/security/passkeys');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    // navigator недоступен на сервере: определяем поддержку на клиенте, сеттлер здесь источник правды.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(isPasskeySupported());
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await AncialAPI.passkeyList();
        if (cancelled) return;
        setPasskeys(Array.isArray(result.passkeys) ? result.passkeys : []);
      } catch {
        // тихо
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const addPasskey = async () => {
    setBusy(true);
    try {
      const options = await AncialAPI.passkeyRegistrationOptions();
      const created = await createPasskey(options);
      const nickname = window.prompt(lang?.passkey_name_prompt || 'Название ключа', 'Passkey') || 'Passkey';
      const result = await AncialAPI.passkeyRegistrationVerify({ ...created, nickname });
      setPasskeys(Array.isArray(result.passkeys) ? result.passkeys : []);
      showNote({ content: lang?.passkey_added || 'Passkey добавлен', type: 'success', time: 3 });
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') return; // пользователь отменил
      showNote({ content: lang?.passkey_add_error || 'Не удалось добавить passkey', type: 'error', time: 4 });
    } finally {
      setBusy(false);
    }
  };

  const rename = async (id: number, current: string | null) => {
    const nickname = window.prompt(lang?.passkey_name_prompt || 'Название ключа', current || 'Passkey');
    if (!nickname) return;
    try {
      const result = await AncialAPI.passkeyRename(id, nickname);
      setPasskeys(Array.isArray(result.passkeys) ? result.passkeys : []);
    } catch {
      showNote({ content: lang?.passkey_rename_error || 'Не удалось переименовать', type: 'error', time: 4 });
    }
  };

  const revoke = async (id: number) => {
    try {
      const result = await AncialAPI.passkeyRevoke(id);
      setPasskeys(Array.isArray(result.passkeys) ? result.passkeys : []);
      showNote({ content: lang?.passkey_removed || 'Passkey удалён', type: 'success', time: 3 });
    } catch {
      showNote({ content: lang?.passkey_remove_error || 'Не удалось удалить passkey', type: 'error', time: 4 });
    }
  };

  if (isLoading && !user) {
    return (
      <div className="flex justify-center items-center w-full h-[60vh]">
        <svg className="w-10 h-10 animate-spin fill-purple-500" viewBox="0 0 48 48">
          <use href="#IC-loader"></use>
        </svg>
      </div>
    );
  }
  if (!isAuthenticated || !user) return null;

  return (
    <div className="flex flex-col justify-center items-center gap-3 pb-3 w-full bg-gradient-to-b from-blue-400/25 md:from-transparent via-transparent to-transparent">
      <div className="w-full flex items-center justify-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-40">
        <div className="w-full max-w-3xl flex items-center gap-3">
          <Link
            href="/settings/security"
            className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <use href="#IC-chevron-left"></use>
            </svg>
            {lang?.passkeys_title || 'Passkeys'}
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-3xl px-3 lg:px-0">
        <p className="text-sm text-zinc-400 px-1">
          {lang?.passkeys_intro || 'Вход по отпечатку, лицу или PIN устройства — без пароля. Passkey привязан к устройству и не может быть украден как пароль.'}
        </p>

        {!supported ? (
          <div className="rounded-3xl border border-zinc-600/30 bg-zinc-900 p-6 text-center text-sm text-zinc-400">
            {lang?.passkeys_unsupported || 'Этот браузер не поддерживает passkey.'}
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-10">
            <svg className="w-8 h-8 animate-spin fill-purple-500" viewBox="0 0 48 48">
              <use href="#IC-loader"></use>
            </svg>
          </div>
        ) : passkeys.length === 0 ? (
          <div className="rounded-3xl border border-zinc-600/30 bg-zinc-900 p-6 text-center text-sm text-zinc-500">
            {lang?.passkeys_empty || 'Passkeys пока не добавлены.'}
          </div>
        ) : (
          <div className="rounded-3xl flex flex-col border border-zinc-600/30 bg-zinc-900 overflow-hidden">
            {passkeys.map((passkey) => (
              <div key={passkey.id} className="flex items-center gap-3 p-3 border-b border-zinc-600/20 last:border-b-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-500/10">
                  <svg className="h-6 w-6 fill-rose-400" viewBox="0 0 48 48">
                    <use href="#IC-lock"></use>
                  </svg>
                </div>
                <div className="flex min-w-0 flex-grow flex-col">
                  <span className="truncate text-sm font-medium text-white">{passkey.nickname || 'Passkey'}</span>
                  <span className="truncate text-xs text-zinc-500">
                    {lang?.passkey_added_at || 'Добавлен'}: {passkey.created_at}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void rename(passkey.id, passkey.nickname)}
                  className="shrink-0 cursor-pointer rounded-full border border-transparent px-3 py-2 text-xs text-zinc-300 duration-300 hover:border-zinc-600/30 hover:bg-zinc-700/80 hover:text-white active:scale-95"
                >
                  {lang?.passkey_rename || 'Переименовать'}
                </button>
                <button
                  type="button"
                  onClick={() => void revoke(passkey.id)}
                  className="shrink-0 cursor-pointer rounded-full border border-transparent px-3 py-2 text-xs text-red-400 duration-300 hover:border-red-500/30 hover:bg-red-500/15 active:scale-95"
                >
                  {lang?.passkey_delete || 'Удалить'}
                </button>
              </div>
            ))}
          </div>
        )}

        {supported ? (
          <button
            type="button"
            onClick={() => void addPasskey()}
            disabled={busy}
            className="w-full cursor-pointer rounded-full border border-zinc-600/30 bg-purple-500 px-4 py-2.5 text-sm font-medium text-white duration-300 hover:bg-purple-600 active:scale-95 disabled:opacity-40"
          >
            {busy ? (lang?.loading || 'Загрузка...') : (lang?.passkey_add || 'Добавить passkey')}
          </button>
        ) : null}
      </div>

      <div className="lg:hidden"><br /><br /><br /><br /></div>
    </div>
  );
}
