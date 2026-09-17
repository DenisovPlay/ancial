'use client';

import React, { type CSSProperties, useEffect, useRef } from 'react';
import { normalizeText } from './player-utils';
import { cn } from '../../lib/cn';

/**
 * Часы для текста песни. Обычно это само аудио, но когда звук идёт на другом устройстве —
 * подставляем часы удалённого воспроизведения: интерфейс у них одинаковый.
 */
export type PulseLyricsClock = {
  addEventListener(type: string, listener: () => void): void;
  currentTime: number;
  paused: boolean;
  removeEventListener(type: string, listener: () => void): void;
};

export type PulseLyricsLine = {
  text: string;
  time: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Parses LRC or plain text lyrics into timestamped lines. */
export function parseLyricsText(value: string): PulseLyricsLine[] {
  if (!value || typeof value !== 'string') return [];

  // Remove UTF-8 BOM if present
  let cleanValue = value.replace(/^\uFEFF/, '').trim();

  // If JSON encoded, extract text field
  if (cleanValue.startsWith('{')) {
    try {
      const parsed = JSON.parse(cleanValue);
      cleanValue = parsed.lyrics || parsed.text || parsed.lrc || cleanValue;
    } catch { /* ignore */ }
  }

  // Convert HTML breaks to newlines & strip HTML tags if present
  cleanValue = cleanValue
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '');

  const rawLines = cleanValue.split(/\r\n|\n/);
  const lyricPattern = /^\s*\[(\d+):(\d+(?:\.\d+)?)\](.*)/;

  const lines: PulseLyricsLine[] = [];

  rawLines.forEach((line) => {
    const match = line.match(lyricPattern);
    if (!match) return;

    const minutes = Number.parseInt(match[1], 10);
    const seconds = Number.parseFloat(match[2]);
    const time = minutes * 60 + seconds;
    const text = normalizeText(match[3]);
    if (!text) return;

    lines.push({ text, time });
  });

  if (lines.length > 0) {
    lines.sort((left, right) => left.time - right.time);

    if (lines[0].time > 0.5) {
      lines.unshift({ text: '♪', time: 0 });
    }

    return lines;
  }

  // Fallback: If UniLyrics returned plain text without LRC timestamps
  const plainLines = rawLines
    .map((l) => normalizeText(l))
    .filter((l) => l.length > 0 && !l.startsWith('[') && !l.startsWith('{'));

  if (plainLines.length > 0) {
    const generatedLines: PulseLyricsLine[] = [{ text: '♪', time: 0 }];
    plainLines.forEach((text, i) => {
      generatedLines.push({ text, time: (i + 1) * 3.5 });
    });
    return generatedLines;
  }

  return [];
}

export function getActiveLyricState(lines: PulseLyricsLine[], currentTime: number) {
  let activeIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].time <= currentTime + 0.2) {
      activeIndex = index;
      continue;
    }
    break;
  }

  if (activeIndex < 0) {
    return {
      activeIndex: -1,
      progress: 0,
    };
  }

  const currentLine = lines[activeIndex];
  const nextLine = lines[activeIndex + 1];
  const duration = Math.max(0.1, (nextLine?.time ?? currentLine.time + 4) - currentLine.time - 0.5);
  const progress = clamp((currentTime - currentLine.time) / duration, 0, 1);

  return {
    activeIndex,
    progress,
  };
}

export function splitLyricText(text: string) {
  let backText = '';
  const mainText = text.replace(/\(([^)]*)\)/g, (_, value: string) => {
    backText += `${value} `;
    return '';
  }).trim();

  return {
    backText: normalizeText(backText),
    mainText: normalizeText(mainText) || '♪',
  };
}

function renderLyricWords(text: string) {
  const words = text.split(' ').filter(Boolean);
  if (!words.length) {
    return <span>{text}</span>;
  }

  // Заливка слов считается в CSS из --lyric-p строки: кадры анимации не трогают React.
  return words.map((word, wordIndex) => (
    <React.Fragment key={`${word}:${wordIndex}`}>
      <span className="pulse-lyric-word" style={{ '--i': wordIndex, '--n': words.length } as CSSProperties}>
        {word}
      </span>
      {wordIndex < words.length - 1 ? ' ' : null}
    </React.Fragment>
  ));
}

/**
 * Собственные часы текста: rAF крутится только пока компонент смонтирован и трек играет.
 * React перерисовывается лишь при смене строки, прогресс внутри строки пишется в CSS-переменную.
 */
