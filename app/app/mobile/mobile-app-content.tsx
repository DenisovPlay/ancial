'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';

import Modal from '../../components/modal';
import AppImage from '../../components/app-image';
import Icon from '../../components/svg-icon';
import { MOBILE_APP_DOWNLOAD_URL, SITE_URL } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/cn';

/** Мокапы — прозрачные PNG в 3D-изометрии */
const SHOTS = {
  feed: { src: '/img/apps/zypo/feed.png', width: 2946, height: 3614 },
  messages: { src: '/img/apps/zypo/messages.png', width: 1852, height: 3614 },
  pulse: { src: '/img/apps/zypo/pulse-home.png', width: 1800, height: 3615 },
  lyrics: { src: '/img/apps/zypo/pulse-lyrics.png', width: 2922, height: 3614 },
} as const;

const BUTTON = 'flex items-center justify-center gap-3 px-4 py-2.5 rounded-full text-base font-semibold whitespace-nowrap cursor-pointer active:scale-95 duration-300';
const LINK = 'inline-block text-blue-400 hover:text-blue-300 duration-300 active:scale-95 cursor-pointer';

type Lang = Record<string, string> | null | undefined;
type Platform = 'android' | 'ios';

function Shot({
  shot,
  alt,
  className,
  priority = false,
  sizes,
}: {
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

function StoreButtons({
  lang,
  onPick,
  className,
}: {
  lang: Lang;
  onPick: (platform: Platform) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-row items-center gap-3 w-full sm:w-auto', className)}>
      <button
        type="button"
        onClick={() => onPick('android')}
        className={cn(BUTTON, 'bg-white text-black hover:bg-zinc-200 shadow-xl shadow-white/5 w-full sm:w-auto')}
      >
        <Icon name="IC-android" className="w-6 h-6 fill-black shrink-0" />
        {lang?.mobile_app_for_android || 'Для Android'}
      </button>
      <button
        type="button"
        onClick={() => onPick('ios')}
        className={cn(BUTTON, 'border border-zinc-600/30 bg-zinc-900/80 backdrop-blur text-white hover:bg-zinc-800 w-full sm:w-auto')}
      >
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
      <span className="text-zinc-300 text-sm sm:text-base">{children}</span>
    </li>
  );
}

/** Генератор QR-кода на клиенте */
function useQrDataUrl(value: string | null) {
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
function InstallModal({
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
      width="md"
      title={platform === 'ios' ? (lang?.mobile_app_for_iphone || 'Для iPhone') : (lang?.mobile_app_for_android || 'Для Android')}
    >
      <div className="flex flex-col sm:flex-row items-center gap-3 p-0">
        <div className="flex flex-col gap-6 flex-grow min-w-0 w-full">
          {platform === 'ios' ? (
            <ol className="flex flex-col gap-3">
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
            <div className="flex flex-col gap-3">
              <div className="w-full flex items-center">
                <ol className="flex flex-col gap-3 flex-grow">
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
                {qrTarget ? (
                  <div className="shrink-0 hidden sm:flex items-center justify-center p-3 bg-white rounded-3xl shrink-0 shadow">
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
                      <div className="w-8 h-8 rounded-full animate-spin border-4 border-solid border-zinc-400 border-t-transparent" />
                    )}
                  </div>
                ) : null}
              </div>
              <a
                href={MOBILE_APP_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(BUTTON, 'bg-white text-black hover:bg-zinc-200 self-start w-full')}
              >
                <Icon name="IC-download" className="w-5 h-5 fill-black shrink-0" />
                {lang?.mobile_app_download_apk || 'Скачать APK'}
              </a>
            </div>
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
    <div className="relative w-full flex flex-col items-center overflow-x-clip pb-24">
      {/* 1. ЖИВОЙ КОСМИЧЕСКИЙ ФОН С ВИДЕО */}
      <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/img/backgrounds/mobile-app.png"
          className="w-full h-full object-cover opacity-35 duration-700 pointer-events-none select-none"
          src="/img/backgrounds/mobile-app.mp4"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black pointer-events-none" />
      </div>

      {/* 2. ГЛАВНЫЙ ЭКРАН (HERO): ОДИН СМАРТФОН В ЦЕНТРЕ */}
      <section className="relative z-10 w-full max-w-5xl px-3 lg:px-6 pt-12 lg:pt-24 flex flex-col items-center text-center gap-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-3"
        >
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-none text-white">
            <AppImage
              src="/img/zypo/letter.svg"
              alt="Zypo"
              width={404}
              height={122}
              priority
              skeleton={false}
              className="inline-block h-[0.88em] w-auto align-[-0.24em]"
            />{' '}
            {lang?.mobile_app_title || 'в телефоне'}
          </h1>
          <p className="text-lg sm:text-xl text-zinc-300 max-w-xl mt-3 font-normal">
            {lang?.mobile_app_subtitle || 'Лента, чаты, звонки и музыка — всегда с собой.'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-3 w-full"
        >
          <StoreButtons lang={lang} onPick={setPlatform} className="justify-center mt-3" />
        </motion.div>

        {/* Единственный центральный смартфон в Hero */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg h-[26rem] sm:h-[36rem] lg:h-[44rem] mt-6 flex items-end justify-center"
        >
          <Shot
            shot={SHOTS.pulse}
            alt="Zypo Pulse"
            priority
            sizes="(max-width: 640px) 90vw, 560px"
            className="h-full drop-shadow-[0_30px_70px_rgba(0,0,0,0.9)]"
          />
        </motion.div>
      </section>

      {/* 3. СКРОЛЛ-СТОРИТЕЛЛИНГ: ПО ОДНОМУ ТЕЛЕФОНУ С ПЛАВНОЙ АНИМАЦИЕЙ */}
      <div className="relative z-10 w-full max-w-5xl px-3 lg:px-6 py-24 flex flex-col gap-24 lg:gap-36">
        {/* Секция 1: Музыка в фоне (Pulse) — телефон слева, текст справа */}
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-12">
          <motion.div
            initial={{ opacity: 0, x: -40, scale: 0.95 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center"
          >
            <Shot
              shot={SHOTS.lyrics}
              alt={lang?.mobile_app_point_music || 'Музыка в фоне'}
              sizes="(max-width: 1024px) 85vw, 480px"
              className="h-[24rem] sm:h-[34rem] lg:h-[38rem] drop-shadow-[0_25px_50px_rgba(0,0,0,0.85)]"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-6 text-center lg:text-left items-center lg:items-start"
          >
            <div className="w-12 h-12 rounded-full border border-zinc-600/30 bg-zinc-900/80 backdrop-blur flex items-center justify-center">
              <Icon name="IC-music" className="w-6 h-6 fill-white" />
            </div>
            <div className="flex flex-col gap-3 max-w-md">
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
                {lang?.mobile_app_point_music || 'Музыка в фоне'}
              </h2>
              <p className="text-base sm:text-lg text-zinc-300 leading-relaxed font-normal">
                {lang?.mobile_app_section_music_desc ||
                  'Играет при заблокированном экране и сохраняет треки прямо в телефон для прослушивания офлайн.'}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Секция 2: Чаты и звонки — текст слева, телефон справа */}
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-6 text-center lg:text-left items-center lg:items-start order-2 lg:order-1"
          >
            <div className="w-12 h-12 rounded-full border border-zinc-600/30 bg-zinc-900/80 backdrop-blur flex items-center justify-center">
              <Icon name="IC-chats" className="w-6 h-6 fill-white" />
            </div>
            <div className="flex flex-col gap-3 max-w-md">
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
                {lang?.mobile_app_point_chats || 'Чаты и звонки'}
              </h2>
              <p className="text-base sm:text-lg text-zinc-300 leading-relaxed font-normal">
                {lang?.mobile_app_section_chats_desc ||
                  'Уведомления приходят моментально, а голосовые вызовы звучат чисто даже на слабом соединении.'}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center order-1 lg:order-2"
          >
            <Shot
              shot={SHOTS.messages}
              alt={lang?.mobile_app_point_chats || 'Чаты и звонки'}
              sizes="(max-width: 1024px) 85vw, 480px"
              className="h-[24rem] sm:h-[34rem] lg:h-[38rem] drop-shadow-[0_25px_50px_rgba(0,0,0,0.85)]"
            />
          </motion.div>
        </div>

        {/* Секция 3: Лента — телефон слева, текст справа */}
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-12">
          <motion.div
            initial={{ opacity: 0, x: -40, scale: 0.95 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center"
          >
            <Shot
              shot={SHOTS.feed}
              alt={lang?.mobile_app_point_feed || 'Лента'}
              sizes="(max-width: 1024px) 85vw, 480px"
              className="h-[24rem] sm:h-[34rem] lg:h-[38rem] drop-shadow-[0_25px_50px_rgba(0,0,0,0.85)]"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-6 text-center lg:text-left items-center lg:items-start"
          >
            <div className="w-12 h-12 rounded-full border border-zinc-600/30 bg-zinc-900/80 backdrop-blur flex items-center justify-center">
              <Icon name="IC-feed" className="w-6 h-6 fill-white" />
            </div>
            <div className="flex flex-col gap-3 max-w-md">
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
                {lang?.mobile_app_point_feed || 'Лента'}
              </h2>
              <p className="text-base sm:text-lg text-zinc-300 leading-relaxed font-normal">
                {lang?.mobile_app_section_feed_desc ||
                  'Хронологический поток от друзей и каналов. Без навязанных рекомендаций и рекламы.'}
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 4. ФИНАЛЬНЫЙ БЛОК УСТАНОВКИ */}
      <section className="relative z-10 w-full max-w-2xl px-3 py-12 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full flex flex-col items-center text-center gap-3"
        >
          <div className="flex flex-col items-center gap-3 max-w-lg">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {lang?.mobile_app_final_title || 'Всегда под рукой'}
            </h2>
            <p className="text-zinc-300 text-sm sm:text-base font-normal">
              {lang?.mobile_app_final_desc ||
                'Скачайте APK для Android или добавьте на экран iPhone через Safari.'}
            </p>
          </div>

          <StoreButtons lang={lang} onPick={setPlatform} />
        </motion.div>
      </section>

      {/* Модальное окно установки */}
      <InstallModal lang={lang} platform={platform} onClose={() => setPlatform(null)} />

      <div className="lg:hidden"><br /><br /><br /><br /></div>
    </div>
  );
}
