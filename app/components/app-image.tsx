'use client';

import NextImage, { type ImageProps } from 'next/image';
import {
  useCallback,
  useState,
  useSyncExternalStore,
  type AnimationEvent,
  type CSSProperties,
  type Ref,
  type SyntheticEvent,
} from 'react';

import { cn } from '../lib/cn';
import { canOptimizeImage } from '../lib/image-hosts';
import { isSvgSrc, TRANSPARENT_PIXEL, wasSlowNetworkLoad } from '../lib/image-loading';

type LoadStatus = 'loading' | 'loaded' | 'revealed' | 'error';

type LoaderOptions = {
  src: string | null | undefined;
  fallbackSrc?: string;
  className?: string;
  style?: CSSProperties;
  pendingStyle?: CSSProperties;
  skeleton: boolean;
  onLoad?: (event: SyntheticEvent<HTMLImageElement>) => void;
  onError?: (event: SyntheticEvent<HTMLImageElement>) => void;
  onAnimationEnd?: (event: AnimationEvent<HTMLImageElement>) => void;
};

const subscribeNothing = () => () => {};

/**
 * Состояние загрузки картинки: скелетон → (из кэша сразу | из сети с проявлением) → ошибка/фолбэк.
 * Классы вешаются на сам <img>, поэтому внешний вид (размер, скругления, border) задаёт вызывающий код.
 */
function useImageLoader({
  src,
  fallbackSrc,
  className,
  style,
  pendingStyle,
  skeleton,
  onLoad,
  onError,
  onAnimationEnd,
}: LoaderOptions) {
  // Пиксели прячем только после гидрации: SSR-картинка из кэша видна сразу, ещё до загрузки JS.
  const isClient = useSyncExternalStore(subscribeNothing, () => true, () => false);

  const primary = src || fallbackSrc || '';
  // direct — оптимизатор не отдал картинку (403/504/недоступный хост): грузим оригинал браузером.
  const [state, setState] = useState<{ primary: string; fallback: boolean; direct: boolean; status: LoadStatus }>({
    primary,
    fallback: false,
    direct: false,
    status: 'loading',
  });
  let { fallback, direct, status } = state;
  if (state.primary !== primary) {
    setState({ primary, fallback: false, direct: false, status: 'loading' });
    fallback = false;
    direct = false;
    status = 'loading';
  }

  let currentSrc = fallback && fallbackSrc ? fallbackSrc : primary;
  if (!currentSrc) status = 'error';
  if (status === 'error') currentSrc = TRANSPARENT_PIXEL;
  // SVG — без скелетона и проявления: вектор отрисовывается сразу.
  const withSkeleton = skeleton && !isSvgSrc(currentSrc);

  // Из памяти картинка готова синхронно (и SSR-картинка, загрузившаяся до гидрации):
  // показываем её до первой отрисовки, без скелетона и анимации.
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0 && img.src !== TRANSPARENT_PIXEL) {
      setState((prev) => (prev.status === 'loading' ? { ...prev, status: 'loaded' } : prev));
    }
  }, []);

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    if (event.currentTarget.src === TRANSPARENT_PIXEL) return;
    const slow = withSkeleton && wasSlowNetworkLoad(event.currentTarget.currentSrc);
    setState((prev) => (prev.status === 'loading' ? { ...prev, status: slow ? 'revealed' : 'loaded' } : prev));
    onLoad?.(event);
  };

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (event.currentTarget.src === TRANSPARENT_PIXEL) return;
    // Сначала — тот же файл напрямую (оптимизатор ходит без куки пользователя и через сеть сервера),
    // потом фолбэк, потом заглушка ошибки.
    const viaOptimizer = event.currentTarget.currentSrc.includes('/_next/image');
    const willRetryDirect = viaOptimizer && !direct;
    const willRetryFallback = !willRetryDirect && !fallback && Boolean(fallbackSrc) && fallbackSrc !== primary;

    setState((prev) => {
      if (viaOptimizer && !prev.direct) return { ...prev, direct: true, status: 'loading' };
      if (!prev.fallback && fallbackSrc && fallbackSrc !== prev.primary) return { ...prev, fallback: true, status: 'loading' };
      return { ...prev, status: 'error' };
    });

    if (!willRetryDirect && !willRetryFallback) {
      onError?.(event);
    }
  };

  // Класс проявления снимаем после анимации: иначе он перебивал бы собственные animate-* картинки.
  const handleAnimationEnd = (event: AnimationEvent<HTMLImageElement>) => {
    if (event.animationName === 'img-reveal') {
      setState((prev) => (prev.status === 'revealed' ? { ...prev, status: 'loaded' } : prev));
    }
    onAnimationEnd?.(event);
  };

  const pending = status === 'loading' || status === 'error';

  return {
    key: `${direct ? 'direct:' : ''}${currentSrc}`,
    direct,
    props: {
      ref,
      src: currentSrc,
      className: cn(
        className,
        status === 'loading' && withSkeleton && 'img-skeleton',
        status === 'loading' && withSkeleton && isClient && 'img-loading',
        status === 'revealed' && 'img-reveal',
        status === 'error' && 'img-error',
      ) || undefined,
      style: pending && pendingStyle ? { ...style, ...pendingStyle } : style,
      onLoad: handleLoad,
      onError: handleError,
      onAnimationEnd: handleAnimationEnd,
    },
  };
}

