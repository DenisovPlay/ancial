'use client';

import { Fira_Sans_Extra_Condensed } from 'next/font/google';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import AppImage from '../../components/app-image';
import Icon from '../../components/svg-icon';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/cn';
import { InstallModal, useQrDataUrl, type Lang, type Platform } from './install-modal';
import {
  BoltSticker,
  BubbleSticker,
  CoinSticker,
  DiscSticker,
  Floating,
  HeartSticker,
  Marquee,
  PlaneSticker,
} from './landing-assets';
import { MOBILE_APP_DOWNLOAD_URL } from '../../config';

/** Плотный узкий гротеск с кириллицей и курсивом — для огромных заголовков. */
const display = Fira_Sans_Extra_Condensed({ display: 'swap', style: ['normal', 'italic'], subsets: ['latin', 'cyrillic'], weight: ['800', '900'] });

/** Мокапы — прозрачные PNG в 3D-изометрии */
const SHOTS = {
  feed: { src: '/img/apps/zypo/feed.png', width: 2946, height: 3614 },
  messages: { src: '/img/apps/zypo/messages.png', width: 1852, height: 3614 },
  pulse: { src: '/img/apps/zypo/pulse-home.png', width: 1800, height: 3615 },
  lyrics: { src: '/img/apps/zypo/pulse-lyrics.png', width: 2922, height: 3614 },
} as const;

const HEAD = 'font-black uppercase leading-[0.84] tracking-[-0.005em]';
const BIG_BUTTON =
  'flex items-center justify-center gap-3 px-6 py-4 rounded-full text-lg font-extrabold uppercase tracking-wide whitespace-nowrap cursor-pointer active:scale-95 duration-300';
const FRAME = 'relative overflow-hidden rounded-3xl border border-zinc-600/30';

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
      className={cn('w-auto max-w-none select-none pointer-events-none', className)}
    />
  );
}

