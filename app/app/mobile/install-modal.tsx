'use client';

import { useEffect, useState, type ReactNode } from 'react';

import Modal from '../../components/modal';
import AppImage from '../../components/app-image';
import Icon from '../../components/svg-icon';
import { MOBILE_APP_DOWNLOAD_URL, SITE_URL } from '../../config';
import { cn } from '../../lib/cn';
import { useAppReleases } from '../../lib/use-app-release';

export const BUTTON = 'flex items-center justify-center gap-3 px-4 py-2.5 rounded-full text-base font-semibold whitespace-nowrap cursor-pointer active:scale-95 duration-300';
const LINK = 'inline-block text-blue-400 hover:text-blue-300 duration-300 active:scale-95 cursor-pointer';

export type Lang = Record<string, string> | null | undefined;
export type Platform = 'android' | 'ios';

function Step({ index, children }: { index: number; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="w-8 h-8 shrink-0 rounded-full border border-zinc-600/30 bg-zinc-800 flex items-center justify-center text-sm font-semibold text-white">
        {index}
      </span>
      <span className="text-zinc-300 text-sm sm:text-base">{children}</span>
    </li>
  );
}

/** Генератор QR-кода на клиенте */
export function useQrDataUrl(value: string | null) {
  const [qr, setQr] = useState<{ value: string; url: string } | null>(null);
  useEffect(() => {
    if (!value) return undefined;
    let cancelled = false;
    void import('qrcode-generator')
      .then(({ default: qrcode }) => {
        const code = qrcode(0, 'M');
        code.addData(value);
        code.make();
        if (!cancelled) setQr({ value, url: code.createDataURL(6, 2) });
      })
      .catch((error: unknown) => console.error('Failed to build QR', error));
    return () => {
      cancelled = true;
    };
  }, [value]);
  return qr && qr.value === value ? qr.url : '';
}

type Method = 'file' | 'pwa';

