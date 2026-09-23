
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getOverlayGame } from '../apps-model';
import WeatherContent from '../included/weather/weather-content';
import AppImage from '../../components/app-image';
import Icon from '../../components/svg-icon';

type AppsOverlayProps = {
  gameId: string;
};

export default function AppsOverlay({ gameId }: AppsOverlayProps) {
  const game = getOverlayGame(gameId);

  if (!game) {
    notFound();
  }

  if (gameId === 'weather') {
    return (
      <div className="apps-overlay-route no-mobile-nav-padding no-pc-nav-padding min-h-screen w-full relative bg-black">
        <Link
          aria-label="Назад"
          className="p-1.5 flex items-center group justify-center rounded-full fixed top-3 left-3 cursor-pointer active:scale-95 duration-300 bg-zinc-900/40 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 hover:bg-zinc-700 h-10 w-10 z-[9999]"
          href={game.backHref || '/'}
        >
          <Icon name="IC-chevron-left" className="w-6 h-6 fill-white inline shrink-0" />
        </Link>
        <WeatherContent />
      </div>
    );
  }

  return (
    <div className="apps-overlay-route no-mobile-nav-padding no-pc-nav-padding flex justify-center relative bg-black">
      <div className="flex flex-col gap-3 flex-grow items-center w-full md:max-w-screen-2xl">
        <Link
          aria-label="Назад"
          className={`p-1.5 flex items-center group justify-center rounded-full absolute top-3 left-3 cursor-pointer active:scale-95 duration-300 bg-zinc-900/20 border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 hover:bg-zinc-700 h-8 w-8 z-[9999] ${game.backHref !== '/' ? 'hover:w-24' : ''
            }`}
          href={game.backHref}
        >
          <Icon name="IC-chevron-left" className="w-6 h-6 fill-white inline shrink-0" />
          {game.backHref !== '/' && (
            <AppImage
              width={358}
              height={154}
              alt="Zynt"
              className="group-hover:ml-1.5 shrink-0 w-0 group-hover:w-16 duration-300"
              src="/img/logos/zynt.svg"
            />
          )}
        </Link>

        <iframe
          allow="fullscreen; gamepad; autoplay; clipboard-read; clipboard-write"
          className="w-full h-screen"
          src={game.src}
          style={{ minHeight: '100vh' }}
          title={game.name}
        />
      </div>
    </div>
  );
}
