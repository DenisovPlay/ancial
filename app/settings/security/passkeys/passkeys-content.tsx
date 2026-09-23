'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI, type Passkey } from '../../../lib/api-v2';
import { cache } from '../../../lib/cache';
import { createPasskey, isPasskeySupported } from '../../../lib/webauthn';
import Modal from '../../../components/modal';
import Icon from '../../../components/svg-icon';

function PasskeysSkeleton() {
  return (
    <div className="rounded-3xl flex flex-col border border-zinc-600/30 bg-zinc-900 overflow-hidden">
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 border-b border-zinc-600/20 last:border-b-0">
          <div className="h-11 w-11 shrink-0 rounded-full bg-zinc-700/60 animate-pulse" />
          <div className="flex min-w-0 flex-grow flex-col gap-2">
            <div className="h-4 w-32 rounded-full bg-zinc-700/60 animate-pulse" />
            <div className="h-3 w-44 rounded-full bg-zinc-800 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PasskeysContent() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, lang } = useAuth();
  const { showNote } = useNotification();

  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);
  // Модалка ввода названия: mode 'add' — назвать перед добавлением, 'rename' — переименовать.
  const [nameModal, setNameModal] = useState<{ mode: 'add' | 'rename'; id: number } | null>(null);
  const [nameValue, setNameValue] = useState('');

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

    // Кеш-first: сразу показываем сохранённые ключи, затем фоновое обновление.
    const cached = cache.get<Passkey[]>('passkeys_cache', { category: 'profile', subcategory: 'passkeys' });
    if (cached && cached.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPasskeys(cached);
      setLoading(false);
    }

    void (async () => {
      try {
        const result = await AncialAPI.passkeyList();
        if (cancelled) return;
        const list = Array.isArray(result.passkeys) ? result.passkeys : [];
        setPasskeys(list);
        cache.set('passkeys_cache', list, { category: 'profile', subcategory: 'passkeys' });
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

  // Клик в модалке — это пользовательский жест, поэтому ceremony WebAuthn можно запускать отсюда.
  const addPasskey = async (nickname: string) => {
    setBusy(true);
    try {
      const options = await AncialAPI.passkeyRegistrationOptions();
      const created = await createPasskey(options);
      const result = await AncialAPI.passkeyRegistrationVerify({ ...created, nickname: nickname.trim() || 'Passkey' });
      { const list = Array.isArray(result.passkeys) ? result.passkeys : []; setPasskeys(list); cache.set('passkeys_cache', list, { category: 'profile', subcategory: 'passkeys' }); }
      showNote({ content: lang?.passkey_added || 'Passkey добавлен', type: 'success', time: 3 });
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') return; // пользователь отменил
      showNote({ content: lang?.passkey_add_error || 'Не удалось добавить passkey', type: 'error', time: 4 });
    } finally {
      setBusy(false);
    }
  };

  const rename = async (id: number, nickname: string) => {
    try {
      const result = await AncialAPI.passkeyRename(id, nickname.trim() || 'Passkey');
      { const list = Array.isArray(result.passkeys) ? result.passkeys : []; setPasskeys(list); cache.set('passkeys_cache', list, { category: 'profile', subcategory: 'passkeys' }); }
    } catch {
      showNote({ content: lang?.passkey_rename_error || 'Не удалось переименовать', type: 'error', time: 4 });
    }
  };

  const openAddModal = () => {
    setNameValue('Passkey');
    setNameModal({ mode: 'add', id: 0 });
  };

  const openRenameModal = (id: number, current: string | null) => {
    setNameValue(current || 'Passkey');
    setNameModal({ mode: 'rename', id });
  };

  const submitNameModal = async () => {
    const mode = nameModal?.mode;
    const id = nameModal?.id ?? 0;
    const value = nameValue;
    setNameModal(null);
    if (mode === 'add') {
      await addPasskey(value);
    } else if (mode === 'rename') {
      await rename(id, value);
    }
  };

  const revoke = async (id: number) => {
    try {
      const result = await AncialAPI.passkeyRevoke(id);
      { const list = Array.isArray(result.passkeys) ? result.passkeys : []; setPasskeys(list); cache.set('passkeys_cache', list, { category: 'profile', subcategory: 'passkeys' }); }
      showNote({ content: lang?.passkey_removed || 'Passkey удалён', type: 'success', time: 3 });
    } catch {
      showNote({ content: lang?.passkey_remove_error || 'Не удалось удалить passkey', type: 'error', time: 4 });
    }
  };

  if (isLoading && !user) {
    return (
      <div className="flex justify-center items-center w-full h-[60vh]">
        <Icon name="IC-loader" className="w-10 h-10 animate-spin fill-purple-500" />
      </div>
    );
  }
  if (!isAuthenticated || !user) return null;

  return (
    <div className="flex flex-col justify-center items-center gap-3 pb-3 w-full bg-gradient-to-b from-teal-400/25 md:from-transparent via-transparent to-transparent">
      <div className="w-full flex items-center justify-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-40">
        <div className="w-full max-w-3xl flex items-center gap-3">
          <Link
            href="/settings/security"
            className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Icon name="IC-chevron-left" className="w-8 h-8 fill-white inline" />
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

        {loading && passkeys.length === 0 ? (
          <PasskeysSkeleton />
        ) : passkeys.length === 0 ? (
          <div className="rounded-3xl border border-zinc-600/30 bg-zinc-900 p-6 text-center text-sm text-zinc-500">
            {lang?.passkeys_empty || 'Passkeys пока не добавлены.'}
          </div>
        ) : (
          <div className="rounded-3xl flex flex-col border border-zinc-600/30 bg-zinc-900 overflow-hidden">
            {passkeys.map((passkey) => (
              <div key={passkey.id} className="flex items-center gap-3 p-3 border-b border-zinc-600/20 last:border-b-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-500/10">
                  <Icon name="IC-lock" className="h-6 w-6 fill-rose-400" />
                </div>
                <div className="flex min-w-0 flex-grow flex-col">
                  <span className="truncate text-sm font-medium text-white">{passkey.nickname || 'Passkey'}</span>
                  <span className="truncate text-xs text-zinc-500">
                    {lang?.passkey_added_at || 'Добавлен'}: {passkey.created_at}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openRenameModal(passkey.id, passkey.nickname)}
                  aria-label={lang?.passkey_rename || 'Переименовать'}
                  title={lang?.passkey_rename || 'Переименовать'}
                  className="shrink-0 w-10 h-10 flex items-center justify-center cursor-pointer rounded-full border border-transparent text-zinc-300 duration-300 hover:border-zinc-600/30 hover:bg-zinc-700/80 hover:text-white active:scale-95"
                >
                  <Icon name="IC-edit" className="w-5 h-5 fill-current" />
                </button>
                <button
                  type="button"
                  onClick={() => void revoke(passkey.id)}
                  aria-label={lang?.passkey_delete || 'Удалить'}
                  title={lang?.passkey_delete || 'Удалить'}
                  className="shrink-0 w-10 h-10 flex items-center justify-center cursor-pointer rounded-full border border-transparent text-red-400 duration-300 hover:border-red-500/30 hover:bg-red-500/15 active:scale-95"
                >
                  <Icon name="IC-trash" className="w-5 h-5 fill-current" />
                </button>
              </div>
            ))}
          </div>
        )}

        {supported ? (
          <button
            type="button"
            onClick={openAddModal}
            disabled={busy}
            className="w-full cursor-pointer rounded-full border border-zinc-600/30 bg-purple-500 px-4 py-2.5 text-sm font-medium text-white duration-300 hover:bg-purple-600 active:scale-95 disabled:opacity-40"
          >
            {busy ? (lang?.loading || 'Загрузка...') : (lang?.passkey_add || 'Добавить passkey')}
          </button>
        ) : null}
      </div>

      <div className="lg:hidden"><br /><br /><br /><br /></div>

      <Modal
        isOpen={nameModal !== null}
        onClose={() => setNameModal(null)}
        title={nameModal?.mode === 'rename' ? (lang?.passkey_rename || 'Переименовать') : (lang?.passkey_add || 'Добавить passkey')}
        width="sm"
      >
        <form
          onSubmit={(e) => { e.preventDefault(); void submitNameModal(); }}
          className="flex flex-col gap-3"
        >
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            maxLength={120}
            placeholder={lang?.passkey_name_prompt || 'Название ключа'}
            className="h-12 px-3 rounded-full bg-zinc-800 border border-zinc-600/30 text-white focus:outline-0"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setNameModal(null)}
              className="flex-1 cursor-pointer rounded-full border border-zinc-600/30 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 duration-300 hover:bg-zinc-700 active:scale-95"
            >
              {lang?.cancel || 'Отмена'}
            </button>
            <button
              type="submit"
              className="flex-1 cursor-pointer rounded-full border border-zinc-600/30 bg-purple-500 px-4 py-2.5 text-sm font-medium text-white duration-300 hover:bg-purple-600 active:scale-95"
            >
              {nameModal?.mode === 'rename' ? (lang?.save || 'Сохранить') : (lang?.passkey_add || 'Добавить passkey')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