/** Переключатель способов установки (как выбор Email/Телефон/Логин в окне перевода кошелька). */
function MethodSwitch({ method, onChange, options }: { method: Method; onChange: (next: Method) => void; options: Array<{ id: Method; label: string }> }) {
  return (
    <div role="tablist" className="flex rounded-3xl border border-zinc-800 bg-zinc-950/40 p-0.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={method === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            'flex-1 cursor-pointer rounded-full py-2 text-center text-sm font-semibold duration-300 active:scale-95',
            method === option.id ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Содержимое выбранной платформы; key по платформе сбрасывает выбор способа при смене. */
function InstallBody({ lang, platform }: { lang: Lang; platform: Platform }) {
  const releases = useAppReleases();
  const [method, setMethod] = useState<Method>('file');
  const release = releases?.[platform];
  const fileUrl = release?.download_url || '';
  const pageUrl = release?.release_url || MOBILE_APP_DOWNLOAD_URL;
  const isApk = platform === 'android';
  // Файл есть → прямая ссылка, иначе страница релизов (IPA могут выложить позже APK).
  const qrTarget = method === 'pwa' ? SITE_URL : (fileUrl || pageUrl);
  const qrUrl = useQrDataUrl(qrTarget);
  const fileLabel = isApk ? (lang?.mobile_app_download_apk || 'Скачать APK') : (lang?.mobile_app_download_ipa || 'Скачать IPA');

  const steps: ReactNode[] = method === 'pwa'
    ? (isApk
      ? [
        <>{lang?.mobile_app_ios_step_1 || 'Откройте'}{' '}<a href={SITE_URL} target="_blank" rel="noopener noreferrer" className={LINK}>zypo.cc</a>{' '}{lang?.mobile_app_android_pwa_step_1_end || 'в Chrome'}</>,
        lang?.mobile_app_android_pwa_step_2 || 'Откройте меню браузера ⋮',
        lang?.mobile_app_android_pwa_step_3 || 'Выберите «Установить приложение» или «Добавить на главный экран»',
      ]
      : [
        <>{lang?.mobile_app_ios_step_1 || 'Откройте'}{' '}<a href={SITE_URL} target="_blank" rel="noopener noreferrer" className={LINK}>zypo.cc</a>{' '}{lang?.mobile_app_ios_step_1_end || 'в Safari'}</>,
        <>{lang?.mobile_app_ios_step_2 || 'Нажмите кнопку «Поделиться»'}{' '}<Icon name="IC-share" className="inline w-4 h-4 -mt-1 fill-white" /></>,
        lang?.mobile_app_ios_step_3 || 'Выберите «На экран „Домой“»',
      ])
    : (isApk
      ? [
        <>{lang?.mobile_app_android_step_1 || 'Скачайте'}{' '}<a href={fileUrl || pageUrl} target="_blank" rel="noopener noreferrer" className={LINK}>APK</a></>,
        lang?.mobile_app_android_step_2 || 'Откройте загруженный файл',
        lang?.mobile_app_android_step_3 || 'Разрешите установку, если система спросит',
      ]
      : [
        lang?.mobile_app_ipa_step_1 || 'Скачайте IPA-файл',
        lang?.mobile_app_ipa_step_2 || 'Подпишите и установите его своим сертификатом (AltStore, Sideloadly, TrollStore и т. п.)',
        lang?.mobile_app_ipa_step_3 || 'Если iOS спросит, доверьте разработчика в настройках',
      ]);

  return (
    <div className="flex flex-col gap-3">
      <MethodSwitch
        method={method}
        onChange={setMethod}
        options={[
          { id: 'file', label: isApk ? (lang?.mobile_app_method_apk || 'APK-файл') : (lang?.mobile_app_method_ipa || 'IPA-файл') },
          { id: 'pwa', label: lang?.mobile_app_method_pwa || 'PWA' },
        ]}
      />

      <div className="flex w-full items-center gap-3">
        <ol className="flex min-w-0 flex-grow flex-col gap-3">
          {steps.map((step, index) => <Step key={index} index={index + 1}>{step}</Step>)}
        </ol>
        <div className="hidden shrink-0 items-center justify-center rounded-3xl bg-white p-3 shadow sm:flex">
          {qrUrl ? (
            <AppImage width={100} height={100} src={qrUrl} alt="QR Code" skeleton={false} className="h-24 w-24" />
          ) : (
            <div className="h-24 w-24" />
          )}
        </div>
      </div>

      {method === 'file' ? (
        <>
          {!isApk ? <span className="text-sm text-zinc-400">{lang?.mobile_app_ipa_note || 'Файл без подписи: нужен ваш собственный сертификат (Apple ID через AltStore или Sideloadly).'}</span> : null}
          {fileUrl ? (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={cn(BUTTON, 'w-full bg-white text-black hover:bg-zinc-200')}>
              <Icon name="IC-download" className="h-5 w-5 shrink-0 fill-black" />
              {fileLabel}
            </a>
          ) : (
            <>
              {!isApk && releases ? <span className="text-sm text-zinc-400">{lang?.mobile_app_ipa_missing || 'IPA для последней версии ещё не опубликован — загляните на страницу релизов.'}</span> : null}
              <a href={pageUrl} target="_blank" rel="noopener noreferrer" className={cn(BUTTON, 'w-full bg-white text-black hover:bg-zinc-200')}>
                <Icon name="IC-download" className="h-5 w-5 shrink-0 fill-black" />
                {lang?.mobile_app_release_page || 'Все версии на GitHub'}
              </a>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

/** Инструкция установки в модальном окне: способ (файл / PWA) выбирается переключателем. */
export function InstallModal({
  lang,
  platform,
  onClose,
}: {
  lang: Lang;
  platform: Platform | null;
  onClose: () => void;
}) {
  return (
    <Modal
      isOpen={platform !== null}
      onClose={onClose}
      width="sm"
      title={platform === 'ios' ? (lang?.mobile_app_for_iphone || 'Для iPhone') : (lang?.mobile_app_for_android || 'Для Android')}
    >
      {platform ? <InstallBody key={platform} lang={lang} platform={platform} /> : null}
    </Modal>
  );
}
