'use client';

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';

import { SvgIcon } from '../feed/editor-shared';
import Modal from './modal';

type Point = { x: number; y: number };

export interface ImageViewerSlide {
  alt?: string | null;
  blur?: boolean | number | string | null;
  url: string;
}

export interface ImageViewerModalProps {
  activeImageIndex: number | null;
  images: ImageViewerSlide[];
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

const MIN_IMAGE_SCALE = 1;
const MAX_IMAGE_SCALE = 4;
const SWIPE_CLOSE_THRESHOLD = 120;
const SWIPE_IMAGE_THRESHOLD = 72;
const DOUBLE_TAP_DELAY = 280;
const DOUBLE_TAP_DISTANCE = 32;
const TAP_MOVE_THRESHOLD = 16;
const DOUBLE_TAP_SCALE = 2.5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distanceBetween(first: Point, second: Point) {
  const deltaX = second.x - first.x;
  const deltaY = second.y - first.y;
  return Math.hypot(deltaX, deltaY);
}

export default function ImageViewerModal({
  activeImageIndex,
  images,
  isOpen,
  onClose,
  onNext,
  onPrev,
}: ImageViewerModalProps) {
  const [scale, setScale] = useState(MIN_IMAGE_SCALE);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [swipeOffsetX, setSwipeOffsetX] = useState(0);
  const [swipeOffsetY, setSwipeOffsetY] = useState(0);
  const [interactionMode, setInteractionMode] = useState<
    'idle' | 'swipe-x' | 'swipe-y' | 'pan' | 'pinch'
  >('idle');
  const [internalIndex, setInternalIndex] = useState(activeImageIndex ?? 0);

  useEffect(() => {
    if (activeImageIndex !== null) {
      setInternalIndex(activeImageIndex);
    }
  }, [activeImageIndex]);

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
  const wasDraggedRef = useRef(false);

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

  const activeImageUrl = activeImageIndex !== null ? images[activeImageIndex]?.url : undefined;

  useEffect(() => {
    if (images.length === 0 || activeImageIndex === null) return;

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
  }, [activeImageIndex, activeImageUrl]);

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
    } catch { }

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

    wasDraggedRef.current = false;
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
    } catch { }

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

    if (!isTapCandidate) {
      wasDraggedRef.current = true;
    }

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

  if (images.length === 0) return null;

  const imagesLength = images.length;
  const activeIdx = internalIndex;

  const swipeStyle = {
    transform: `translate3d(calc(-${activeIdx * 100}% + ${swipeOffsetX}px), ${swipeOffsetY}px, 0)`,
    opacity:
      swipeOffsetY > 0
        ? Math.max(0.35, 1 - swipeOffsetY / 320)
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
      panelClassName="!w-full !max-w-none h-full !max-h-full !overflow-hidden !bg-transparent !border-0 !shadow-none"
      bodyClassName="h-full p-0 !overflow-hidden"
    >
      <div
        className="relative flex items-center justify-center w-full h-full"
      >
        <div
          className="relative flex items-center justify-center w-full h-full"
          onClick={(event) => {
            if (event.target === event.currentTarget && !wasDraggedRef.current) onClose();
          }}
        >
          {imagesLength > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onPrev();
              }}
              className="cursor-pointer hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 w-12 h-12 items-center justify-center rounded-full bg-zinc-900/70 border border-zinc-700 text-white hover:bg-zinc-800/90 duration-300 active:scale-95"
              aria-label="Previous image"
            >
              <SvgIcon className="w-7 h-7 fill-white" id="IC-chevron-left" />
            </button>
          )}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="hidden sm:flex cursor-pointer absolute top-3 right-3 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-zinc-900/70 border border-zinc-700 text-white hover:bg-zinc-800/90 duration-300 active:scale-95"
            aria-label="Close image"
          >
            <SvgIcon className="w-6 h-6 fill-white" id="IC-times" />
          </button>

          <a
            href={images[activeIdx].url}
            download
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="hidden sm:flex cursor-pointer absolute top-3 right-16 z-10 w-12 h-12 items-center justify-center rounded-full bg-zinc-900/70 border border-zinc-700 text-white hover:bg-zinc-800/90 duration-300 active:scale-95"
            aria-label="Download image"
          >
            <SvgIcon className="w-5 h-5 fill-white" id="IC-download" />
          </a>

          {imagesLength > 1 && (
            <div className="pointer-events-none absolute bottom-6 w-full text-center text-sm text-zinc-300 z-10 font-medium">
              {activeIdx + 1} / {imagesLength}
            </div>
          )}

          <div
            ref={stageRef}
            className="w-full h-full flex flex-row items-center touch-none select-none will-change-transform"
            style={swipeStyle}
            onClick={(event) => {
              if (event.target === event.currentTarget && !wasDraggedRef.current) onClose();
            }}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          >
            {images.map((img, idx) => (
              <div
                key={img.url + idx}
                className="w-full h-full shrink-0 flex flex-col items-center justify-center relative"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={idx === activeIdx ? imageRef : null}
                  src={img.url}
                  alt={img.alt ?? `Image ${idx + 1}`}
                  className="max-w-full max-h-[80vh] object-contain shadow-2xl"
                  style={idx === activeIdx ? imageStyle : {}}
                  onDragStart={(event) => event.preventDefault()}
                />
              </div>
            ))}
          </div>

          {imagesLength > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onNext();
              }}
              className="cursor-pointer hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 w-12 h-12 items-center justify-center rounded-full bg-zinc-900/70 border border-zinc-700 text-white hover:bg-zinc-800/90 duration-300 active:scale-95"
              aria-label="Next image"
            >
              <SvgIcon className="w-7 h-7 fill-white" id="IC-chevron-right" />
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
