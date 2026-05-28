'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type NoteType = 'success' | 'error' | 'info';
const NOTE_STACK_GAP_PX = 8;
const NOTE_ENTER_ANIMATION_MS = 280;
const NOTE_EXIT_ANIMATION_MS = 260;
const NOTE_HEIGHT_ANIMATION_MS = 320;

interface Note {
  id: number;
  content: React.ReactNode;
  html?: boolean;
  type: NoteType;
  time?: number; // в секундах
}

interface NotificationContextType {
  showNote: (note: Omit<Note, 'id'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

type NotificationToastProps = {
  note: Note;
  onRemove: (id: number) => void;
};

const NotificationToast = ({ note, onRemove }: NotificationToastProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const measureFrameRef = useRef<number | undefined>(undefined);
  const enterFrameRef = useRef<number | undefined>(undefined);
  const visibleFrameRef = useRef<number | undefined>(undefined);
  const closeTimerRef = useRef<number | undefined>(undefined);
  const removeTimerRef = useRef<number | undefined>(undefined);
  const isClosingRef = useRef(false);

  const updateHeight = useCallback(() => {
    const nextHeight = contentRef.current?.getBoundingClientRect().height ?? 0;
    setContentHeight(nextHeight);
  }, []);

  const finishRemoval = useCallback(() => {
    onRemove(note.id);
  }, [note.id, onRemove]);

  const startClosing = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    if (enterFrameRef.current !== undefined) {
      cancelAnimationFrame(enterFrameRef.current);
      enterFrameRef.current = undefined;
    }

    if (visibleFrameRef.current !== undefined) {
      cancelAnimationFrame(visibleFrameRef.current);
      visibleFrameRef.current = undefined;
    }

    if (closeTimerRef.current !== undefined) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }

    updateHeight();
    setIsVisible(false);

    removeTimerRef.current = window.setTimeout(
      finishRemoval,
      Math.max(NOTE_EXIT_ANIMATION_MS, NOTE_HEIGHT_ANIMATION_MS),
    );
  }, [finishRemoval, updateHeight]);

  useEffect(() => {
    const noteLifetime = note.time ?? 0;

    measureFrameRef.current = requestAnimationFrame(() => {
      updateHeight();
      visibleFrameRef.current = requestAnimationFrame(() => {
        if (!isClosingRef.current) {
          setIsVisible(true);
        }
      });
    });

    enterFrameRef.current = measureFrameRef.current;

    if (noteLifetime > 0) {
      closeTimerRef.current = window.setTimeout(startClosing, noteLifetime * 1000);
    }

    return () => {
      if (measureFrameRef.current !== undefined) cancelAnimationFrame(measureFrameRef.current);
      if (enterFrameRef.current !== undefined) cancelAnimationFrame(enterFrameRef.current);
      if (visibleFrameRef.current !== undefined) cancelAnimationFrame(visibleFrameRef.current);
      if (closeTimerRef.current !== undefined) window.clearTimeout(closeTimerRef.current);
      if (removeTimerRef.current !== undefined) window.clearTimeout(removeTimerRef.current);
    };
  }, [note.time, startClosing, updateHeight]);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || !contentRef.current) {
      const frame = requestAnimationFrame(() => {
        updateHeight();
      });

      return () => {
        cancelAnimationFrame(frame);
      };
    }

    const observer = new ResizeObserver(() => {
      if (!isClosingRef.current) {
        updateHeight();
      }
    });

    observer.observe(contentRef.current);

    return () => {
      observer.disconnect();
    };
  }, [updateHeight]);

  const toneClassName =
    note.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100' :
    note.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-100' :
    'bg-zinc-800/80 border-zinc-600/50 text-zinc-100';

  const shellStyle: React.CSSProperties = {
    height: isVisible ? `${contentHeight + NOTE_STACK_GAP_PX}px` : '0px',
    overflow: 'hidden',
    pointerEvents: isVisible ? 'auto' : 'none',
    transition: `height ${NOTE_HEIGHT_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  };

  const cardStyle: React.CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'scale(1)' : 'scale(0.96)',
    transformOrigin: 'top right',
    transition: `opacity ${Math.max(NOTE_ENTER_ANIMATION_MS, NOTE_EXIT_ANIMATION_MS)}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${Math.max(NOTE_ENTER_ANIMATION_MS, NOTE_EXIT_ANIMATION_MS)}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    willChange: 'opacity, transform',
    marginBottom: `${NOTE_STACK_GAP_PX}px`,
  };

  return (
    <div style={shellStyle}>
      <div
        ref={contentRef}
        className={`pointer-events-auto flex items-center justify-between p-3 min-w-[250px] max-w-sm shadow-xl rounded-3xl backdrop-blur-md border will-change-transform ${toneClassName}`}
        role="status"
        style={cardStyle}
      >
        {note.html && typeof note.content === 'string' ? (
          <span
            className="font-medium text-sm sm:text-base leading-tight break-words [&_a]:underline [&_a]:underline-offset-2"
            dangerouslySetInnerHTML={{ __html: note.content }}
          />
        ) : (
          <span className="font-medium text-sm sm:text-base leading-tight break-words">
            {note.content}
          </span>
        )}
        <button onClick={startClosing} className="ml-3 cursor-pointer p-1 opacity-60 hover:opacity-100 transition-opacity">
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <use href={`#IC-times`}></use>
          </svg>
        </button>
      </div>
    </div>
  );
};

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showNote = useCallback(({ content, html = false, type = 'info', time = 5 }: Omit<Note, 'id'>) => {
    const id = Date.now() + Math.random();
    setNotes((prev) => [...prev, { id, content, html, type, time }]);
  }, []);

  const removeNote = useCallback((id: number) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNote }}>
      {children}
      {mounted
        ? createPortal(
            <div
              className="fixed top-4 right-4 z-[10010] flex flex-col pointer-events-none"
              aria-live="polite"
              aria-atomic="true"
            >
              {notes.map((note) => (
                <NotificationToast
                  key={note.id}
                  note={note}
                  onRemove={removeNote}
                />
              ))}
            </div>,
            document.body,
          )
        : null}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};
