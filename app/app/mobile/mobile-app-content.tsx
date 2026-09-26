'use client';

import { useEffect, useState, type ReactNode } from 'react';

import Modal from '../../components/modal';
import AppImage from '../../components/app-image';
import Icon from '../../components/svg-icon';
import { MOBILE_APP_DOWNLOAD_URL, SITE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/cn';

/** Мокапы — прозрачные PNG одной высоты (≈3614 px), ширина у каждого своя. */
const SHOTS = {
  feed: { src: '/img/apps/zypo/feed.png', width: 2946, height: 3614 },
  messages: { src: '/img/apps/zypo/messages.png', width: 1852, height: 3614 },
  pulse: { src: '/img/apps/zypo/pulse-home.png', width: 1800, height: 3615 },
  lyrics: { src: '/img/apps/zypo/pulse-lyrics.png', width: 2922, height: 3614 },
} as const;

const POINTS = [
  { icon: 'IC-feed', title: ['mobile_app_point_feed', 'Лента'], text: ['mobile_app_point_feed_text', 'Всё, что важно, — в одном месте.'] },
  { icon: 'IC-chats', title: ['mobile_app_point_chats', 'Чаты и звонки'], text: ['mobile_app_point_chats_text', 'Сообщения приходят сразу.'] },
  { icon: 'IC-music', title: ['mobile_app_point_music', 'Музыка в фоне'], text: ['mobile_app_point_music_text', 'Играет, даже когда экран погас.'] },
  { icon: 'IC-notification', title: ['mobile_app_point_push', 'Уведомления'], text: ['mobile_app_point_push_text', 'Ничего не пропустите.'] },
] as const;

const BUTTON = 'flex items-center justify-center gap-3 px-4 py-2.5 rounded-full text-base font-semibold whitespace-nowrap cursor-pointer active:scale-95 duration-300';

type Lang = Record<string, string> | null | undefined;

function tr(lang: Lang, [key, fallback]: readonly [string, string]) {
  return lang?.[key] || fallback;
}

function Shot({ shot, alt, className, priority = false, sizes }: {
  shot: { src: string; width: number; height: number };
  alt: string;
  className?: string;
  priority?: boolean;
  sizes: string;
}) {
  return (
    <AppImage
      src={shot.src}
      alt={alt}
      width={shot.width}
      height={shot.height}
      sizes={sizes}
      priority={priority}
      skeleton={false}
      draggable={false}
      className={cn('w-auto select-none pointer-events-none', className)}
    />
  );
}

type Platform = 'android' | 'ios';

function StoreButtons({ lang, onPick, className }: { lang: Lang; onPick: (platform: Platform) => void; className?: string }) {
  return (
    <div className={cn('flex flex-col sm:flex-row gap-3 w-full sm:w-auto', className)}>
      <button type="button" onClick={() => onPick('android')} className={cn(BUTTON, 'bg-white text-black hover:bg-zinc-200')}>
        <Icon name="IC-android" className="w-6 h-6 fill-black shrink-0" />
        {lang?.mobile_app_for_android || 'Для Android'}
      </button>
      <button type="button" onClick={() => onPick('ios')} className={cn(BUTTON, 'border border-zinc-600/30 bg-zinc-900 text-white hover:bg-zinc-800')}>
        <Icon name="IC-apple" className="w-6 h-6 fill-white shrink-0" />
        {lang?.mobile_app_for_iphone || 'Для iPhone'}
      </button>
    </div>
  );
}

function Step({ index, children }: { index: number; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="w-8 h-8 shrink-0 rounded-full border border-zinc-600/30 bg-zinc-800 flex items-center justify-center text-sm font-semibold text-white">
        {index}
      </span>
      <span className="text-zinc-300">{children}</span>
    </li>
  );
}

const LINK = 'inline-block text-blue-400 hover:text-blue-300 duration-300 active:scale-95 cursor-pointer';

/** QR на установку (как в кошельке при запросе перевода): генерируется на клиенте, адрес публичный. */
function useQrDataUrl(value: string | null) {
  const [qr, setQr] = useState<{ value: string; url: string } | null>(null);
  useEffect(() => {
    if (!value) return undefined;
    let cancelled = false;
    void import('qrcode-generator').then(({ default: qrcode }) => {
      const code = qrcode(0, 'M');
      code.addData(value);
      code.make();
      if (!cancelled) setQr({ value, url: code.createDataURL(6, 2) });
    }).catch((error: unknown) => console.error('Failed to build QR', error));
    return () => {
      cancelled = true;
    };
  }, [value]);
  return qr && qr.value === value ? qr.url : '';
}

/** Короткая инструкция установки; на lg: справа — QR, чтобы открыть с телефона. */
function InstallModal({ lang, platform, onClose }: { lang: Lang; platform: Platform | null; onClose: () => void }) {
  const qrTarget = platform === 'ios' ? SITE_URL : platform === 'android' ? MOBILE_APP_DOWNLOAD_URL : null;
  const qrUrl = useQrDataUrl(qrTarget);

  return (
    <Modal
      isOpen={platform !== null}
      onClose={onClose}
      width="md"
      title={platform === 'ios' ? 'iPhone' : 'Android'}
    >
      <div className="flex items-center gap-6">
        <div className="flex flex-col gap-3 flex-grow min-w-0">
          {platform === 'ios' ? (
            <ol className="flex flex-col gap-3">
              <Step index={1}>
                {lang?.mobile_app_ios_step_1 || 'Откройте'}{' '}
                <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className={LINK}>zypo.cc</a>{' '}
                {lang?.mobile_app_ios_step_1_end || 'в Safari'}
              </Step>
              <Step index={2}>
                {lang?.mobile_app_ios_step_2 || 'Нажмите'}{' '}
                <Icon name="IC-share" className="inline w-5 h-5 -mt-1 fill-white" />
              </Step>
              <Step index={3}>{lang?.mobile_app_ios_step_3 || 'Выберите «На экран „Домой“»'}</Step>
            </ol>
          ) : (
            <>
              <ol className="flex flex-col gap-3">
                <Step index={1}>
                  {lang?.mobile_app_android_step_1 || 'Скачайте'}{' '}
                  <a href={MOBILE_APP_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className={LINK}>APK</a>
                </Step>
                <Step index={2}>{lang?.mobile_app_android_step_2 || 'Откройте файл'}</Step>
                <Step index={3}>{lang?.mobile_app_android_step_3 || 'Разрешите установку, если телефон спросит'}</Step>
              </ol>
              <a href={MOBILE_APP_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className={cn(BUTTON, 'bg-white text-black hover:bg-zinc-200')}>
                <Icon name="IC-download" className="w-6 h-6 fill-black shrink-0" />
                {lang?.mobile_app_download_apk || 'Скачать APK'}
              </a>
            </>
          )}
        </div>

        {/* QR — только на больших экранах: с компьютера удобнее навести камеру, чем искать ссылку */}
        <div className="hidden lg:flex items-center justify-center p-3 bg-white rounded-3xl shadow border border-zinc-600/30 w-36 h-36 shrink-0">
          {qrUrl ? (
            <AppImage width={120} height={120} src={qrUrl} alt="QR" skeleton={false} className="w-30 h-30" />
          ) : (
            <div className="w-8 h-8 rounded-full animate-spin border-4 border-solid border-zinc-400 border-t-transparent" />
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function MobileAppContent() {
  const { lang } = useAuth();
  const [platform, setPlatform] = useState<Platform | null>(null);

  return (
    <div className="w-full flex flex-col items-center overflow-x-clip">
      {/* Первый экран */}
      <section className="relative w-full max-w-6xl px-3 lg:px-6 pt-12 lg:pt-24 flex flex-col items-center text-center gap-6">
        <div className="flex flex-col items-center">
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-none text-white">
            <AppImage
              src="/img/zypo/letter.svg"
              alt="Zypo"
              width={404}
              height={122}
              priority
              skeleton={false}
              className="inline-block h-[0.88em] w-auto align-[-0.3em]"
            />{' '}
            {lang?.mobile_app_title || 'в телефоне'}
          </h1>
          <p className="text-lg sm:text-xl text-zinc-400 max-w-xl mt-6">
            {lang?.mobile_app_subtitle || 'Лента, чаты, звонки и музыка — всегда с собой.'}
          </p>
        </div>
        <StoreButtons lang={lang} onPick={setPlatform} className="justify-center" />

        {/* Три телефона веером: мягкое свечение позади — единственный акцент */}
        <div className="relative w-full h-[24rem] sm:h-[34rem] lg:h-[42rem] mt-6">
          <div
            aria-hidden="true"
            className="cover-glow absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[70%] rounded-full bg-[radial-gradient(closest-side,rgba(168,85,247,0.22),transparent)]"
          />
          <Shot
            shot={SHOTS.messages}
            alt={lang?.mobile_app_point_chats || 'Чаты и звонки'}
            sizes="(max-width: 640px) 40vw, 320px"
            className="absolute bottom-0 left-[4%] sm:left-[12%] h-[78%] opacity-80 -rotate-6"
          />
          <Shot
            shot={SHOTS.pulse}
            alt={lang?.mobile_app_point_music || 'Музыка в фоне'}
            sizes="(max-width: 640px) 40vw, 320px"
            className="absolute bottom-0 right-[4%] sm:right-[12%] h-[78%] opacity-80 rotate-6"
          />
          <Shot
            shot={SHOTS.lyrics}
            alt="Zypo"
            sizes="(max-width: 640px) 90vw, 560px"
            priority
            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-full z-10"
          />
        </div>
      </section>

      {/* Что внутри */}
      <section className="w-full max-w-6xl px-3 lg:px-6 py-24 grid grid-cols-1 lg:grid-cols-2 items-center gap-12">
        <div className="flex justify-center">
          <Shot
            shot={SHOTS.feed}
            alt={lang?.mobile_app_point_feed || 'Лента'}
            sizes="(max-width: 1024px) 90vw, 520px"
            className="h-[26rem] sm:h-[36rem] max-w-full"
          />
        </div>
        <div className="flex flex-col gap-12">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            {lang?.mobile_app_inside_title || 'Всё, что вы любите.'}
            <span className="block text-zinc-500">{lang?.mobile_app_inside_subtitle || 'Только удобнее.'}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {POINTS.map((point) => (
              <div key={point.icon} className="flex flex-col gap-3">
                <Icon name={point.icon} className="w-8 h-8 fill-purple-400" />
                <div className="flex flex-col">
                  <span className="text-lg font-semibold text-white">{tr(lang, point.title)}</span>
                  <span className="text-zinc-400">{tr(lang, point.text)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <InstallModal lang={lang} platform={platform} onClose={() => setPlatform(null)} />

      <div className="lg:hidden"><br /><br /><br /><br /></div>
    </div>
  );
}