/** Подсказка-карточка поверх телефона: кусочек интерфейса приложения. */
function UiChip({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <div
      className={cn(
        'glass-panel [--glass-tint:var(--color-zinc-900)] [--glass-alpha:0.9] lp-float absolute z-20 hidden w-max items-center gap-3 rounded-3xl border border-zinc-600/30 p-3 shadow-2xl lg:flex',
        className,
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

/**
 * Плашка-вставка внутри огромного заголовка. Высота — по высоте заглавных (0.7em), низ стоит на базовой линии:
 * у inline-block с overflow:hidden базовая линия — нижняя кромка, поэтому плашка встаёт ровно вровень с буквами.
 */
function InlineChip({ children, tone = 'purple', edge = 'end' }: { children: ReactNode; tone?: 'purple' | 'white' | 'zinc'; edge?: 'start' | 'end' }) {
  const tones = {
    purple: 'bg-purple-600 text-white',
    white: 'bg-white text-black',
    zinc: 'bg-zinc-900 text-white border border-zinc-600/30',
  } as const;
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block h-[0.7em] w-[1.5em] overflow-hidden rounded-full align-baseline', edge === 'end' ? 'ml-[0.14em]' : 'mr-[0.14em]', tones[tone])}
    >
      <span className="flex h-full w-full items-center justify-center">{children}</span>
    </span>
  );
}

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function StoreButtons({ lang, onPick, className }: { lang: Lang; onPick: (platform: Platform) => void; className?: string }) {
  return (
    <div className={cn('flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center', className)}>
      <button type="button" onClick={() => onPick('android')} className={cn(BIG_BUTTON, 'bg-white text-black hover:bg-zinc-200')}>
        <Icon name="IC-android" className="h-7 w-7 shrink-0 fill-black" />
        {lang?.mobile_app_for_android || 'Для Android'}
      </button>
      <button
        type="button"
        onClick={() => onPick('ios')}
        className={cn(BIG_BUTTON, 'glass-panel [--glass-tint:var(--color-black)] [--glass-alpha:0.4] border border-white/30 text-white hover:[--glass-tint:var(--color-white)] hover:[--glass-alpha:1] hover:text-black')}
      >
        <Icon name="IC-apple" className="h-7 w-7 shrink-0 fill-current" />
        {lang?.mobile_app_for_iphone || 'Для iPhone'}
      </button>
    </div>
  );
}

function Hero({ lang, onPick }: { lang: Lang; onPick: (platform: Platform) => void }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const leftY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -120]);
  const rightY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);

  return (
    <section
      id="top"
      ref={ref}
      className="relative isolate flex min-h-[54rem] flex-col overflow-hidden bg-black lg:min-h-[64rem]"
    >
      <AppImage
        fill
        priority
        skeleton={false}
        sizes="100vw"
        src="/img/app-landing/tube.svg"
        alt=""
        className="-z-10 h-[62%]! select-none object-cover lg:h-full!"
      />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-black to-transparent" />

      {/* Логотип и слоган */}
      <div className="relative z-20 flex flex-col items-center px-3 pt-16 text-center lg:pl-24 lg:pt-20">
        <div className="relative w-full max-w-[1120px]">
          <motion.h1
            initial={{ opacity: 0, scale: 0.94, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="m-0"
          >
            <AppImage
              src="/img/zypo/letter.svg"
              alt="Zypo"
              width={404}
              height={122}
              priority
              skeleton={false}
              className="mx-auto h-auto w-[92%] select-none drop-shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
            />
          </motion.h1>
          <Floating className="-left-1 top-[-6%] w-[13%] min-w-14" rotate={-12}><CoinSticker className="h-auto w-full" /></Floating>
          <Floating className="right-[2%] top-[-10%] w-[12%] min-w-12" rotate={10} delay={0.8}><BubbleSticker className="h-auto w-full" /></Floating>
          <Floating className="-left-[3%] bottom-[-6%] w-[9%] min-w-10" rotate={8} delay={1.4}><DiscSticker className="lp-spin h-auto w-full" /></Floating>
          <Floating className="-right-[3%] bottom-[-8%] w-[8%] min-w-9" rotate={-8} delay={2}><HeartSticker className="h-auto w-full" /></Floating>
          <Floating className="left-[44%] top-[-18%] hidden w-[5%] sm:block" rotate={14} delay={0.4}><BoltSticker className="h-auto w-full" /></Floating>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={cn(HEAD, 'mt-10 max-w-4xl text-balance text-[clamp(2.1rem,5.4vw,4.6rem)] text-white')}
        >
          {lang?.mobile_landing_tagline || 'Всё, что вы любите. Теперь в кармане.'}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 w-full sm:w-auto"
        >
          <StoreButtons lang={lang} onPick={onPick} />
        </motion.div>
      </div>

      {/* Телефоны, выезжающие из нижней кромки */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[24rem] sm:h-[30rem] lg:left-24 lg:h-[36rem]">
        <motion.div style={{ y: leftY }} className="absolute bottom-[-18%] left-[2%] h-full sm:left-[10%] lg:left-[16%]">
          <Shot shot={SHOTS.pulse} alt="Zypo Pulse" priority sizes="(max-width: 640px) 45vw, 360px" className="h-full -rotate-3 drop-shadow-[0_30px_60px_rgba(0,0,0,0.85)]" />
        </motion.div>
        <motion.div style={{ y: rightY }} className="absolute bottom-[-26%] right-[-18%] h-[105%] sm:right-[2%] lg:right-[10%]">
          <Shot shot={SHOTS.feed} alt="Zypo" priority sizes="(max-width: 640px) 70vw, 560px" className="h-full rotate-2 drop-shadow-[0_30px_60px_rgba(0,0,0,0.85)]" />
        </motion.div>
        <UiChip className="bottom-[34%] left-[8%]" delay={0.6}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
            <AppImage src="/img/zypo/logo-rounded.webp" alt="" width={44} height={44} skeleton={false} className="h-full w-full object-cover" />
          </span>
          <span className="flex flex-col text-left">
            <span className="text-xs font-semibold text-zinc-400">{lang?.mobile_landing_chip_chat_title || 'Новое сообщение'}</span>
            <span className="text-base font-bold text-white">{lang?.mobile_landing_chip_chat_text || 'Го в звонок?'}</span>
          </span>
        </UiChip>
        <UiChip className="bottom-[44%] right-[6%]" delay={1.4}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-3xl bg-purple-600">
            <Icon name="IC-music" className="h-6 w-6 fill-white" />
          </span>
          <span className="flex flex-col text-left">
            <span className="text-xs font-semibold text-zinc-400">{lang?.mobile_landing_chip_play_title || 'Сейчас играет'}</span>
            <span className="text-base font-bold text-white">{lang?.mobile_landing_chip_play_track || 'Ночной рейс'}</span>
          </span>
        </UiChip>
      </div>
    </section>
  );
}

/**
 * Строка заголовка, подогнанная по ширине контейнера: текст доходит до правого края и не обрезается.
 * Ширину замеряем по скрытой копии при кегле 100px — после загрузки шрифта и при каждом ресайзе.
 */
function FitLine({ children, className }: { children: ReactNode; className?: string }) {
  const outer = useRef<HTMLSpanElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<number | null>(null);

  useEffect(() => {
    const fit = () => {
      const box = outer.current;
      const copy = probe.current;
      if (!box || !copy) return;
      const natural = copy.getBoundingClientRect().width;
      if (natural > 0 && box.clientWidth > 0) setSize(Math.min((box.clientWidth / natural) * 100 * 0.995, 280));
    };
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) fit();
    });
    // Шрифт может догрузиться уже после fonts.ready — тогда меняется ширина скрытой копии: следим и за ней.
    const observer = new ResizeObserver(fit);
    if (outer.current) observer.observe(outer.current);
    if (probe.current) observer.observe(probe.current);
    document.fonts.addEventListener('loadingdone', fit);
    return () => {
      cancelled = true;
      observer.disconnect();
      document.fonts.removeEventListener('loadingdone', fit);
    };
  }, []);

  return (
    <span ref={outer} className="relative block w-full">
      <span ref={probe} aria-hidden="true" className={cn('invisible absolute left-0 top-0 whitespace-nowrap', className)} style={{ fontSize: 100 }}>
        {children}
      </span>
      <span className={cn('block whitespace-nowrap', className)} style={size ? { fontSize: `${size}px` } : undefined}>
        {children}
      </span>
    </span>
  );
}