/**
 * Размер обязателен (иначе next/image не знает пропорций и рисует картинку в 100vw):
 * - width + height — пропорции и база srcset 1x/2x; видимый размер всё равно задаёт CSS;
 * - fill — картинка заполняет позиционированного родителя (плюс sizes для резиновых блоков).
 */
type SizeProps =
  | { width: number; height: number; fill?: never }
  | { fill: true; width?: never; height?: never };

export type AppImageProps = Omit<ImageProps, 'src' | 'alt' | 'width' | 'height' | 'fill' | 'ref'> & SizeProps & {
  src: string | null | undefined;
  alt?: string;
  /** Подставляется, если src пустой или не загрузился (аватар/обложка по умолчанию). */
  fallbackSrc?: string;
  /** Стиль на время загрузки и ошибки — место под картинку, размер которой заранее неизвестен. */
  pendingStyle?: CSSProperties;
  /** false — без скелетона: декоративные слои (размытое свечение, прозрачный оверлей поверх карты). */
  skeleton?: boolean;
  ref?: Ref<HTMLImageElement>;
};

function assignRef(ref: Ref<HTMLImageElement> | undefined, img: HTMLImageElement | null) {
  if (typeof ref === 'function') ref(img);
  else if (ref) ref.current = img;
}

/**
 * Единственный способ рисовать картинки в проекте: next/image + прелоадер.
 * Хосты из белого списка (lib/image-hosts) идут через оптимизатор (ресайз, webp/avif, srcset),
 * остальные, а также blob:/data:/svg — через тот же компонент как есть (unoptimized).
 */
export default function AppImage({
  src,
  fallbackSrc,
  className,
  style,
  pendingStyle,
  skeleton = true,
  onLoad,
  onError,
  onAnimationEnd,
  alt = '',
  unoptimized,
  ref,
  ...rest
}: AppImageProps) {
  const loader = useImageLoader({ src, fallbackSrc, className, style, pendingStyle, skeleton, onLoad, onError, onAnimationEnd });
  const loaderRef = loader.props.ref;
  const mergedRef = useCallback((img: HTMLImageElement | null) => {
    loaderRef(img);
    assignRef(ref, img);
  }, [loaderRef, ref]);

  return (
    <NextImage
      key={loader.key}
      {...rest}
      {...loader.props}
      ref={mergedRef}
      alt={alt}
      unoptimized={unoptimized ?? (loader.direct || !canOptimizeImage(loader.props.src))}
    />
  );
}
