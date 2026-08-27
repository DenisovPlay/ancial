'use client';

import React, { type CSSProperties, useEffect, useRef } from 'react';
import { normalizeText } from './player-utils';

export type PulseLyricsLine = {
  text: string;
  time: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
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

function renderLyricWords(text: string, progress: number, isActive: boolean) {
  const words = text.split(' ').filter(Boolean);
  if (!words.length) {
    return <span>{text}</span>;
  }

  const currentWordProgress = progress * words.length;

  return words.map((word, wordIndex) => {
    let fill = 0;

    if (isActive) {
      if (wordIndex < currentWordProgress - 1) {
        fill = 100;
      } else if (wordIndex > currentWordProgress) {
        fill = 0;
      } else {
        fill = clamp((currentWordProgress - wordIndex) * 100, 0, 100);
      }
    }

    const fillVal = fill.toFixed(1);

    const style: CSSProperties | undefined = isActive
      ? {
        backgroundImage: `linear-gradient(90deg, #ffffff ${fillVal}%, rgba(255,255,255,0.4) ${fillVal}%)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
      }
      : undefined;

    return (
      <React.Fragment key={`${word}:${wordIndex}`}>
        <span style={style}>{word}</span>
        {wordIndex < words.length - 1 ? ' ' : null}
      </React.Fragment>
    );
  });
}

/** Mobile overlay lyrics displayed on top of artwork. */
export function PulseLyricsMobile({
  activeIndex,
  lyric,
  progress,
  source,
}: {
  activeIndex: number;
  lyric: ReturnType<typeof splitLyricText> | null;
  progress: number;
  source: string;
}) {
  const mainText = lyric?.mainText || '♪';
  const backText = lyric?.backText || '';

  return (
    <div className="animate-opacity-fade-in absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-zinc-900/80 p-4 backdrop-blur-md backdrop-saturate-200 lg:hidden">
      <div className="relative flex min-h-[140px] w-full flex-col items-center justify-center text-center text-zinc-100 drop-shadow-lg">
        <div key={`lyric-${activeIndex}-${mainText}`} className="animate-smooth-appear flex flex-col items-center justify-center px-2">
          <span className="block text-2xl font-bold leading-tight">
            {renderLyricWords(mainText, progress, true)}
          </span>
          {backText ? (
            <span className="mt-2 block text-sm font-semibold text-white/60">
              ({backText})
            </span>
          ) : null}
        </div>
      </div>

      {source ? (
        <span className="hidden absolute bottom-3 text-center text-xs text-zinc-500">
          Источник: {source}
        </span>
      ) : null}
    </div>
  );
}

const PulseLyricLineDesktop = React.memo(
  React.forwardRef<HTMLButtonElement, {
    isActive: boolean;
    line: PulseLyricsLine;
    onSeek: (time: number) => void;
    progress: number;
  }>(function PulseLyricLineDesktop({ isActive, line, onSeek, progress }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={() => onSeek(line.time)}
        className={cn(
          'block cursor-pointer py-1.5 text-center text-white/40 duration-300',
          isActive && 'pointer-events-none scale-[1.03] text-white',
          !isActive && 'hover:text-white/70',
        )}
        style={{
          textShadow: isActive ? '0 0 18px rgba(255,255,255,0.2)' : undefined,
          transformOrigin: 'center',
        }}
      >
        {renderLyricWords(line.text, isActive ? progress : 0, isActive)}
      </button>
    );
  }),
  (prevProps, nextProps) => {
    return (
      prevProps.isActive === nextProps.isActive &&
      prevProps.progress === nextProps.progress &&
      prevProps.line === nextProps.line
    );
  },
);

/** Desktop side panel synchronized lyrics. */
export function PulseLyricsDesktop({
  activeIndex,
  lines,
  onSeek,
  progress,
}: {
  activeIndex: number;
  lines: PulseLyricsLine[];
  onSeek: (time: number) => void;
  progress: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLButtonElement | null>(null);
  const userScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current || !activeLineRef.current || userScrollingRef.current) return;

    const container = containerRef.current;
    const activeLine = activeLineRef.current;
    const targetTop = activeLine.offsetTop - container.clientHeight / 2 + activeLine.clientHeight / 2;

    container.scrollTo({
      behavior: 'smooth',
      top: Math.max(0, targetTop),
    });
  }, [activeIndex]);

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

  return (
    <div className="animate-opacity-fade-in hidden h-full lg:flex lg:ml-12 lg:w-[500px] xl:w-[600px] 2xl:w-[700px] shrink-0">
      <div className="relative h-full w-full">
        <div
          ref={containerRef}
          onWheel={handleUserScroll}
          onTouchMove={handleUserScroll}
          className="viewport flex h-full w-full flex-col gap-4 overflow-y-auto overflow-x-hidden px-3 py-32 text-center text-2xl font-bold lg:text-3xl"
        >
          {lines.map((line, lineIndex) => {
            const isActive = lineIndex === activeIndex;
            const nextProgress = isActive ? progress : 0;

            return (
              <PulseLyricLineDesktop
                key={`${line.time}:${lineIndex}`}
                ref={isActive ? activeLineRef : null}
                isActive={isActive}
                line={line}
                onSeek={onSeek}
                progress={nextProgress}
              />
            );
          })}
          <div className="h-[45vh] shrink-0"></div>
        </div>
      </div>
    </div>
  );
}
