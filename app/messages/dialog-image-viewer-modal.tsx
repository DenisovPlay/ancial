/* eslint-disable @next/next/no-img-element */
'use client';

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';

import Modal from '../components/modal';
import { SvgIcon } from '../feed/editor-shared';

type Point = { x: number; y: number };

export type DialogImageSlide = {
  alt?: string | null;
  key: string;
  url: string;
};

type DialogImageViewerModalProps = {
  activeImageIndex: number | null;
  images: DialogImageSlide[];
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSelect: (index: number) => void;
};

const MIN_IMAGE_SCALE = 1;
const MAX_IMAGE_SCALE = 4;
const SWIPE_CLOSE_THRESHOLD = 120;
const SWIPE_IMAGE_THRESHOLD = 72;
const DOUBLE_TAP_DELAY = 280;
const DOUBLE_TAP_DISTANCE = 32;
const TAP_MOVE_THRESHOLD = 16;
const DOUBLE_TAP_SCALE = 2.5;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distanceBetween(first: Point, second: Point) {
  const deltaX = second.x - first.x;
  const deltaY = second.y - first.y;
  return Math.hypot(deltaX, deltaY);
}

export default function DialogImageViewerModal({
  activeImageIndex,
  images,
  isOpen,
  onClose,
  onNext,
  onPrev,
  onSelect,
}: DialogImageViewerModalProps) {
  const activeImage = activeImageIndex === null ? null : images[activeImageIndex] ?? null;
  const imagesLength = images.length;

  const [scale, setScale] = useState(MIN_IMAGE_SCALE);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [swipeOffsetX, setSwipeOffsetX] = useState(0);
  const [swipeOffsetY, setSwipeOffsetY] = useState(0);
  const [interactionMode, setInteractionMode] = useState<
    'idle' | 'swipe-x' | 'swipe-y' | 'pan' | 'pinch'
  >('idle');

  const stageRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const scaleRef = useRef(MIN_IMAGE_SCALE);
  const offsetRef = useRef<Point>({ x: 0, y: 0 });
  const swipeOffsetXRef = useRef(0);
  const swipeOffsetYRef = useRef(0);
  const activePointersRef = useRef<Map<number, Point>>(new Map());
  const pointerDownPositionsRef = useRef<Map<number, Point>>(new Map());
  const pointerStartRef = useRef<Point | null>(null);
  const pointerOffsetStartRef = useRef<Point>({ x: 0, y: 0 });
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(MIN_IMAGE_SCALE);
  const lastTapRef = useRef<{ position: Point; time: number } | null>(null);
  const activeThumbRef = useRef<HTMLButtonElement | null>(null);

  const syncScale = (nextScale: number) => {
    scaleRef.current = nextScale;
    setScale(nextScale);
  };

  const syncOffset = (nextOffset: Point) => {
    offsetRef.current = nextOffset;
    setOffset(nextOffset);
  };

  const syncSwipeOffsetX = (nextOffset: number) => {
    swipeOffsetXRef.current = nextOffset;
    setSwipeOffsetX(nextOffset);
  };

  const syncSwipeOffsetY = (nextOffset: number) => {
    swipeOffsetYRef.current = nextOffset;
    setSwipeOffsetY(nextOffset);
  };

  const getPanBounds = (nextScale = scaleRef.current) => {
    const stage = stageRef.current;
    const currentImage = imageRef.current;

    if (!stage || !currentImage || nextScale <= MIN_IMAGE_SCALE) {
      return { x: 0, y: 0 };
    }

    const currentScale = Math.max(scaleRef.current, MIN_IMAGE_SCALE);
    const imageRect = currentImage.getBoundingClientRect();
    const baseWidth = imageRect.width / currentScale;
    const baseHeight = imageRect.height / currentScale;
    const scaledWidth = baseWidth * nextScale;
    const scaledHeight = baseHeight * nextScale;

    return {
      x: Math.max(0, (scaledWidth - stage.clientWidth) / 2),
      y: Math.max(0, (scaledHeight - stage.clientHeight) / 2),
    };
  };

  const clampOffsetToBounds = (nextOffset: Point, nextScale = scaleRef.current) => {
    if (nextScale <= MIN_IMAGE_SCALE) {
      return { x: 0, y: 0 };
    }

    const bounds = getPanBounds(nextScale);

    return {
      x: clamp(nextOffset.x, -bounds.x, bounds.x),
      y: clamp(nextOffset.y, -bounds.y, bounds.y),
    };
  };

  useEffect(() => {
    if (!isOpen) {
      syncScale(MIN_IMAGE_SCALE);
      syncOffset({ x: 0, y: 0 });
      syncSwipeOffsetX(0);
      syncSwipeOffsetY(0);
      setInteractionMode('idle');
      activePointersRef.current.clear();
      pointerDownPositionsRef.current.clear();
      pointerStartRef.current = null;
      pointerOffsetStartRef.current = { x: 0, y: 0 };
      pinchStartDistanceRef.current = null;
      pinchStartScaleRef.current = MIN_IMAGE_SCALE;
      lastTapRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!activeImage || activeImageIndex === null) return;

    syncScale(MIN_IMAGE_SCALE);
    syncOffset({ x: 0, y: 0 });
    syncSwipeOffsetX(0);
    syncSwipeOffsetY(0);
    setInteractionMode('idle');
    activePointersRef.current.clear();
    pointerDownPositionsRef.current.clear();
    pointerStartRef.current = null;
    pointerOffsetStartRef.current = { x: 0, y: 0 };
    pinchStartDistanceRef.current = null;
    pinchStartScaleRef.current = MIN_IMAGE_SCALE;
    lastTapRef.current = null;
  }, [activeImage, activeImageIndex]);

  useEffect(() => {
    if (!isOpen || activeImageIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' && imagesLength > 1) {
        event.preventDefault();
        onNext();
        return;
      }

      if (event.key === 'ArrowLeft' && imagesLength > 1) {
        event.preventDefault();
        onPrev();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeImageIndex, imagesLength, isOpen, onNext, onPrev]);

  useEffect(() => {
    if (!isOpen || !activeThumbRef.current) return;
    activeThumbRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeImageIndex, isOpen]);

  const handleDoubleTapZoom = (position: Point) => {
    const stage = stageRef.current;
    const nextScale =
      scaleRef.current > MIN_IMAGE_SCALE + 0.02 ? MIN_IMAGE_SCALE : DOUBLE_TAP_SCALE;

    syncSwipeOffsetX(0);
    syncSwipeOffsetY(0);

    if (nextScale === MIN_IMAGE_SCALE || !stage) {
      syncScale(MIN_IMAGE_SCALE);
      syncOffset({ x: 0, y: 0 });
      setInteractionMode('idle');
      return;
    }

    const stageRect = stage.getBoundingClientRect();
    const relativeX = position.x - (stageRect.left + stageRect.width / 2);
    const relativeY = position.y - (stageRect.top + stageRect.height / 2);
    const nextOffset = clampOffsetToBounds(
      {
        x: -(nextScale - 1) * relativeX,
        y: -(nextScale - 1) * relativeY,
      },
      nextScale,
    );

    syncScale(nextScale);
    syncOffset(nextOffset);
    setInteractionMode('idle');
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const scaleDelta = event.ctrlKey
      ? -event.deltaY * 0.01
      : -Math.sign(event.deltaY || 0) * 0.2;

    if (scaleDelta === 0) return;

    const nextScale = clamp(
      Number((scaleRef.current + scaleDelta).toFixed(3)),
      MIN_IMAGE_SCALE,
      MAX_IMAGE_SCALE,
    );
    const normalizedScale =
      nextScale <= MIN_IMAGE_SCALE + 0.02 ? MIN_IMAGE_SCALE : nextScale;

    syncScale(normalizedScale);
    syncSwipeOffsetX(0);
    syncSwipeOffsetY(0);

    if (normalizedScale === MIN_IMAGE_SCALE) {
      syncOffset({ x: 0, y: 0 });
      return;
    }

    syncOffset(clampOffsetToBounds(offsetRef.current, normalizedScale));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    event.stopPropagation();

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}

    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    pointerDownPositionsRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (activePointersRef.current.size === 2) {
      const [first, second] = Array.from(activePointersRef.current.values());

      pinchStartDistanceRef.current = distanceBetween(first, second);
      pinchStartScaleRef.current = scaleRef.current;
      pointerStartRef.current = null;
      syncSwipeOffsetX(0);
      syncSwipeOffsetY(0);
      lastTapRef.current = null;
      setInteractionMode('pinch');
      return;
    }

    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    pointerOffsetStartRef.current = offsetRef.current;
    setInteractionMode(scaleRef.current > MIN_IMAGE_SCALE ? 'pan' : 'idle');
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!activePointersRef.current.has(event.pointerId)) return;

    event.stopPropagation();

    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (activePointersRef.current.size === 2) {
      const [first, second] = Array.from(activePointersRef.current.values());
      const startDistance =
        pinchStartDistanceRef.current ?? distanceBetween(first, second);
      const nextDistance = distanceBetween(first, second);
      const rawScale = clamp(
        pinchStartScaleRef.current * (nextDistance / Math.max(startDistance, 1)),
        MIN_IMAGE_SCALE,
        MAX_IMAGE_SCALE,
      );
      const normalizedScale =
        rawScale <= MIN_IMAGE_SCALE + 0.02 ? MIN_IMAGE_SCALE : rawScale;

      syncScale(normalizedScale);
      syncSwipeOffsetY(0);

      if (normalizedScale === MIN_IMAGE_SCALE) {
        syncOffset({ x: 0, y: 0 });
      } else {
        syncOffset(clampOffsetToBounds(offsetRef.current, normalizedScale));
      }

      setInteractionMode('pinch');
      return;
    }

    const pointerStart = pointerStartRef.current;
    if (!pointerStart) return;

    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;

    if (scaleRef.current > MIN_IMAGE_SCALE) {
      syncOffset(
        clampOffsetToBounds(
          {
            x: pointerOffsetStartRef.current.x + deltaX,
            y: pointerOffsetStartRef.current.y + deltaY,
          },
          scaleRef.current,
        ),
      );
      syncSwipeOffsetX(0);
      syncSwipeOffsetY(0);
      setInteractionMode('pan');
      return;
    }

    if (imagesLength > 1 && Math.abs(deltaX) > Math.abs(deltaY)) {
      syncSwipeOffsetX(deltaX);
      syncSwipeOffsetY(0);
      setInteractionMode('swipe-x');
      return;
    }

    if (deltaY > 0 && Math.abs(deltaY) >= Math.abs(deltaX)) {
      syncSwipeOffsetX(0);
      syncSwipeOffsetY(deltaY);
      setInteractionMode('swipe-y');
      return;
    }

    if (swipeOffsetXRef.current !== 0) {
      syncSwipeOffsetX(0);
    }

    if (swipeOffsetYRef.current !== 0) {
      syncSwipeOffsetY(0);
    }
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();

    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {}

    const pointerDownPosition = pointerDownPositionsRef.current.get(event.pointerId) ?? null;
    const releasedPosition = { x: event.clientX, y: event.clientY };

    activePointersRef.current.delete(event.pointerId);
    pointerDownPositionsRef.current.delete(event.pointerId);

    if (activePointersRef.current.size === 1) {
      const [remainingPointer] = Array.from(activePointersRef.current.values());

      pointerStartRef.current = remainingPointer;
      pointerOffsetStartRef.current = offsetRef.current;
      pinchStartDistanceRef.current = null;
      pinchStartScaleRef.current = scaleRef.current;
      setInteractionMode(scaleRef.current > MIN_IMAGE_SCALE ? 'pan' : 'idle');
      return;
    }

    pointerStartRef.current = null;
    pinchStartDistanceRef.current = null;
    pinchStartScaleRef.current = scaleRef.current;

    const isTapCandidate =
      pointerDownPosition !== null &&
      distanceBetween(pointerDownPosition, releasedPosition) <= TAP_MOVE_THRESHOLD;

    if (activePointersRef.current.size === 0 && isTapCandidate && event.pointerType !== 'mouse') {
      const now = Date.now();
      const lastTap = lastTapRef.current;

      if (
        lastTap &&
        now - lastTap.time <= DOUBLE_TAP_DELAY &&
        distanceBetween(lastTap.position, releasedPosition) <= DOUBLE_TAP_DISTANCE
      ) {
        lastTapRef.current = null;
        handleDoubleTapZoom(releasedPosition);
        return;
      }

      lastTapRef.current = { position: releasedPosition, time: now };
    } else if (!isTapCandidate) {
      lastTapRef.current = null;
    }

    if (scaleRef.current > MIN_IMAGE_SCALE + 0.02) {
      syncOffset(clampOffsetToBounds(offsetRef.current, scaleRef.current));
      setInteractionMode('idle');
      return;
    }

    syncScale(MIN_IMAGE_SCALE);
    syncOffset({ x: 0, y: 0 });

    if (Math.abs(swipeOffsetXRef.current) > SWIPE_IMAGE_THRESHOLD && imagesLength > 1) {
      const nextDirection = swipeOffsetXRef.current < 0 ? 'next' : 'prev';

      syncSwipeOffsetX(0);
      syncSwipeOffsetY(0);
      setInteractionMode('idle');

      if (nextDirection === 'next') {
        onNext();
      } else {
        onPrev();
      }
      return;
    }

    if (swipeOffsetYRef.current > SWIPE_CLOSE_THRESHOLD) {
      syncSwipeOffsetX(0);
      syncSwipeOffsetY(0);
      setInteractionMode('idle');
      onClose();
      return;
    }

    syncSwipeOffsetX(0);
    syncSwipeOffsetY(0);
    setInteractionMode('idle');
  };

  if (!activeImage) return null;

  const frameStyle = {
    transform: `translate3d(${swipeOffsetX}px, ${swipeOffsetY}px, 0)`,
    opacity:
      swipeOffsetY > 0
        ? Math.max(0.35, 1 - swipeOffsetY / 320)
        : swipeOffsetX !== 0
          ? Math.max(0.7, 1 - Math.abs(swipeOffsetX) / 420)
          : 1,
    transition:
      interactionMode === 'idle'
        ? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease-out'
        : 'none',
  };

  const imageStyle = {
    transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
    transition:
      interactionMode === 'idle'
        ? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)'
        : 'none',
    transformOrigin: 'center center',
    cursor:
      scale > MIN_IMAGE_SCALE
        ? interactionMode === 'pan'
          ? 'grabbing'
          : 'grab'
        : 'zoom-in',
    willChange: 'transform',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showHeader={false}
      swipeable={false}
      unstyled
      width="full"
      align="center"
      animation="fade"
      overlayClassName="!bg-black/90 !backdrop-blur-sm"
      panelClassName="!h-full !max-h-full !w-full !max-w-none !overflow-hidden !border-0 !bg-transparent !shadow-none"
      bodyClassName="!h-full !overflow-hidden p-0"
    >
      <div className="relative flex h-full w-full items-center justify-center" onClick={onClose}>
        <div
          className="relative flex h-full w-full items-center justify-center"
          style={frameStyle}
          onClick={(event) => event.stopPropagation()}
        >
          {imagesLength > 1 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onPrev();
              }}
              className="absolute left-3 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/70 text-white duration-300 hover:bg-zinc-800/90 active:scale-95 sm:flex"
              aria-label="Previous image"
            >
              <SvgIcon className="h-7 w-7 fill-white" id="IC-chevron-left" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="absolute right-3 top-3 z-10 hidden h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/70 text-white duration-300 hover:bg-zinc-800/90 active:scale-95 sm:flex"
            aria-label="Close image"
          >
            <SvgIcon className="h-6 w-6 fill-white" id="IC-times" />
          </button>

          <div
            ref={stageRef}
            className="flex h-full max-h-full w-full touch-none select-none flex-col items-center justify-center gap-3"
            onClick={(event) => event.stopPropagation()}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          >
            <img
              ref={imageRef}
              src={activeImage.url}
              alt={activeImage.alt || `Chat image ${(activeImageIndex ?? 0) + 1}`}
              className="max-h-[80vh] max-w-full rounded-3xl object-contain shadow-2xl"
              style={imageStyle}
              onDragStart={(event) => event.preventDefault()}
            />

            {imagesLength > 1 ? (
              <div className="text-sm text-zinc-300">
                {(activeImageIndex ?? 0) + 1} / {imagesLength}
              </div>
            ) : null}
          </div>

          {imagesLength > 1 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onNext();
              }}
              className="absolute right-3 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/70 text-white duration-300 hover:bg-zinc-800/90 active:scale-95 sm:flex"
              aria-label="Next image"
            >
              <SvgIcon className="h-7 w-7 fill-white" id="IC-chevron-right" />
            </button>
          ) : null}

          {imagesLength > 1 ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
              <div className="pointer-events-auto flex max-w-[min(100vw-24px,720px)] gap-2 overflow-x-auto rounded-2xl border border-zinc-700/70 bg-zinc-900/70 p-2 backdrop-blur-md backdrop-saturate-200">
                {images.map((image, index) => (
                  <button
                    key={image.key}
                    ref={index === activeImageIndex ? activeThumbRef : null}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(index);
                    }}
                    className={cn(
                      'h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-transparent duration-300 active:scale-95',
                      index === activeImageIndex
                        ? 'ring-2 ring-white/90'
                        : 'opacity-70 hover:opacity-100',
                    )}
                    aria-label={`Open image ${index + 1}`}
                  >
                    <img
                      src={image.url}
                      alt={image.alt || `Thumbnail ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
