'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../context/AuthContext';
import { isDayTime } from '../weather-model';

function latLonToTileCoords(lat: number, lon: number, zoom: number) {
  const latRad = (lat * Math.PI) / 180;
  const n = 2 ** zoom;
  const x = ((lon + 180) / 360) * n;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

function tileCoordsToLatLon(x: number, y: number, zoom: number) {
  const n = 2 ** zoom;
  const lon = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lat, lon };
}

type WeatherMapContentProps = {
  hideHeaderBackButton?: boolean;
};

export default function WeatherMapContent({ hideHeaderBackButton = false }: WeatherMapContentProps) {
  const { lang, langCode } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const containerRef = useRef<HTMLDivElement | null>(null);

  const initialLat = parseFloat(searchParams.get('lat') || '55.7558');
  const initialLon = parseFloat(searchParams.get('lon') || '37.6173');
  const cityName = searchParams.get('city') || (langCode === 'en' ? 'Weather Map' : 'Карта осадков');
  const cityTemp = searchParams.get('temp');

  const modeParam = searchParams.get('mode');
  const isDay = modeParam ? modeParam === 'day' : isDayTime();

  // Continuous Fractional Inertial Zoom Physics
  const [targetZoom, setTargetZoom] = useState(8.0);
  const [smoothZoom, setSmoothZoom] = useState(8.0);
  const [center, setCenter] = useState({ lat: initialLat, lon: initialLon });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const centerRef = useRef(center);
  useEffect(() => {
    centerRef.current = center;
  }, [center]);

  const smoothZoomRef = useRef(8.0);
  const targetZoomRef = useRef(8.0);
  const zoomAnimFrameRef = useRef<number | null>(null);

  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number; time: number; center: { lat: number; lon: number } } | null>(null);
  const velocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastMoveRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const inertiaAnimRef = useRef<number | null>(null);

  const touchPinchDistRef = useRef<number | null>(null);
  const TILE_SIZE = 256;

  // Smooth lerp animation loop for fractional zoom physics
  useEffect(() => {
    targetZoomRef.current = targetZoom;
  }, [targetZoom]);

  useEffect(() => {
    const loop = () => {
      const diff = targetZoomRef.current - smoothZoomRef.current;
      if (Math.abs(diff) > 0.001) {
        smoothZoomRef.current += diff * 0.14;
        setSmoothZoom(smoothZoomRef.current);
        zoomAnimFrameRef.current = requestAnimationFrame(loop);
      } else if (smoothZoomRef.current !== targetZoomRef.current) {
        smoothZoomRef.current = targetZoomRef.current;
        setSmoothZoom(targetZoomRef.current);
        zoomAnimFrameRef.current = null;
      } else {
        zoomAnimFrameRef.current = null;
      }
    };

    if (Math.abs(targetZoomRef.current - smoothZoomRef.current) > 0.001 && !zoomAnimFrameRef.current) {
      zoomAnimFrameRef.current = requestAnimationFrame(loop);
    }
  }, [targetZoom]);

  const checkAndSnapToMarker = useCallback(() => {
    const baseZ = Math.floor(smoothZoomRef.current);
    const centerT = latLonToTileCoords(centerRef.current.lat, centerRef.current.lon, baseZ);
    const targetT = latLonToTileCoords(initialLat, initialLon, baseZ);
    const pxX = (targetT.x - centerT.x) * TILE_SIZE;
    const pxY = (targetT.y - centerT.y) * TILE_SIZE;

    if (Math.hypot(pxX, pxY) < 140) {
      const newCenter = { lat: initialLat, lon: initialLon };
      centerRef.current = newCenter;
      setCenter(newCenter);
    }
  }, [initialLat, initialLon, TILE_SIZE]);

  const addZoomImpulse = useCallback((delta: number) => {
    checkAndSnapToMarker();
    setTargetZoom((prev) => Math.max(3, Math.min(13, prev + delta)));
  }, [checkAndSnapToMarker]);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/apps/overlay/weather');
    }
  };

  const stopInertia = useCallback(() => {
    if (inertiaAnimRef.current !== null) {
      cancelAnimationFrame(inertiaAnimRef.current);
      inertiaAnimRef.current = null;
    }

    const currentOffset = dragOffsetRef.current;
    if (currentOffset.x !== 0 || currentOffset.y !== 0) {
      const baseZ = Math.floor(smoothZoomRef.current);
      const scale = 2 ** (smoothZoomRef.current - baseZ);
      const currentTileCoords = latLonToTileCoords(centerRef.current.lat, centerRef.current.lon, baseZ);
      const newX = currentTileCoords.x - (currentOffset.x / scale) / TILE_SIZE;
      const newY = currentTileCoords.y - (currentOffset.y / scale) / TILE_SIZE;
      const newCenter = tileCoordsToLatLon(newX, newY, baseZ);

      centerRef.current = newCenter;
      setCenter(newCenter);
      dragOffsetRef.current = { x: 0, y: 0 };
      setDragOffset({ x: 0, y: 0 });
    }
  }, [TILE_SIZE]);

  const handleMouseDown = (e: React.MouseEvent) => {
    stopInertia();
    setIsDragging(true);
    const now = performance.now();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: now,
      center: { ...centerRef.current },
    };
    lastMoveRef.current = { x: e.clientX, y: e.clientY, time: now };
    dragOffsetRef.current = { x: 0, y: 0 };
    setDragOffset({ x: 0, y: 0 });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStartRef.current) return;
    const now = performance.now();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (lastMoveRef.current) {
      const dt = Math.max(1, now - lastMoveRef.current.time);
      velocityRef.current = {
        x: (e.clientX - lastMoveRef.current.x) / dt,
        y: (e.clientY - lastMoveRef.current.y) / dt,
      };
    }
    lastMoveRef.current = { x: e.clientX, y: e.clientY, time: now };

    dragOffsetRef.current = { x: dx, y: dy };
    setDragOffset({ x: dx, y: dy });
  }, []);

  const startInertia = useCallback(() => {
    let vx = velocityRef.current.x * 16;
    let vy = velocityRef.current.y * 16;

    const baseZ = Math.floor(smoothZoomRef.current);
    const scale = 2 ** (smoothZoomRef.current - baseZ);

    if (Math.hypot(vx, vy) < 1) {
      if (dragStartRef.current) {
        const currentTileCoords = latLonToTileCoords(dragStartRef.current.center.lat, dragStartRef.current.center.lon, baseZ);
        const newX = currentTileCoords.x - (dragOffsetRef.current.x / scale) / TILE_SIZE;
        const newY = currentTileCoords.y - (dragOffsetRef.current.y / scale) / TILE_SIZE;
        const newCenter = tileCoordsToLatLon(newX, newY, baseZ);
        centerRef.current = newCenter;
        setCenter(newCenter);
      }
      setDragOffset({ x: 0, y: 0 });
      dragOffsetRef.current = { x: 0, y: 0 };
      dragStartRef.current = null;
      return;
    }

    let currentDx = dragOffsetRef.current.x;
    let currentDy = dragOffsetRef.current.y;

    const step = () => {
      vx *= 0.92;
      vy *= 0.92;

      currentDx += vx;
      currentDy += vy;

      dragOffsetRef.current = { x: currentDx, y: currentDy };
      setDragOffset({ x: currentDx, y: currentDy });

      if (Math.hypot(vx, vy) > 0.3) {
        inertiaAnimRef.current = requestAnimationFrame(step);
      } else {
        if (dragStartRef.current) {
          const currentTileCoords = latLonToTileCoords(dragStartRef.current.center.lat, dragStartRef.current.center.lon, baseZ);
          const newX = currentTileCoords.x - (currentDx / scale) / TILE_SIZE;
          const newY = currentTileCoords.y - (currentDy / scale) / TILE_SIZE;
          const newCenter = tileCoordsToLatLon(newX, newY, baseZ);
          centerRef.current = newCenter;
          setCenter(newCenter);
        }
        setDragOffset({ x: 0, y: 0 });
        dragOffsetRef.current = { x: 0, y: 0 };
        dragStartRef.current = null;
        inertiaAnimRef.current = null;
      }
    };

    inertiaAnimRef.current = requestAnimationFrame(step);
  }, [TILE_SIZE]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    startInertia();
  }, [isDragging, startInertia]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      stopInertia();
      setIsDragging(true);
      touchPinchDistRef.current = null;
      const now = performance.now();
      const touch = e.touches[0];
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: now,
        center: { ...centerRef.current },
      };
      lastMoveRef.current = { x: touch.clientX, y: touch.clientY, time: now };
      dragOffsetRef.current = { x: 0, y: 0 };
      setDragOffset({ x: 0, y: 0 });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchPinchDistRef.current = dist;
    }
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && touchPinchDistRef.current !== null) {
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = newDist / touchPinchDistRef.current;
      touchPinchDistRef.current = newDist;
      const deltaZoom = Math.log2(factor);
      addZoomImpulse(deltaZoom);
      return;
    }

    if (!dragStartRef.current || e.touches.length !== 1) return;
    const now = performance.now();
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartRef.current.x;
    const dy = touch.clientY - dragStartRef.current.y;

    if (lastMoveRef.current) {
      const dt = Math.max(1, now - lastMoveRef.current.time);
      velocityRef.current = {
        x: (touch.clientX - lastMoveRef.current.x) / dt,
        y: (touch.clientY - lastMoveRef.current.y) / dt,
      };
    }
    lastMoveRef.current = { x: touch.clientX, y: touch.clientY, time: now };

    dragOffsetRef.current = { x: dx, y: dy };
    setDragOffset({ x: dx, y: dy });
  }, [addZoomImpulse]);

  const handleTouchEnd = useCallback(() => {
    touchPinchDistRef.current = null;
    if (!isDragging) return;
    setIsDragging(false);
    startInertia();
  }, [isDragging, startInertia]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();
    const handleGlobalTouchMove = (e: TouchEvent) => handleTouchMove(e);
    const handleGlobalTouchEnd = () => handleTouchEnd();

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchmove', handleGlobalTouchMove);
      window.addEventListener('touchend', handleGlobalTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Non-passive wheel event listener to allow wheel preventDefault without browser console warnings
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      stopInertia();
      const zoomDelta = e.deltaY < 0 ? 0.35 : -0.35;
      addZoomImpulse(zoomDelta);
    };

    container.addEventListener('wheel', onWheelNative, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheelNative);
    };
  }, [addZoomImpulse, stopInertia]);

  const baseTileZoom = Math.max(3, Math.min(13, Math.floor(smoothZoom)));
  const fractionalScale = 2 ** (smoothZoom - baseTileZoom);

  const centerTile = latLonToTileCoords(center.lat, center.lon, baseTileZoom);
  const nVal = 2 ** baseTileZoom;

  const tileRange = 5;
  const cXFloor = Math.floor(centerTile.x);
  const cYFloor = Math.floor(centerTile.y);
  const offX = (centerTile.x - cXFloor) * TILE_SIZE;
  const offY = (centerTile.y - cYFloor) * TILE_SIZE;

  const subdomains = ['a', 'b', 'c'];
  const tiles = [];

  for (let dx = -tileRange; dx <= tileRange; dx++) {
    for (let dy = -tileRange; dy <= tileRange; dy++) {
      const tileX = (cXFloor + dx + nVal) % nVal;
      const tileY = cYFloor + dy;

      if (tileY >= 0 && tileY < nVal) {
        const sub = subdomains[Math.abs(tileX + tileY) % 3];
        const isRu = langCode !== 'en';
        const mapTileUrl = isDay
          ? isRu
            ? `https://${sub}.tile.openstreetmap.org/${baseTileZoom}/${tileX}/${tileY}.png`
            : `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${baseTileZoom}/${tileX}/${tileY}.png`
          : `https://${sub}.basemaps.cartocdn.com/dark_all/${baseTileZoom}/${tileX}/${tileY}.png`;

        const precipTileUrl = `https://tile.openweathermap.org/map/precipitation_new/${baseTileZoom}/${tileX}/${tileY}.png?appid=1c503419b342442e86e7eccfc16a85c7`;

        tiles.push({
          key: `t_${baseTileZoom}_dx${dx}_dy${dy}_x${tileX}_y${tileY}`,
          mapTileUrl,
          precipTileUrl,
          left: dx * TILE_SIZE - offX,
          top: dy * TILE_SIZE - offY,
        });
      }
    }
  }

  // Compute marker position on screen from smoothZoom in viewport pixel coordinates
  const currentCenterTileFloat = latLonToTileCoords(center.lat, center.lon, smoothZoom);
  const targetMarkerTileFloat = latLonToTileCoords(initialLat, initialLon, smoothZoom);
  const markerScreenX = (targetMarkerTileFloat.x - currentCenterTileFloat.x) * TILE_SIZE + dragOffset.x;
  const markerScreenY = (targetMarkerTileFloat.y - currentCenterTileFloat.y) * TILE_SIZE + dragOffset.y;

  return (
    <div className="apps-overlay-route no-mobile-nav-padding no-pc-nav-padding relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-zinc-950 select-none isolate">
      {/* Header Bar */}
      {!hideHeaderBackButton && (
        <div className="absolute top-0 inset-x-0 z-[999] flex items-center justify-between p-3 pt-[max(env(safe-area-inset-top),0.75rem)] bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
          <button
            type="button"
            onClick={handleBack}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-600/40 bg-zinc-900/80 text-white font-medium shadow-lg backdrop-blur-md transition-transform active:scale-95 hover:bg-zinc-800 cursor-pointer"
          >
            <svg className="w-5 h-5 fill-none stroke-current stroke-[2.5]" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>{lang?.save ? (langCode === 'en' ? 'Back' : 'Назад') : 'Назад'}</span>
          </button>
        </div>
      )}

      {/* Interactive Canvas Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="relative h-full w-full cursor-grab active:cursor-grabbing overflow-hidden"
      >
        {/* GPU Accelerated Inertial Drag & Continuous Fractional Scale Container */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0px) scale(${fractionalScale})`,
            transformOrigin: 'center center',
            willChange: 'transform',
          }}
        >
          {/* Map Center Tile Grid Layer */}
          <div className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-none z-10">
            {tiles.map((t) => (
              <div
                key={t.key}
                style={{
                  position: 'absolute',
                  left: `${t.left - 0.5}px`,
                  top: `${t.top - 0.5}px`,
                  width: `${TILE_SIZE + 1}px`,
                  height: `${TILE_SIZE + 1}px`,
                }}
                className="relative overflow-hidden"
              >
                {/* Base Map Tile */}
                <img
                  src={t.mapTileUrl}
                  alt=""
                  loading="eager"
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${isDay ? 'brightness-100 contrast-105' : 'brightness-95 contrast-110'}`}
                  draggable={false}
                />
                {/* Precipitation Tile Overlay */}
                <img
                  src={t.precipTileUrl}
                  alt=""
                  loading="eager"
                  className="absolute inset-0 w-full h-full object-cover opacity-85 brightness-125 contrast-200 saturate-200"
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Target City Pin Marker Layer (Fixed Screen Size Viewport Overlay) */}
        <div className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-none z-[100]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const newCenter = { lat: initialLat, lon: initialLon };
              centerRef.current = newCenter;
              setCenter(newCenter);
              setTargetZoom(10);
            }}
            style={{
              position: 'absolute',
              left: `${markerScreenX}px`,
              top: `${markerScreenY}px`,
              transform: 'translate(-50%, -100%)',
            }}
            className="pointer-events-auto flex flex-col items-center cursor-pointer group"
          >
            <div className="flex flex-col items-center transition-transform duration-200 active:scale-95">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-400/60 bg-zinc-950/90 text-white shadow-xl backdrop-blur-md group-hover:border-blue-300 group-hover:bg-blue-950">
                <span className="text-sm font-bold whitespace-nowrap">{cityName}</span>
                {cityTemp !== null && cityTemp !== undefined ? (
                  <span className="text-xs font-medium text-blue-300 ml-0.5">{cityTemp}°</span>
                ) : null}
              </div>
              <div className="w-0.5 h-3 bg-blue-400/80 shadow-md" />
              <div className="relative flex items-center justify-center -mt-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400 ring-2 ring-zinc-950 shadow-lg shadow-blue-500/50" />
                <span className="absolute w-4 h-4 rounded-full bg-blue-400 animate-ping opacity-75 shrink-0 pointer-events-none" />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Map Control Buttons (Zoom In / Out) */}
      <div className="absolute bottom-3 right-3 z-[999] flex flex-col gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            stopInertia();
            addZoomImpulse(0.75);
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-600/40 bg-zinc-900/80 text-white shadow-xl backdrop-blur-md transition-transform active:scale-95 hover:bg-zinc-800 cursor-pointer"
          aria-label="Zoom in"
        >
          <svg className="w-6 h-6 fill-none stroke-current stroke-[2.5]" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => {
            stopInertia();
            addZoomImpulse(-0.75);
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-600/40 bg-zinc-900/80 text-white shadow-xl backdrop-blur-md transition-transform active:scale-95 hover:bg-zinc-800 cursor-pointer"
          aria-label="Zoom out"
        >
          <svg className="w-6 h-6 fill-none stroke-current stroke-[2.5]" viewBox="0 0 24 24">
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