/** Огромное утверждение на три строки со вставками-плашками. */
function Statement({ lang }: { lang: Lang }) {
  // До загрузки шрифта и замера строки держатся на этом запасном размере.
  const fallback = 'text-[clamp(2.4rem,9vw,10rem)]';
  return (
    <section className="relative flex w-full flex-col gap-3 overflow-x-clip px-3 py-24 lg:px-0 lg:py-40">
      <h2 className={cn(HEAD, 'flex flex-col gap-[0.06em] text-white')}>
        <Reveal>
          <FitLine className={fallback}>
            {lang?.mobile_landing_line_1 || 'Лента без шума'}
            <InlineChip tone="purple"><Icon name="IC-feed" className="h-[0.42em] w-[0.42em] fill-white" /></InlineChip>
          </FitLine>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="lg:pl-[6%]">
            <FitLine className={cn(fallback, 'text-purple-400 italic')}>
              <InlineChip tone="white" edge="start"><Icon name="IC-call" className="h-[0.42em] w-[0.42em] fill-black" /></InlineChip>
              {lang?.mobile_landing_line_2 || 'Чаты без задержек'}
            </FitLine>
          </div>
        </Reveal>
        <Reveal delay={0.16}>
          <div className="lg:pl-[14%]">
            <FitLine className={fallback}>
              {lang?.mobile_landing_line_3 || 'Музыка без границ'}
              <InlineChip tone="zinc"><Icon name="IC-music" className="h-[0.42em] w-[0.42em] fill-white" /></InlineChip>
            </FitLine>
          </div>
        </Reveal>
      </h2>
      <Floating className="right-[3%] top-[6%] hidden w-[7%] lg:block" rotate={10}><PlaneSticker className="h-auto w-full" /></Floating>
      <Floating className="bottom-[8%] left-[2%] hidden w-[6%] lg:block" rotate={-10} delay={1}><HeartSticker className="h-auto w-full" /></Floating>
    </section>
  );
}

interface FeatureProps {
  id: string;
  index: number;
  title: string;
  text: string;
  tags: string[];
  tone: 'dark' | 'purple' | 'lilac';
  shot: { src: string; width: number; height: number };
  shotClassName: string;
  extraShot?: { shot: { src: string; width: number; height: number }; className: string };
  chip?: ReactNode;
  stickers?: ReactNode;
}

