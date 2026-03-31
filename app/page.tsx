import type { Metadata } from 'next';
import Image from 'next/image';
import { createPageMetadata } from './seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Главная',
  description: 'Добро пожаловать в Ancial — социальную сеть с лентой новостей, сообщениями, звонками, музыкой, играми и кошельком.',
  keywords: ['главная', 'лента', 'социальная сеть', 'Ancial'],
  canonical: '/',
});

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-screen no-mobile-nav-padding p-3">
      <video
        id="videobackground"
        autoPlay
        muted
        loop
        preload="none"
        playsInline
        className="z-[-1] hidden lg:flex absolute inset-0 w-full h-full object-cover opacity-50"
        src="/img/backgrounds/ygX.mp4"
      />
      <Image
        src="/img/backgrounds/bg.webp"
        fill
        alt="Background"
        className="z-[-1] absolute inset-0 w-full h-full object-cover opacity-40 lg:hidden"
      />
      <div className="bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 rounded-3xl w-full max-w-screen-md p-3 flex items-center gap-3 shadow -mb-10">
        <div className="flex flex-col w-full">
          <span className="text-lg lg:text-2xl font-bold">Привет. Ты попал в DEV версию Ancial на React.</span>
          <span className="text-sm lg:text-base text-zinc-300">
            Здесь отсутствует множество функций, дизайн может быть сломан, а производительность будет ужасной. Но ты можешь помочь нам найти баги и недоработки, чтобы сделать Ancial лучше!
          </span>
          <span className="text-xs lg:text-sm text-zinc-400">
            Вернись в полную и стабильную версию, если не хочешь сталкиваться с проблемами и багами. Спасибо за понимание!
          </span>
          <div className="flex items-center justify-end gap-3 mt-1.5">
            <a
              href="https://t.me/ancialru"
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-400 hover:bg-blue-500 duration-300 active:scale-95 shadow border border-zinc-600/30"
            >
              <img className="w-3.5 h-3.5" src="/img/socials/tg.png" alt="Telegram" />
            </a>
            <a
              href="https://ancial.ru/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit text-center px-1 py-0.5 bg-purple-500 hover:bg-purple-600 duration-300 cursor-pointer rounded-3xl border border-zinc-600/30 active:scale-95"
            >
              В полную версию
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
