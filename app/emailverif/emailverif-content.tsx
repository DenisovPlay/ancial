'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { AncialAPI, getApiMessage } from '../lib/api-v2';
import { sanitizeUserHtml } from '../lib/sanitize-html';

function EmailVerifContentInner() {
  const { lang, user, checkAuth } = useAuth();
  const { showNote } = useNotification();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCode = searchParams.get('code') || '';

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [manualCode, setManualCode] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!urlCode) {
      // Нет кода в URL — терминальное состояние.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('idle');
      return;
    }

    let isMounted = true;
    setStatus('loading');

    AncialAPI.verifyEmailCode(urlCode)
      .then(() => {
        if (!isMounted) return;
        setStatus('success');
        checkAuth({ silent: true });
        showNote({
          content: lang?.successfullF || 'Успех!',
          type: 'success',
          time: 5,
        });
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setStatus('error');
        const rawMsg = err instanceof Error ? err.message : null;
        const msg = getApiMessage(rawMsg, lang, lang?.somethingwrong || 'Ошибка подтверждения');
        setErrorMessage(msg);
        showNote({
          content: msg,
          type: 'error',
          time: 5,
        });
      });

    return () => {
      isMounted = false;
    };
  }, [urlCode, checkAuth, showNote, lang]);

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeToVerify = manualCode.trim();
    if (!codeToVerify) return;

    setSubmitting(true);
    try {
      await AncialAPI.verifyEmailCode(codeToVerify);
      setStatus('success');
      checkAuth({ silent: true });
      showNote({
        content: lang?.successfullF || 'Успех!',
        type: 'success',
        time: 5,
      });
    } catch (err: unknown) {
      setStatus('error');
      const rawMsg = err instanceof Error ? err.message : null;
      const msg = getApiMessage(rawMsg, lang, lang?.somethingwrong || 'Ошибка подтверждения');
      setErrorMessage(msg);
      showNote({
        content: msg,
        type: 'error',
        time: 5,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-3">
      <div className="w-full max-w-md bg-zinc-900/80 border border-zinc-800 backdrop-blur-2xl rounded-3xl p-3 flex flex-col items-center text-center gap-3 shadow-2xl transition-all duration-300">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {lang?.verifimyemail || 'Подтвердить почту'}
        </h1>

        {/* LOADING STATE */}
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-zinc-400 text-sm animate-pulse">
              Проверка кода подтверждения...
            </p>
          </div>
        )}

        {/* SUCCESS STATE */}
        {status === 'success' && (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <svg className="w-7 h-7 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-3xl p-3 text-emerald-200 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeUserHtml(lang?.Pemailverified || 'Почта успешно подтверждена!') }} />

            <Link
              href="/settings/security"
              className="w-full py-3.5 px-5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-medium rounded-3xl transition-all duration-300 shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{lang?.Popensecsettings || 'Открыть настройки безопасности'}</span>
            </Link>
          </div>
        )}

        {/* ERROR STATE */}
        {status === 'error' && (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="bg-rose-950/40 border border-rose-500/20 rounded-3xl p-3 text-rose-200 text-sm">
              {errorMessage || lang?.somethingwrong || 'Ошибка подтверждения'}
            </div>

            <button
              onClick={() => setStatus('idle')}
              className="w-full py-3 px-5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 text-sm font-medium rounded-3xl transition-all duration-300 cursor-pointer"
            >
              Ввести код вручную
            </button>
          </div>
        )}

        {/* IDLE / MANUAL INPUT FORM */}
        {status === 'idle' && (
          <form onSubmit={handleManualVerify} className="w-full flex flex-col gap-3">
            <p className="text-zinc-400 text-sm">
              Введи код подтверждения из электронного письма:
            </p>
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="123456"
              maxLength={12}
              className="w-full px-4 py-3.5 bg-zinc-950/60 border border-zinc-600/30 rounded-full text-center text-xl font-mono tracking-widest text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-all duration-300"
            />
            <button
              type="submit"
              disabled={submitting || !manualCode.trim()}
              className="border border-zinc-600/30 w-full py-3.5 px-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-white font-medium rounded-full transition-all duration-300 shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>{lang?.verifimyemail || 'Подтвердить почту'}</span>
              )}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function EmailVerifContent() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-3">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        </main>
      }
    >
      <EmailVerifContentInner />
    </Suspense>
  );
}