function useActiveLyric<T extends HTMLElement>(
  audioRef: React.RefObject<PulseLyricsClock | null>,
  lines: PulseLyricsLine[],
  initialIndex = -1,
) {
  const [activeIndex, setActiveIndex] = React.useState(initialIndex);
  const activeLineRef = useRef<T | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || lines.length === 0) return undefined;

    let loopFrame: number | null = null;
    let onceFrame: number | null = null;
    let lastIndex = Number.NaN;

    const sync = () => {
      const { activeIndex: nextIndex, progress } = getActiveLyricState(lines, audio.currentTime);
      const changed = nextIndex !== lastIndex;
      if (changed) {
        lastIndex = nextIndex;
        setActiveIndex(nextIndex);
      }
      activeLineRef.current?.style.setProperty('--lyric-p', progress.toFixed(4));
      return changed;
    };

    const startLoop = () => {
      if (loopFrame !== null) return;
      loopFrame = requestAnimationFrame(function tick() {
        sync();
        loopFrame = requestAnimationFrame(tick);
      });
    };

    const stopLoop = () => {
      if (loopFrame === null) return;
      cancelAnimationFrame(loopFrame);
      loopFrame = null;
    };

    // На паузе: разовая синхронизация; сменилась строка — ещё кадр, когда ref уже на новой строке.
    const syncWhilePaused = () => {
      if (onceFrame !== null) return;
      onceFrame = requestAnimationFrame(function once() {
        onceFrame = null;
        if (sync()) onceFrame = requestAnimationFrame(once);
      });
    };

    if (audio.paused) syncWhilePaused();
    else startLoop();

    audio.addEventListener('play', startLoop);
    audio.addEventListener('pause', stopLoop);
    audio.addEventListener('ended', stopLoop);
    audio.addEventListener('seeked', syncWhilePaused);

    return () => {
      stopLoop();
      if (onceFrame !== null) cancelAnimationFrame(onceFrame);
      audio.removeEventListener('play', startLoop);
      audio.removeEventListener('pause', stopLoop);
      audio.removeEventListener('ended', stopLoop);
      audio.removeEventListener('seeked', syncWhilePaused);
    };
  }, [audioRef, lines]);

  return { activeIndex, activeLineRef };
}

/** Mobile overlay lyrics displayed on top of artwork. */
export function PulseLyricsMobile({
  audioRef,
  expandLabel,
  leaving = false,
  lines,
  onExpand,
}: {
  audioRef: React.RefObject<PulseLyricsClock | null>;
  expandLabel: string;
  leaving?: boolean;
  lines: PulseLyricsLine[];
  onExpand: (activeIndex: number) => void;
}) {
  const { activeIndex, activeLineRef } = useActiveLyric<HTMLSpanElement>(audioRef, lines);
  const activeLine = activeIndex >= 0 ? lines[activeIndex] : undefined;
  const lyric = activeLine ? splitLyricText(activeLine.text) : null;
  const mainText = lyric?.mainText || '♪';
  const backText = lyric?.backText || '';

  // Подложку с блюром держит родитель: при смене режима она не мигает, меняется только контент.
  return (
    <button
      type="button"
      onClick={() => onExpand(activeIndex)}
      title={expandLabel}
      className={cn(
        'absolute inset-0 flex cursor-pointer flex-col items-center justify-center p-3 text-left',
        leaving ? 'pulse-lyrics-line-out pointer-events-none' : 'pulse-lyrics-line-in',
      )}
    >
      <div className="relative flex min-h-[140px] w-full flex-col items-center justify-center text-center text-zinc-100 drop-shadow-lg">
        <div key={`lyric-${activeIndex}-${mainText}`} className="pulse-mobile-lyric-enter flex flex-col items-center justify-center px-3">
          <span ref={activeLineRef} className="pulse-lyric-line is-active block text-2xl font-bold leading-tight">
            {renderLyricWords(mainText)}
          </span>
          {backText ? (
            <span className="mt-3 block text-sm font-semibold text-white/60">
              ({backText})
            </span>
          ) : null}
        </div>
      </div>

      <span className="absolute bottom-3 flex items-center gap-1.5 rounded-full border border-zinc-600/30 bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-300">
        {expandLabel}
      </span>
    </button>
  );
}

const PulseLyricLine = React.memo(
  React.forwardRef<HTMLButtonElement, {
    className?: string;
    isActive: boolean;
    line: PulseLyricsLine;
    onSeek: (time: number) => void;
    style?: CSSProperties;
  }>(function PulseLyricLine({ className, isActive, line, onSeek, style }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={() => onSeek(line.time)}
        className={cn(
          'pulse-lyric-line block cursor-pointer py-1.5 text-center text-white/40 duration-300',
          isActive && 'is-active scale-[1.03] text-white',
          !isActive && 'hover:text-white/70',
          className,
        )}
        style={{
          ...style,
          textShadow: isActive ? '0 0 18px rgba(255,255,255,0.2)' : undefined,
          transformOrigin: 'center',
        }}
      >
        {renderLyricWords(line.text)}
      </button>
    );
  }),
  (prevProps, nextProps) => prevProps.isActive === nextProps.isActive && prevProps.line === nextProps.line,
);