const TONES = {
  dark: { panel: 'bg-zinc-950 text-white', tag: 'border-white/25 text-white', num: 'text-purple-400', text: 'text-zinc-300' },
  purple: { panel: 'bg-purple-600 text-black', tag: 'border-black/40 text-black', num: 'text-white', text: 'text-black/80' },
  lilac: { panel: 'bg-purple-200 text-black', tag: 'border-black/40 text-black', num: 'text-purple-700', text: 'text-black/75' },
} as const;

/** Липкая карточка: следующая наезжает на предыдущую при прокрутке. */
function FeatureCard({ id, index, title, text, tags, tone, shot, shotClassName, extraShot, chip, stickers }: FeatureProps) {
  const style = TONES[tone];
  return (
    <article
      id={id}
      className={cn(FRAME, 'min-h-[40rem] lg:sticky lg:top-[var(--stack-top)] lg:min-h-[44rem]', style.panel)}
      style={{ ['--stack-top' as string]: `calc(0.75rem + ${index * 1}rem)` }}
    >
      {tone === 'dark' ? (
        <AppImage
          fill
          skeleton={false}
          sizes="(max-width: 1024px) 100vw, 60vw"
          src="/img/app-landing/tube.svg"
          alt=""
          className="select-none object-cover opacity-45"
        />
      ) : null}
      <div className="relative z-10 flex h-full min-h-[40rem] flex-col justify-start gap-6 p-6 lg:min-h-[44rem] lg:max-w-[52%] lg:justify-between lg:p-12">
        <div className="flex flex-col gap-3">
          <span className={cn(HEAD, 'text-[clamp(1.2rem,2vw,1.8rem)] italic', style.num)}>0{index + 1} /</span>
          <h3 className={cn(HEAD, 'text-[clamp(4rem,11vw,10.5rem)]')}>{title}</h3>
        </div>
        <div className="flex flex-col gap-6">
          <p className={cn('max-w-md text-lg font-medium leading-snug lg:text-xl', style.text)}>{text}</p>
          <ul className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <li key={tag} className={cn('rounded-full border px-4 py-2 text-sm font-extrabold uppercase tracking-wide', style.tag)}>{tag}</li>
            ))}
          </ul>
        </div>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <Shot shot={shot} alt="" sizes="(max-width: 1024px) 90vw, 640px" className={cn('absolute drop-shadow-[0_30px_60px_rgba(0,0,0,0.55)]', shotClassName)} />
        {extraShot ? <Shot shot={extraShot.shot} alt="" sizes="(max-width: 1024px) 60vw, 480px" className={cn('absolute drop-shadow-[0_30px_60px_rgba(0,0,0,0.55)]', extraShot.className)} /> : null}
        {stickers}
      </div>
      {chip}
    </article>
  );
}

function Tile({ icon, title, text, sticker }: { icon: string; title: string; text: string; sticker: ReactNode }) {
  return (
    <div className={cn(FRAME, 'group flex min-h-[22rem] flex-col justify-between gap-6 bg-zinc-950 p-6 duration-300 hover:bg-purple-600 lg:min-h-[26rem] lg:p-8')}>
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 duration-300 group-hover:bg-black">
          <Icon name={icon} className="h-7 w-7 fill-white" />
        </span>
        <div className="w-24 duration-300 group-hover:-rotate-6 group-hover:scale-110">{sticker}</div>
      </div>
      <div className="flex flex-col gap-3">
        <h3 className={cn(HEAD, 'text-[clamp(2.6rem,5vw,4.6rem)] text-white duration-300 group-hover:text-black')}>{title}</h3>
        <p className="max-w-sm text-base font-medium leading-snug text-zinc-400 duration-300 group-hover:text-black/80 lg:text-lg">{text}</p>
      </div>
    </div>
  );
}

