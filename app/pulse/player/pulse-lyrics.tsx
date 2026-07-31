'use client';

import React, {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

export type PulseLyricsLine = {
  text: string;
  time: number;
};

const PLAYER_LYRIC_FILL_TRANSITION_MS = 250;

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').trim();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function parseLyricsText(value: string) {
  const lines: PulseLyricsLine[] = [];
  const rawLines = value.split(/\r\n|\n/);
  const lyricPattern = /^\[(\d+):(\d+(?:\.\d+)?)\](.*)/;

  rawLines.forEach((line) => {
    const match = line.match(lyricPattern);
    if (!match) return;

    const time = Number.parseInt(match[1], 10) * 60 + Number.parseFloat(match[2]);
    const text = normalizeText(match[3]);
    if (!text) return;

    lines.push({ text, time });
  });

  lines.sort((left, right) => left.time - right.time);

  if (lines.length > 0 && lines[0].time > 0.5) {
    lines.unshift({ text: '♪', time: 0 });
  }

  return lines;
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

  if (activeIndex === -1) {
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

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
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

    const isCurrentWordFill = isActive && fill > 0 && fill < 100;
    const style = isActive
      ? ({
        transition: isCurrentWordFill ? `--pulse-lyric-fill ${PLAYER_LYRIC_FILL_TRANSITION_MS}ms linear` : 'none',
        '--pulse-lyric-fill': `${fill}%`,
        backgroundImage: 'linear-gradient(90deg, #ffffff var(--pulse-lyric-fill), rgba(255,255,255,0.4) var(--pulse-lyric-fill))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
      } as CSSProperties)
      : undefined;

    return (
      <React.Fragment key={`${word}:${wordIndex}`}>
        <span style={style}>{word}</span>
        {wordIndex < words.length - 1 ? ' ' : null}
      </React.Fragment>
    );
  });
}