/** Автопрокрутка к активной строке с паузой, пока пользователь листает сам. */
function useLyricsAutoScroll(activeIndex: number, activeLineRef: React.RefObject<HTMLElement | null>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const userScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const hasPositionedRef = useRef(false);

  // Layout-эффект и мгновенная первая прокрутка: список появляется уже на текущей строке,
  // без проезда от начала через весь текст.
  React.useLayoutEffect(() => {
    if (!containerRef.current || !activeLineRef.current || userScrollingRef.current) return;

    const container = containerRef.current;
    const activeLine = activeLineRef.current;
    const targetTop = activeLine.offsetTop - container.clientHeight / 2 + activeLine.clientHeight / 2;

    container.scrollTo({
      behavior: hasPositionedRef.current ? 'smooth' : 'auto',
      top: Math.max(0, targetTop),
    });
    hasPositionedRef.current = true;
  }, [activeIndex, activeLineRef]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current !== null) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleUserScroll = () => {
    userScrollingRef.current = true;

    if (scrollTimeoutRef.current !== null) {
      window.clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      userScrollingRef.current = false;
      scrollTimeoutRef.current = null;
    }, 3000);
  };

  return { containerRef, handleUserScroll };
}

const SHEET_STAGGER_RADIUS = 8;
const SHEET_STAGGER_STEP_MS = 40;

/** Полный текст на телефоне: список всех строк с перемоткой по тапу. */
export function PulseLyricsMobileSheet({
  audioRef,
  initialIndex = -1,
  leaving = false,
  lines,
  onSeek,
}: {
  audioRef: React.RefObject<PulseLyricsClock | null>;
  initialIndex?: number;
  leaving?: boolean;
  lines: PulseLyricsLine[];
  onSeek: (time: number) => void;
}) {
  const { activeIndex, activeLineRef } = useActiveLyric<HTMLButtonElement>(audioRef, lines, initialIndex);
  const { containerRef, handleUserScroll } = useLyricsAutoScroll(activeIndex, activeLineRef);
  // Точка, от которой «раскрывается» список, фиксируется при монтировании.
  const [expandOrigin] = React.useState(Math.max(initialIndex, 0));

  // Маска только на прокручиваемом тексте; подложку с блюром держит родитель.
  return (
    <div
      ref={containerRef}
      onWheel={handleUserScroll}
      onTouchMove={handleUserScroll}
      className={cn(
        'viewport pulse-lyrics-fade absolute inset-0 flex flex-col gap-3 overflow-y-auto overflow-x-hidden px-3 py-24 text-center text-xl font-bold',
        leaving ? 'pulse-lyrics-sheet-out pointer-events-none' : 'pulse-lyrics-line-in',
      )}
    >
      {lines.map((line, lineIndex) => {
        const isActive = lineIndex === activeIndex;
        const distance = Math.abs(lineIndex - expandOrigin);
        // Текущая строка уже на месте — вокруг неё мягко проявляется контекст. Дальние за краем не анимируем.
        const fadesIn = distance > 0 && distance <= SHEET_STAGGER_RADIUS;

        return (
          <PulseLyricLine
            key={`${line.time}:${lineIndex}`}
            ref={isActive ? activeLineRef : null}
            className={fadesIn ? 'pulse-lyrics-context-in' : undefined}
            style={fadesIn ? ({ '--d': `${distance * SHEET_STAGGER_STEP_MS}ms` } as CSSProperties) : undefined}
            isActive={isActive}
            line={line}
            onSeek={onSeek}
          />
        );
      })}
    </div>
  );
}

/** Desktop side panel synchronized lyrics. */
export function PulseLyricsDesktop({
  audioRef,
  leaving = false,
  lines,
  onSeek,
}: {
  audioRef: React.RefObject<PulseLyricsClock | null>;
  leaving?: boolean;
  lines: PulseLyricsLine[];
  onSeek: (time: number) => void;
}) {
  const { activeIndex, activeLineRef } = useActiveLyric<HTMLButtonElement>(audioRef, lines);
  const { containerRef, handleUserScroll } = useLyricsAutoScroll(activeIndex, activeLineRef);

  return (
    <div
      className={cn(
        'flex h-full shrink-0 lg:w-[420px] xl:w-[480px] 2xl:w-[540px]',
        leaving ? 'pulse-lyrics-panel-out pointer-events-none' : 'pulse-lyrics-panel-in',
      )}
    >
      <div className="relative h-full w-full">
        <div
          ref={containerRef}
          onWheel={handleUserScroll}
          onTouchMove={handleUserScroll}
          className="viewport pulse-lyrics-fade flex h-full w-full flex-col gap-3 overflow-y-auto overflow-x-hidden px-3 py-32 text-center text-2xl font-bold lg:text-3xl"
        >
          {lines.map((line, lineIndex) => {
            const isActive = lineIndex === activeIndex;

            return (
              <PulseLyricLine
                key={`${line.time}:${lineIndex}`}
                ref={isActive ? activeLineRef : null}
                isActive={isActive}
                line={line}
                onSeek={onSeek}
              />
            );
          })}
          <div className="h-[45vh] shrink-0"></div>
        </div>
      </div>
    </div>
  );
}
