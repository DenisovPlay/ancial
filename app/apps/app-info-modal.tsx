'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import ImageViewerModal, { type ImageViewerSlide } from '../components/image-viewer-modal';
import Modal from '../components/modal';
import { useAuth } from '../context/AuthContext';
import { useDragScroll } from '../hooks/useDragScroll';
import { AncialAPI } from '../lib/api-v2';
import {
  type LegacyAppInfo,
  type LegacyAppInfoResponse,
  rewriteLegacyPlayUrl,
  splitScreenshots,
  toBooleanFlag,
} from './apps-model';
import { BoltIcon, CheckIcon, GamepadIcon, StarIcon } from './apps-icons';

type AppInfoModalProps = {
  appId: number | string | null;
  isOpen: boolean;
  onClose: () => void;
};

export default function AppInfoModal({ appId, isOpen, onClose }: AppInfoModalProps) {
  const router = useRouter();
  const { lang } = useAuth();
  const [app, setApp] = useState<LegacyAppInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState<number | null>(null);
  const screenshotsRef = useDragScroll({ speed: 1.4 });

  useEffect(() => {
    if (!isOpen || appId === null) {
      return;
    }

    let alive = true;

    async function loadApp() {
      setLoading(true);
      setApp(null);
      setError('');

      try {
        const data = await AncialAPI.getAppInfo<{ app?: LegacyAppInfo | LegacyAppInfo[] | null }>(appId!);

        if (!alive) {
          return;
        }

        // The API might return an object with an app property that is an array or a single object.
        const appData = Array.isArray(data.app) ? data.app[0] : data.app;
        setApp(appData ?? null);
      } catch (caughtError) {
        if (!alive) return;
        setError(caughtError instanceof Error ? caughtError.message : (lang?.loading_error || 'Ошибка загрузки'));
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    void loadApp();

    return () => {
      alive = false;
    };
  }, [appId, isOpen]);

  const screenshots = useMemo(() => splitScreenshots(app?.screenshots), [app]);
  const screenshotSlides = useMemo<ImageViewerSlide[]>(
    () =>
      screenshots.map((url, index) => ({
        alt: `${app?.name ?? 'App'} screenshot ${index + 1}`,
        url,
      })),
    [app?.name, screenshots],
  );
  const selectedScreenshot =
    selectedScreenshotIndex === null ? null : screenshotSlides[selectedScreenshotIndex] ?? null;

  useEffect(() => {
    setSelectedScreenshotIndex(null);
  }, [appId, isOpen]);

  useEffect(() => {
    if (
      selectedScreenshotIndex !== null &&
      selectedScreenshotIndex >= screenshotSlides.length
    ) {
      setSelectedScreenshotIndex(null);
    }
  }, [selectedScreenshotIndex, screenshotSlides.length]);

  useEffect(() => {
    if (selectedScreenshotIndex === null || screenshotSlides.length <= 1) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSelectedScreenshotIndex((current) =>
          current === null ? 0 : (current + 1) % screenshotSlides.length,
        );
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSelectedScreenshotIndex((current) =>
          current === null ? 0 : (current - 1 + screenshotSlides.length) % screenshotSlides.length,
        );
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedScreenshotIndex, screenshotSlides.length]);

  const openScreenshot = (index: number) => {
    setSelectedScreenshotIndex(index);
  };

  const closeScreenshot = () => {
    setSelectedScreenshotIndex(null);
  };

  const handlePrevScreenshot = () => {
    setSelectedScreenshotIndex((current) => {
      if (screenshotSlides.length === 0) return current;
      return current === null
        ? screenshotSlides.length - 1
        : (current - 1 + screenshotSlides.length) % screenshotSlides.length;
    });
  };

  const handleNextScreenshot = () => {
    setSelectedScreenshotIndex((current) => {
      if (screenshotSlides.length === 0) return current;
      return current === null ? 0 : (current + 1) % screenshotSlides.length;
    });
  };

  const handleModalClose = () => {
    if (selectedScreenshotIndex !== null) {
      closeScreenshot();
      return;
    }

    onClose();
  };

  const handlePlay = () => {
    if (!app) {
      return;
    }

    void AncialAPI.trackAppLaunch(app.id).catch(() => undefined);

    router.push(rewriteLegacyPlayUrl(app.link_web));
    onClose();
  };

  return (
    <>
      <Modal
        align="responsive"
        animation="sheet"
        bodyClassName="py-3"
        isOpen={isOpen}
        onClose={handleModalClose}
        panelClassName="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl"
        showHeader={false}
        width="lg"
      >
      {loading && <AppInfoSkeleton lang={lang} />}
      {!loading && error && <AppInfoError error={error} />}
      {!loading && !error && !app && <AppInfoEmpty lang={lang} />}
      {!loading && !error && app && (
        <div className="flex flex-col w-full overflow-y-auto overflow-x-hidden">
          <div className="flex items-center w-full gap-3 px-3">
            <div className="flex flex-col flex-grow min-w-0">
              <span id="favTitle" className="text-3xl font-bold text-white break-words">
                {app.name}
              </span>
              <span id="favDeveloper" className="text-xl text-zinc-300 break-words">
                {app.developer}
              </span>

              <div className="divide-x divide-zinc-700 w-full my-3 hidden lg:flex">
                <StatItem icon={<GamepadIcon className="inline h-9 w-9 lg:w-12 lg:h-12 fill-white" />} label={app.downloads} />
                {toBooleanFlag(app.red_chois) && (
                  <StatItem icon={<StarIcon className="inline h-9 w-9 lg:w-12 lg:h-12 fill-white" />} label={lang?.redchoise ?? 'Выбор редакции'} />
                )}
                <StatItem icon={<BoltIcon className="inline h-9 w-9 lg:w-12 lg:h-12 fill-white" />} label={lang?.without_install ?? 'Без установки'} />
                <StatItem icon={<CheckIcon className="inline h-9 w-9 lg:w-12 lg:h-12 fill-white" />} label={lang?.appchecked ?? 'Проверено'} />
              </div>

              <span id="favDescriptionPC" className="text-zinc-400 hidden lg:flex">
                {app.desk}
              </span>

              <button
                className="mt-3 border border-zinc-600/30 cursor-pointer bg-purple-500 hover:bg-purple-600 text-lg font-bold px-3 py-1.5 active:scale-95 duration-300 w-full lg:w-fit shadow rounded-3xl"
                onClick={handlePlay}
                type="button"
              >
                {lang?.play_in_browser ?? 'Играть в браузере'}
              </button>
            </div>
            <div className="relative flex items-center justify-center shrink-0">
              <button
                className="absolute -top-1 -right-1 lg:top-2 lg:right-2 z-30 p-1.5 lg:p-2 bg-black/50 hover:bg-black/70 rounded-full text-white cursor-pointer active:scale-95 border border-zinc-600/30 duration-300 shadow-md backdrop-blur-sm"
                onClick={handleModalClose}
                type="button"
                aria-label={lang?.close ?? 'Закрыть'}
              >
                <svg className="w-4 h-4 lg:w-6 lg:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img
                alt={app.name}
                className="border border-zinc-600/30 shadow rounded-3xl w-24 lg:w-64 z-20 lg:rounded-3xl"
                src={app.cover}
              />
              <img
                alt=""
                aria-hidden="true"
                className="shadow rounded-3xl w-16 lg:w-56 absolute blur-xl animate-pulse z-10"
                src={app.cover}
              />
            </div>
          </div>

          <div className="divide-x divide-zinc-700 w-full mt-3 lg:hidden px-3 flex">
            <StatItem
              grow
              icon={<GamepadIcon className="inline h-9 w-9 lg:w-12 lg:h-12 fill-white" />}
              label={app.downloads}
            />
            {toBooleanFlag(app.red_chois) && (
              <StatItem
                grow
                icon={<StarIcon className="inline h-9 w-9 lg:w-12 lg:h-12 fill-white" />}
                label={lang?.redchoise ?? 'Выбор редакции'}
              />
            )}
            <StatItem
              grow
              icon={<BoltIcon className="inline h-9 w-9 lg:w-12 lg:h-12 fill-white" />}
              label={lang?.without_install ?? 'Без установки'}
            />
            <StatItem
              grow
              icon={<CheckIcon className="inline h-9 w-9 lg:w-12 lg:h-12 fill-white" />}
              label={lang?.appchecked ?? 'Проверено'}
            />
          </div>

          <div ref={screenshotsRef} className="flex w-full overflow-auto gap-3 viewport dragscroll mt-3 px-3">
            {screenshots.map((image, index) => (
              <button
                aria-label={`${app.name} screenshot ${index + 1}`}
                className="shrink-0"
                key={`${image}-${index}`}
                onClick={() => openScreenshot(index)}
                type="button"
              >
                <img
                  alt={`${app.name} screenshot`}
                  className="h-32 lg:h-64 bg-zinc-800 shadow rounded-2xl shrink-0 cursor-pointer duration-300 active:scale-95"
                  src={image}
                />
              </button>
            ))}
          </div>

          <span id="favDescriptionMB" className="text-zinc-400 lg:hidden px-3 mt-3">
            {app.desk}
          </span>
        </div>
      )}
      </Modal>
      {selectedScreenshot && (
        <ImageViewerModal
          activeImageIndex={selectedScreenshotIndex}
          images={screenshotSlides}
          isOpen={selectedScreenshotIndex !== null}
          onClose={closeScreenshot}
          onNext={handleNextScreenshot}
          onPrev={handlePrevScreenshot}
        />
      )}
    </>
  );
}

function StatItem({
  grow = false,
  icon,
  label,
}: {
  grow?: boolean;
  icon: ReactNode;
  label: ReactNode;
}) {
  return (
    <div className={`flex flex-col items-center px-3 gap-1.5 ${grow ? 'flex-grow' : ''}`}>
      {icon}
      <span className="truncate text-center text-zinc-300 text-xs lg:text-sm max-w-24">{label}</span>
    </div>
  );
}

function AppInfoSkeleton({ lang }: { lang: ReturnType<typeof useAuth>['lang'] }) {
  return (
    <div className="flex flex-col w-full overflow-y-auto overflow-x-hidden">
      <div className="flex items-center w-full gap-3 px-3">
        <div className="flex flex-col flex-grow">
          <span className="w-32 h-5 bg-zinc-600 animate-pulse rounded-2xl" />
          <span className="w-48 h-5 bg-zinc-600 animate-pulse rounded-2xl mt-1.5" />

          <div className="divide-x divide-zinc-700 w-full my-3 hidden lg:flex">
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
          </div>

          <span className="w-64 h-14 bg-zinc-600 animate-pulse hidden lg:flex rounded-2xl" />

          <button className="mt-3 bg-zinc-500 text-zinc-500 animate-pulse text-lg font-bold px-3 py-1.5 duration-300 w-full lg:w-fit shadow rounded-3xl" type="button">
            {lang?.play_in_browser ?? 'Играть в браузере'}
          </button>
        </div>
        <div className="relative flex items-center justify-center shrink-0">
          <span className="w-24 lg:w-64 h-32 lg:h-72 bg-zinc-600 animate-pulse rounded-2xl" />
        </div>
      </div>

      <div className="divide-x divide-zinc-700 w-full mt-3 lg:hidden px-3 flex">
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>

      <div className="flex w-full overflow-auto gap-3 viewport dragscroll mt-3 px-3">
        <span className="w-48 h-32 lg:h-64 lg:w-72 bg-zinc-600 animate-pulse rounded-2xl shrink-0" />
        <span className="w-48 h-32 lg:h-64 lg:w-72 bg-zinc-600 animate-pulse rounded-2xl shrink-0" />
      </div>

      <span className="w-64 h-14 bg-zinc-600 animate-pulse lg:hidden mx-3 mt-3 rounded-2xl" />
    </div>
  );
}

function SkeletonStat() {
  return (
    <div className="flex flex-col items-center px-3 gap-1.5">
      <span className="w-9 h-9 lg:w-12 lg:h-12 bg-zinc-600 animate-pulse rounded-2xl" />
      <span className="w-16 h-3 bg-zinc-600 animate-pulse rounded-2xl" />
    </div>
  );
}

function AppInfoEmpty({ lang }: { lang: ReturnType<typeof useAuth>['lang'] }) {
  return (
    <div className="text-center w-full flex flex-col gap-0.5 justify-center items-center pb-3">
      <img alt="" className="h-56" src="/includes/img/anlite/nothingfound.webp" />
      <span className="text-base text-zinc-100 w-full text-center font-black">
        {lang?.emptycomments ?? 'Ничего не найдено'}
      </span>
      <span className="text-sm text-zinc-300 w-full text-center font-medium">
        {lang?.emptymessagesdesc ?? 'Попробуйте позже'}
      </span>
    </div>
  );
}

function AppInfoError({ error }: { error: string }) {
  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center w-full h-full">
      <img alt="" src="/includes/img/stickers/sponge.gif" />
      <span className="text-lg text-center text-zinc-200">Связь потеряна!</span>
      <span className="text-content-600">Попробуйте обновить страницу</span>
      <span className="text-xs text-zinc-400">{error}</span>
    </div>
  );
}