type PulseMobileLyricEntry = {
  activeIndex: number;
  backText: string;
  key: number;
  mainText: string;
  progress: number;
};

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
  const [displayEntry, setDisplayEntry] = useState<PulseMobileLyricEntry | null>(null);
  const [outgoingEntry, setOutgoingEntry] = useState<PulseMobileLyricEntry | null>(null);
  const [displayPhase, setDisplayPhase] = useState<'enter' | 'exit' | 'idle'>('idle');
  const animationFrameRef = useRef<number | null>(null);
  const displayedEntryRef = useRef<PulseMobileLyricEntry | null>(null);
  const enterTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const latestEntryRef = useRef<PulseMobileLyricEntry | null>(null);
  const motionKeyRef = useRef(0);

  const mainText = lyric?.mainText || '♪';
  const backText = lyric?.backText || '';

  useEffect(() => {
    latestEntryRef.current = activeIndex >= 0
      ? {
        activeIndex,
        backText,
        key: motionKeyRef.current,
        mainText,
        progress,
      }
      : null;
  }, [activeIndex, backText, mainText, progress]);

  useEffect(() => {
    if (!displayedEntryRef.current || displayedEntryRef.current.activeIndex !== activeIndex) {
      return;
    }

    displayedEntryRef.current = {
      ...displayedEntryRef.current,
      backText,
      mainText,
      progress,
    };
  }, [activeIndex, backText, mainText, progress]);

  useEffect(() => {
    const clearPendingAnimations = () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      if (enterTimerRef.current !== null) {
        window.clearTimeout(enterTimerRef.current);
        enterTimerRef.current = null;
      }
    };

    const queueStateSync = (callback: () => void) => {
      clearPendingAnimations();
      animationFrameRef.current = window.requestAnimationFrame(() => {
        animationFrameRef.current = null;
        callback();
      });
    };

    const nextEntry = latestEntryRef.current;
    const previousEntry = displayedEntryRef.current;
    const lineChanged = !!nextEntry && (
      !previousEntry
      || previousEntry.activeIndex !== nextEntry.activeIndex
      || previousEntry.mainText !== nextEntry.mainText
      || previousEntry.backText !== nextEntry.backText
    );

    if (!nextEntry) {
      displayedEntryRef.current = null;
      queueStateSync(() => {
        setDisplayEntry(null);
        setOutgoingEntry(null);
        setDisplayPhase('idle');
      });
      return clearPendingAnimations;
    }

    if (!lineChanged) {
      return clearPendingAnimations;
    }

    motionKeyRef.current += 1;
    const enteringEntry: PulseMobileLyricEntry = {
      ...nextEntry,
      key: motionKeyRef.current,
    };

    if (!previousEntry) {
      displayedEntryRef.current = enteringEntry;
      queueStateSync(() => {
        setOutgoingEntry(null);
        setDisplayEntry(enteringEntry);
        setDisplayPhase('enter');
        enterTimerRef.current = window.setTimeout(() => {
          setDisplayPhase('idle');
          enterTimerRef.current = null;
        }, 420);
      });
      return clearPendingAnimations;
    }

    const frozenOutgoingEntry: PulseMobileLyricEntry = {
      ...previousEntry,
      progress: previousEntry.progress,
    };

    queueStateSync(() => {
      setDisplayEntry(null);
      setOutgoingEntry(frozenOutgoingEntry);
      setDisplayPhase('exit');

      exitTimerRef.current = window.setTimeout(() => {
        displayedEntryRef.current = enteringEntry;
        setOutgoingEntry(null);
        setDisplayEntry(enteringEntry);
        setDisplayPhase('enter');
        exitTimerRef.current = null;

        enterTimerRef.current = window.setTimeout(() => {
          setDisplayPhase('idle');
          enterTimerRef.current = null;
        }, 420);
      }, 320);
    });

    return clearPendingAnimations;
  }, [activeIndex, backText, mainText]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
      if (enterTimerRef.current !== null) {
        window.clearTimeout(enterTimerRef.current);
      }
    };
  }, []);

  const visibleEntry = displayEntry;
  const visibleProgress = visibleEntry?.activeIndex === activeIndex ? progress : (visibleEntry?.progress ?? 0);

  return (
    <div className="animate-opacity-fade-in absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-zinc-900/70 p-3 backdrop-blur-sm backdrop-saturate-200 lg:hidden">
      <div className="relative flex h-[180px] w-full items-center justify-center overflow-hidden text-center text-zinc-100 drop-shadow-lg">
        {outgoingEntry ? (
          <div
            key={`mobile-lyric-out-${outgoingEntry.key}-${outgoingEntry.activeIndex}`}
            className="pulse-mobile-lyric-exit absolute inset-x-0 flex flex-col items-center justify-center px-2"
          >
            <span className="block text-2xl font-bold">
              {renderLyricWords(outgoingEntry.mainText, outgoingEntry.progress, true)}
            </span>
            {outgoingEntry.backText ? (
              <span className="mt-1 block text-sm font-semibold text-white/60">
                ({outgoingEntry.backText})
              </span>
            ) : null}
          </div>
        ) : null}

        {visibleEntry ? (
          <div
            key={`mobile-lyric-in-${visibleEntry.key}-${visibleEntry.activeIndex}`}
            className={
              displayPhase === 'enter'
                ? 'pulse-mobile-lyric-enter absolute inset-x-0 flex flex-col items-center justify-center px-2'
                : 'absolute inset-x-0 flex flex-col items-center justify-center px-2'
            }
          >
            <span className="block text-2xl font-bold">
              {renderLyricWords(visibleEntry.mainText, visibleProgress, true)}
            </span>
            {visibleEntry.backText ? (
              <span className="mt-1 block text-sm font-semibold text-white/60">
                ({visibleEntry.backText})
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {source ? (
        <span className="absolute inset-x-0 bottom-0 text-center text-xs text-zinc-500">
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
          'block cursor-pointer py-1 text-center text-white/40 duration-300',
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
  }
);

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
    <div className="animate-opacity-fade-in hidden h-full lg:flex lg:pl-12 xl:pl-24 2xl:pl-32">
      <div className="relative h-full max-w-screen-sm">
        <div
          ref={containerRef}
          onWheel={handleUserScroll}
          onTouchMove={handleUserScroll}
          className="viewport flex h-full flex-col gap-3 overflow-y-auto overflow-x-hidden viewport px-3 py-32 text-center text-3xl font-bold"
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
