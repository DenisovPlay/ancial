'use client';

import { useEffect, useRef } from 'react';

import { cn } from '../../lib/cn';
import { effectiveAmp, initialWaveState, rgbCss, stepWave, waveOffset, waveTarget, type WaveState, type WaveTarget } from './wave-motion';

/**
 * Живой фон Вейва: три слоя волн на canvas. Движение задают только метаданные (играет ли, настроение/жанр трека,
 * смена трека) — к <audio> не подключаемся (Web Audio ломал воспроизведение в iOS PWA). Кадры идут, пока блок виден,
 * вкладка открыта и нет «меньше движения»; иначе рисуется один статичный кадр.
 */
const LAYERS = [
  { base: 0.5, depth: 0.2, alpha: 0.34, amp: 1 },
  { base: 0.62, depth: 0.16, alpha: 0.28, amp: 0.8 },
  { base: 0.74, depth: 0.12, alpha: 0.2, amp: 0.6 },
] as const;
const SEGMENTS = 48;

interface Props {
  playing: boolean;
  /** Блок на экране */
  live: boolean;
  mood?: string;
  genre?: string;
  /** Меняется со сменой трека — запускает «перекат» */
  trackKey?: string | number;
  className?: string;
}

function draw(ctx: CanvasRenderingContext2D, width: number, height: number, state: WaveState) {
  ctx.clearRect(0, 0, width, height);
  const amp = effectiveAmp(state);
  LAYERS.forEach((layer, index) => {
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, rgbCss(state.from, layer.alpha));
    gradient.addColorStop(1, rgbCss(state.to, layer.alpha));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let i = 0; i <= SEGMENTS; i++) {
      const x = i / SEGMENTS;
      ctx.lineTo(x * width, height * (layer.base + layer.depth * waveOffset(x, state.phase, index, amp * layer.amp) - 0.08));
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  });
}

export default function WaveBackdrop({ playing, live, mood, genre, trackKey, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetRef = useRef<WaveTarget>(waveTarget({ playing, mood, genre }));
  const stateRef = useRef<WaveState | null>(null);
  const lastTrackRef = useRef(trackKey);

  // Цель и «перекат» — в эффекте (не в рендере): рефы в теле компонента не пишем.
  useEffect(() => {
    targetRef.current = waveTarget({ playing, mood, genre });
  }, [playing, mood, genre]);
  useEffect(() => {
    if (lastTrackRef.current === trackKey) return;
    lastTrackRef.current = trackKey;
    if (stateRef.current && playing) stateRef.current.kick = 1;
  }, [trackKey, playing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const state = stateRef.current ?? (stateRef.current = initialWaveState(targetRef.current));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;
    let running = false;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(ctx, width, height, stateRef.current ?? state);
    };
    const tick = (now: number) => {
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      stateRef.current = stepWave(stateRef.current ?? state, targetRef.current, dt);
      draw(ctx, width, height, stateRef.current);
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (running || reduced || !live || document.visibilityState !== 'visible') return;
      running = true;
      last = 0;
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };
    const onVisibility = () => (document.visibilityState === 'visible' ? start() : stop());

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);
    start();
    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [live]);

  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-[#150d26] to-zinc-950" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
