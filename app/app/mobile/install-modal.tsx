'use client';

import { useEffect, useState, type ReactNode } from 'react';

import Modal from '../../components/modal';
import AppImage from '../../components/app-image';
import Icon from '../../components/svg-icon';
import { MOBILE_APP_DOWNLOAD_URL, SITE_URL } from '../../config';
import { cn } from '../../lib/cn';

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

/** Инструкция установки в модальном окне */
export function InstallModal({
  lang,
  platform,
  onClose,
}: {
  lang: Lang;
  platform: Platform | null;
  onClose: () => void;
}) {
  const qrTarget = platform === 'ios' ? SITE_URL : platform === 'android' ? MOBILE_APP_DOWNLOAD_URL : null;
  const qrUrl = useQrDataUrl(qrTarget);

  return (
    <Modal
      isOpen={platform !== null}
      onClose={onClose}
      width="sm"
      title={platform === 'ios' ? (lang?.mobile_app_for_iphone || 'Для iPhone') : (lang?.mobile_app_for_android || 'Для Android')}
    >
      <div className="flex flex-col gap-3">
        <div className="flex w-full items-center gap-3">
          {platform === 'ios' ? (
            <ol className="flex flex-col gap-3 flex-grow min-w-0">
              <Step index={1}>
                {lang?.mobile_app_ios_step_1 || 'Откройте'}{' '}
                <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className={LINK}>zypo.cc</a>{' '}
                {lang?.mobile_app_ios_step_1_end || 'в Safari'}
              </Step>
              <Step index={2}>
                {lang?.mobile_app_ios_step_2 || 'Нажмите кнопку «Поделиться»'}{' '}
                <Icon name="IC-share" className="inline w-4 h-4 -mt-1 fill-white" />
              </Step>
              <Step index={3}>
                {lang?.mobile_app_ios_step_3 || 'Выберите «На экран „Домой“»'}
              </Step>
            </ol>
          ) : (
            <ol className="flex flex-col gap-3 flex-grow min-w-0">
              <Step index={1}>
                {lang?.mobile_app_android_step_1 || 'Скачайте'}{' '}
                <a href={MOBILE_APP_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className={LINK}>APK</a>
              </Step>
              <Step index={2}>
                {lang?.mobile_app_android_step_2 || 'Откройте загруженный файл'}
              </Step>
              <Step index={3}>
                {lang?.mobile_app_android_step_3 || 'Разрешите установку, если система спросит'}
              </Step>
            </ol>
          )}
          {qrTarget ? (
            <div className="shrink-0 hidden sm:flex items-center justify-center p-3 bg-white rounded-3xl shadow">
              {qrUrl ? (
                <AppImage
                  width={100}
                  height={100}
                  src={qrUrl}
                  alt="QR Code"
                  skeleton={false}
                  className="w-24 h-24"
                />
              ) : (
                <div className="w-24 h-24 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full animate-spin border-4 border-solid border-zinc-400 border-t-transparent" />
                </div>
              )}
            </div>
          ) : null}
        </div>

        {platform === 'android' ? (
          <a
            href={MOBILE_APP_DOWNLOAD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(BUTTON, 'bg-white text-black hover:bg-zinc-200 w-full')}
          >
            <Icon name="IC-download" className="w-5 h-5 fill-black shrink-0" />
            {lang?.mobile_app_download_apk || 'Скачать APK'}
          </a>
        ) : null}
      </div>
    </Modal>
  );
}
