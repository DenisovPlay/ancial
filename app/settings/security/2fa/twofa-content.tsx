'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI, getApiMessage } from '../../../lib/api-v2';
import { cache } from '../../../lib/cache';
import { OtpInput } from '../../../components/otp-input';
import AppImage from '../../../components/app-image';
import Icon from '../../../components/svg-icon';

type View = 'idle' | 'enable_password' | 'enable_confirm' | 'recovery' | 'disable';

function formatSecret(secret: string): string {
  return (secret.match(/.{1,4}/g) || [secret]).join(' ');
}

export default function TwoFactorContent() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, lang } = useAuth();
  const { showNote } = useNotification();

  const [enabled, setEnabled] = useState(false);
  const [recoveryRemaining, setRecoveryRemaining] = useState(0);
  const [statusLoading, setStatusLoading] = useState(true);
  const [view, setView] = useState<View>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [secret, setSecret] = useState('');
  const [otpauth, setOtpauth] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?backurl=/settings/security/2fa');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    // Кеш-first: сразу показываем сохранённый статус, затем фоновое обновление.
    const cached = cache.get<{ enabled: boolean; recovery_remaining: number }>('twofa_status_cache', { category: 'profile', subcategory: 'twofa' });
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEnabled(Boolean(cached.enabled));
      setRecoveryRemaining(Number(cached.recovery_remaining) || 0);
      setStatusLoading(false);
    }

    void (async () => {
      try {
        const status = await AncialAPI.twoFactorStatus();
        if (cancelled) return;
        setEnabled(Boolean(status.enabled));
        setRecoveryRemaining(Number(status.recovery_remaining) || 0);
        cache.set('twofa_status_cache', { enabled: Boolean(status.enabled), recovery_remaining: Number(status.recovery_remaining) || 0 }, { category: 'profile', subcategory: 'twofa' });
      } catch {
        // тихо: страница покажет текущее (выключенное) состояние
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const resetForms = () => {
    setPassword('');
    setCode('');
    setUseRecovery(false);
    setError(null);
    setQrUrl('');
  };

  const startSetup = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await AncialAPI.twoFactorSetup(password);
      setSecret(result.secret);
      setOtpauth(result.otpauth);
      // QR генерируем на клиенте: otpauth-секрет никуда не уходит (в отличие от wallet-QR).
      try {
        const qrcode = (await import('qrcode-generator')).default;
        const qr = qrcode(0, 'M');
        qr.addData(result.otpauth);
        qr.make();
        setQrUrl(qr.createDataURL(6, 2));
      } catch {
        setQrUrl('');
      }
      setCode('');
      setView('enable_confirm');
    } catch (err) {
      setError(getApiMessage(err instanceof Error ? err.message : '', lang, lang?.twofa_wrong_password || 'Неверный пароль'));
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async (codeOverride?: string) => {
    const useCode = codeOverride ?? code;
    setBusy(true);
    setError(null);
    try {
      const result = await AncialAPI.twoFactorConfirm(useCode);
      setRecoveryCodes(Array.isArray(result.recovery_codes) ? result.recovery_codes : []);
      setEnabled(true);
      setRecoveryRemaining(result.recovery_codes?.length || 0);
      cache.set('twofa_status_cache', { enabled: true, recovery_remaining: result.recovery_codes?.length || 0 }, { category: 'profile', subcategory: 'twofa' });
      setView('recovery');
    } catch (err) {
      setError(getApiMessage(err instanceof Error ? err.message : '', lang, lang?.twofa_wrong_code || 'Неверный код'));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError(null);
    try {
      await AncialAPI.twoFactorDisable(password, code, useRecovery);
      setEnabled(false);
      setRecoveryRemaining(0);
      cache.set('twofa_status_cache', { enabled: false, recovery_remaining: 0 }, { category: 'profile', subcategory: 'twofa' });
      resetForms();
      setView('idle');
      showNote({ content: lang?.twofa_disabled || 'Двухфакторная защита отключена', type: 'success', time: 3 });
    } catch (err) {
      setError(getApiMessage(err instanceof Error ? err.message : '', lang, lang?.twofa_wrong_code || 'Неверный код или пароль'));
    } finally {
      setBusy(false);
    }
  };

  const finishRecovery = () => {
    setRecoveryCodes([]);
    resetForms();
    setView('idle');
    showNote({ content: lang?.twofa_enabled || 'Двухфакторная защита включена', type: 'success', time: 3 });
  };

  if (isLoading && !user) {
    return (
      <div className="flex justify-center items-center w-full h-[60vh]">
        <Icon name="IC-loader" className="w-10 h-10 animate-spin fill-purple-500" />
      </div>
    );
  }
  if (!isAuthenticated || !user) return null;

  const errorBlock = error ? (
    <div className="px-3 py-2 bg-red-500/25 text-red-500 rounded-3xl w-full border border-zinc-600/30 text-sm">{error}</div>
  ) : null;

  return (
    <div className="flex flex-col justify-center items-center gap-3 pb-3 w-full bg-gradient-to-b from-rose-400/25 md:from-transparent via-transparent to-transparent">
      <div className="w-full flex items-center justify-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-40">
        <div className="w-full max-w-3xl flex items-center gap-3">
          <Link
            href="/settings/security"
            className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Icon name="IC-chevron-left" className="w-8 h-8 fill-white inline" />
            {lang?.twofa_title || 'Двухфакторная защита'}
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-3xl px-3 lg:px-0">
        <div className="rounded-3xl border border-zinc-600/30 bg-zinc-900 p-3 flex flex-col gap-3">
          {statusLoading ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 shrink-0 rounded-full bg-zinc-700/60 animate-pulse" />
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-40 rounded-full bg-zinc-700/60 animate-pulse" />
                  <div className="h-3 w-24 rounded-full bg-zinc-800 animate-pulse" />
                </div>
              </div>
              <div className="h-3 w-full rounded-full bg-zinc-800 animate-pulse" />
              <div className="h-11 w-full rounded-full bg-zinc-800 animate-pulse" />
            </div>
          ) : view === 'recovery' ? (
            <>
              <span className="text-lg font-bold text-white">{lang?.twofa_recovery_title || 'Резервные коды'}</span>
              <p className="text-sm text-zinc-400">
                {lang?.twofa_recovery_hint || 'Сохраните эти коды в надёжном месте. Каждый работает один раз и поможет войти, если нет доступа к приложению. Больше они не покажутся.'}
              </p>
              <div className="grid grid-cols-2 gap-2 rounded-3xl bg-zinc-800/60 p-3 font-mono text-sm text-zinc-100">
                {recoveryCodes.map((rc) => (
                  <span key={rc} className="text-center tracking-widest">{rc}</span>
                ))}
              </div>
              <button
                type="button"
                onClick={finishRecovery}
                className="w-full rounded-full border border-zinc-600/30 bg-purple-500 px-4 py-2.5 text-sm font-medium text-white duration-300 hover:bg-purple-600 active:scale-95 cursor-pointer"
              >
                {lang?.twofa_saved_codes || 'Я сохранил коды'}
              </button>
            </>
          ) : view === 'enable_confirm' ? (
            <>
              <span className="text-lg font-bold text-white">{lang?.twofa_scan_title || 'Отсканируйте код'}</span>
              <p className="text-sm text-zinc-400">
                {lang?.twofa_scan_hint || 'Наведите приложение-аутентификатор на QR, затем введите 6-значный код из приложения.'}
              </p>

              {qrUrl ? (
                <div className="flex justify-center py-1">
                  <AppImage
                    src={qrUrl}
                    alt={lang?.twofa_qr_alt || 'QR-код для приложения-аутентификатора'}
                    width={196}
                    height={196}
                    className="h-[196px] w-[196px] rounded-3xl bg-white p-3"
                  />
                </div>
              ) : null}

              {/* Ручной ввод — ненавязчиво, для тех, кто не может отсканировать. */}
              <details className="group text-center">
                <summary className="cursor-pointer list-none text-xs text-zinc-500 hover:text-zinc-300 duration-300">
                  {lang?.twofa_cant_scan || 'Не получается отсканировать?'}
                </summary>
                <div className="mt-3 flex flex-col gap-2">
                  <div className="select-all font-mono text-sm tracking-widest text-zinc-200 break-all">{formatSecret(secret)}</div>
                  <a href={otpauth} className="text-xs text-purple-400 hover:text-purple-300 duration-300">
                    {lang?.twofa_open_app || 'Открыть в приложении'}
                  </a>
                </div>
              </details>

              <OtpInput
                value={code}
                onChange={setCode}
                onComplete={(full) => { void confirmSetup(full); }}
                disabled={busy}
                autoFocus
                ariaLabel={lang?.twofa_code_placeholder || 'Код'}
              />
              {errorBlock}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { resetForms(); setView('idle'); }}
                  className="flex-1 rounded-full border border-zinc-600/30 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 duration-300 hover:bg-zinc-700 active:scale-95 cursor-pointer"
                >
                  {lang?.cancel || 'Отмена'}
                </button>
                <button
                  type="button"
                  disabled={busy || code.length < 6}
                  onClick={() => void confirmSetup()}
                  className="flex-1 rounded-full border border-zinc-600/30 bg-purple-500 px-4 py-2.5 text-sm font-medium text-white duration-300 hover:bg-purple-600 active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  {lang?.twofa_confirm || 'Подтвердить'}
                </button>
              </div>
            </>
          ) : view === 'enable_password' || view === 'disable' ? (
            <>
              <span className="text-lg font-bold text-white">
                {view === 'disable' ? (lang?.twofa_disable || 'Отключить 2FA') : (lang?.twofa_enable || 'Включить 2FA')}
              </span>
              <input
                type="password"
                placeholder={lang?.password || 'Пароль'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 px-3 rounded-full bg-zinc-800 border border-zinc-600/30 focus:outline-0"
              />
              {view === 'disable' ? (
                useRecovery ? (
                  <input
                    placeholder={lang?.twofa_recovery_placeholder || 'xxxx-xxxx'}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="h-12 px-3 rounded-full bg-zinc-800 border border-zinc-600/30 text-center tracking-widest focus:outline-0"
                  />
                ) : (
                  <OtpInput value={code} onChange={setCode} disabled={busy} ariaLabel={lang?.twofa_code_placeholder || 'Код'} />
                )
              ) : null}
              {errorBlock}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { resetForms(); setView('idle'); }}
                  className="flex-1 rounded-full border border-zinc-600/30 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 duration-300 hover:bg-zinc-700 active:scale-95 cursor-pointer"
                >
                  {lang?.cancel || 'Отмена'}
                </button>
                <button
                  type="button"
                  disabled={busy || !password || (view === 'disable' && !code)}
                  onClick={() => (view === 'disable' ? void disable() : void startSetup())}
                  className="flex-1 rounded-full border border-zinc-600/30 bg-purple-500 px-4 py-2.5 text-sm font-medium text-white duration-300 hover:bg-purple-600 active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  {lang?.continue_btn || 'Продолжить'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
                  <Icon name="IC-lock" className="h-6 w-6 fill-purple-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">{lang?.twofa_title || 'Двухфакторная защита'}</span>
                  <span className="text-xs text-zinc-400">
                    {enabled
                      ? `${lang?.twofa_on || 'Включена'} · ${lang?.twofa_recovery_left || 'резервных кодов'}: ${recoveryRemaining}`
                      : (lang?.twofa_off || 'Выключена')}
                  </span>
                </div>
              </div>
              <p className="text-sm text-zinc-400">
                {lang?.twofa_intro || 'Дополнительный код из приложения-аутентификатора при входе. Защищает аккаунт, даже если пароль узнают.'}
              </p>
              {enabled ? (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => { resetForms(); setView('disable'); }}
                    className="w-full rounded-full border border-zinc-600/30 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-200 duration-300 hover:bg-zinc-700 active:scale-95 cursor-pointer"
                  >
                    {lang?.twofa_disable || 'Отключить 2FA'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { resetForms(); setView('enable_password'); }}
                  className="w-full rounded-full border border-zinc-600/30 bg-purple-500 px-4 py-2.5 text-sm font-medium text-white duration-300 hover:bg-purple-600 active:scale-95 cursor-pointer"
                >
                  {lang?.twofa_enable || 'Включить 2FA'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="lg:hidden"><br /><br /><br /><br /></div>
    </div>
  );
}