function FinalCta({ lang, onPick }: { lang: Lang; onPick: (platform: Platform) => void }) {
  const qrUrl = useQrDataUrl(MOBILE_APP_DOWNLOAD_URL);
  return (
    <section className={cn(FRAME, 'mt-3 flex min-h-[40rem] flex-col justify-between gap-12 bg-purple-600 p-6 text-black lg:min-h-[46rem] lg:p-12')}>
      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-6">
          <Reveal className="min-w-0">
            <h2 className={cn(HEAD, 'text-[clamp(4.4rem,14vw,13rem)]')}>{lang?.mobile_landing_final_title || 'Скачай Zypo'}</h2>
          </Reveal>
          {/* QR в потоке рядом с заголовком: абсолютный перекрывался длинным заголовком на части экранов */}
          <div aria-hidden="true" className="pointer-events-none hidden shrink-0 rounded-3xl bg-white p-3 shadow-2xl lg:block">
            {qrUrl ? (
              <AppImage src={qrUrl} alt="" width={160} height={160} skeleton={false} className="h-40 w-40" />
            ) : (
              <div className="h-40 w-40" />
            )}
          </div>
        </div>
        <p className="max-w-xl text-lg font-semibold leading-snug text-black/80 lg:text-xl">
          {lang?.mobile_landing_final_text || 'Android — APK за пару нажатий. iPhone — добавьте Zypo на экран «Домой» через Safari.'}
        </p>
        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <button type="button" onClick={() => onPick('android')} className={cn(BIG_BUTTON, 'bg-black text-white hover:bg-zinc-800')}>
            <Icon name="IC-android" className="h-7 w-7 shrink-0 fill-white" />
            {lang?.mobile_app_for_android || 'Для Android'}
          </button>
          <button type="button" onClick={() => onPick('ios')} className={cn(BIG_BUTTON, 'border border-black/50 text-black hover:bg-black hover:text-white')}>
            <Icon name="IC-apple" className="h-7 w-7 shrink-0 fill-current" />
            {lang?.mobile_app_for_iphone || 'Для iPhone'}
          </button>
        </div>
      </div>

      <Floating className="right-[22%] top-[34%] hidden w-[8%] lg:block" rotate={12}><CoinSticker className="h-auto w-full" /></Floating>
      <Floating className="right-[8%] bottom-[22%] hidden w-[7%] lg:block" rotate={-10} delay={1.2}><BoltSticker className="h-auto w-full" /></Floating>

      <AppImage
        src="/img/zypo/letter.svg"
        alt=""
        width={404}
        height={122}
        skeleton={false}
        className="pointer-events-none -mb-[3%] w-full select-none opacity-90 mix-blend-overlay"
      />
    </section>
  );
}

export default function MobileAppContent() {
  const { lang } = useAuth();
  const [platform, setPlatform] = useState<Platform | null>(null);

  const banner = lang?.mobile_landing_banner || 'Zypo для Android уже доступен';
  const marquee = [banner, 'Pulse', lang?.mobile_app_point_chats || 'Чаты и звонки', lang?.mobile_app_point_feed || 'Лента'];

  return (
    <div className={cn(display.className, 'relative flex w-full flex-col overflow-x-clip bg-black pb-24 text-white')}>
      {/* Лендинг на всю ширину: фон заходит под навигацию, отступ под неё держат сами секции */}
      <style>{`#main-content { padding: 0 !important; }`}</style>

      <Hero lang={lang} onPick={setPlatform} />

      {/* Бегущая строка */}
      <div className="bg-purple-400 py-2 text-black">
        <Marquee items={marquee} className="text-sm font-black uppercase tracking-wide" itemClassName="" />
      </div>

      <div className="flex flex-col lg:pl-[6.375rem] lg:pr-6">
      <Statement lang={lang} />

      {/* Липкие карточки возможностей */}
      <div className="flex flex-col gap-3 pb-12">
        <FeatureCard
          id="feed"
          index={0}
          tone="dark"
          title={lang?.mobile_app_point_feed || 'Лента'}
          text={lang?.mobile_app_section_feed_desc || 'Хронологический поток от друзей и сообществ. Без навязанных рекомендаций и рекламы.'}
          tags={[lang?.mobile_landing_tag_chrono || 'Хронология', lang?.mobile_landing_tag_topics || 'Темы', lang?.mobile_landing_tag_bookmarks || 'Закладки']}
          shot={SHOTS.feed}
          shotClassName="-bottom-[4%] -right-[14%] h-[52%] sm:-right-[6%] sm:h-[56%] lg:-bottom-[12%] lg:right-[2%] lg:h-[100%]"
          stickers={<Floating className="right-[4%] top-[8%] w-[10%] min-w-12" rotate={10}><HeartSticker className="h-auto w-full" /></Floating>}
        />
        <FeatureCard
          id="chats"
          index={1}
          tone="purple"
          title={lang?.mobile_app_point_chats || 'Чаты и звонки'}
          text={lang?.mobile_app_section_chats_desc || 'Сообщения приходят мгновенно, а голосовые вызовы звучат чисто даже на слабом соединении.'}
          tags={[lang?.mobile_landing_tag_calls || 'Звонки', lang?.mobile_landing_tag_groups || 'Группы', lang?.mobile_landing_tag_stickers || 'Стикеры']}
          shot={SHOTS.messages}
          shotClassName="-bottom-[6%] right-[2%] h-[54%] sm:right-[6%] sm:h-[58%] lg:-bottom-[10%] lg:right-[8%] lg:h-[104%]"
          stickers={<Floating className="right-[36%] top-[10%] hidden w-[9%] lg:block" rotate={-8}><BubbleSticker className="h-auto w-full" /></Floating>}
        />
        <FeatureCard
          id="pulse"
          index={2}
          tone="lilac"
          title="Pulse"
          text={lang?.mobile_app_section_music_desc || 'Играет при заблокированном экране и сохраняет треки в телефон для прослушивания офлайн.'}
          tags={[lang?.mobile_landing_tag_lyrics || 'Тексты песен', lang?.mobile_landing_tag_eq || 'Эквалайзер', lang?.mobile_landing_tag_offline || 'Офлайн']}
          shot={SHOTS.pulse}
          shotClassName="-bottom-[8%] right-[8%] h-[54%] sm:right-[20%] sm:h-[58%] lg:-bottom-[14%] lg:right-[30%] lg:h-[104%]"
          extraShot={{ shot: SHOTS.lyrics, className: 'hidden -bottom-[22%] -right-[8%] h-[84%] lg:block' }}
          stickers={<Floating className="right-[4%] top-[6%] w-[9%] min-w-12" rotate={14}><DiscSticker className="lp-spin h-auto w-full" /></Floating>}
        />
      </div>

      {/* Под капотом */}
      <section id="more" className="flex w-full flex-col gap-3">
        <Reveal>
          <h2 className={cn(HEAD, 'mb-3 px-3 text-[clamp(3.4rem,10vw,9rem)] text-white lg:px-0')}>{lang?.mobile_landing_more_title || 'Под капотом'}</h2>
        </Reveal>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Reveal><Tile icon="IC-music" title={lang?.mobile_landing_tile_music || 'Музыка в фоне'} text={lang?.mobile_landing_tile_music_text || 'Играет при погасшем экране, управление — из шторки и с экрана блокировки.'} sticker={<DiscSticker className="lp-spin h-auto w-full" />} /></Reveal>
          <Reveal delay={0.08}><Tile icon="IC-notification" title={lang?.mobile_landing_tile_push || 'Мгновенные уведомления'} text={lang?.mobile_landing_tile_push_text || 'Сообщения и звонки приходят сразу, даже когда приложение закрыто.'} sticker={<BoltSticker className="h-auto w-full" />} /></Reveal>
          <Reveal><Tile icon="IC-lock" title={lang?.mobile_landing_tile_passkeys || 'Вход по Passkeys'} text={lang?.mobile_landing_tile_passkeys_text || 'Отпечаток или Face ID вместо пароля — быстро и надёжно.'} sticker={<CoinSticker className="h-auto w-full" />} /></Reveal>
          <Reveal delay={0.08}><Tile icon="IC-download" title={lang?.mobile_landing_tile_offline || 'Офлайн-треки'} text={lang?.mobile_landing_tile_offline_text || 'Сохраняйте любимое в телефон и слушайте без интернета.'} sticker={<HeartSticker className="h-auto w-full" />} /></Reveal>
        </div>
      </section>

      <FinalCta lang={lang} onPick={setPlatform} />
      </div>

      <InstallModal lang={lang} platform={platform} onClose={() => setPlatform(null)} />
      <div className="lg:hidden"><br /><br /><br /><br /></div>
    </div>
  );
}
