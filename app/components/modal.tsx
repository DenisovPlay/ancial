'use client';

import React, { useEffect, useId, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  align?: 'responsive' | 'center';
  animation?: 'sheet' | 'fade';
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  swipeable?: boolean;
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  bodyClassName?: string;
  overlayClassName?: string;
  panelClassName?: string;
  showHeader?: boolean;
  unstyled?: boolean;
  closeLabel?: string;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const MODAL_WIDTH_CLASSES = {
  sm: 'w-full sm:w-[500px]',
  md: 'w-full sm:w-[700px]',
  lg: 'w-full sm:w-[900px]',
  xl: 'w-full sm:w-[1180px]',
  full: 'w-full',
} as const;

export default function Modal({
  align = 'responsive',
  animation = 'sheet',
  isOpen,
  onClose,
  title,
  children,
  swipeable = true,
  width = 'sm',
  bodyClassName,
  overlayClassName,
  panelClassName,
  showHeader = true,
  unstyled = false,
  closeLabel = 'Close',
}: ModalProps) {
  const [offsetY, setOffsetY] = useState(0);
  const [render, setRender] = useState(isOpen);
  const [visible, setVisible] = useState(false);
  const startY = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const overflowBeforeOpenRef = useRef('');
  const titleId = useId();

  // Блокировка прокрутки фона при открытом окне и управление анимацией
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      overflowBeforeOpenRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      let visibleFrame = 0;
      const renderFrame = requestAnimationFrame(() => {
        setRender(true);
        visibleFrame = requestAnimationFrame(() => {
          setVisible(true);
        });
      });

      return () => {
        cancelAnimationFrame(renderFrame);
        cancelAnimationFrame(visibleFrame);
      };
    }

    document.body.style.overflow = overflowBeforeOpenRef.current;
    previouslyFocusedElementRef.current?.focus();

    const frame = requestAnimationFrame(() => {
      setVisible(false);
    });

    // Ждем окончания анимации (300ms) перед тем как убрать компонент из DOM
    const timer = setTimeout(() => {
      setRender(false);
      setOffsetY(0);
    }, 300);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    return () => {
      document.body.style.overflow = overflowBeforeOpenRef.current;
      previouslyFocusedElementRef.current?.focus();
    };
  }, []);

  // Закрытие по Escape
  useEffect(() => {
    const focusableElements = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const elements = focusableElements();
      if (elements.length === 0) {
        e.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !render || !visible) return;
    const focusFrame = requestAnimationFrame(() => {
      const focusableElements = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? []).filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
      (focusableElements[0] ?? panelRef.current)?.focus();
    });
    return () => cancelAnimationFrame(focusFrame);
  }, [isOpen, render, visible]);

  if (typeof document === 'undefined' || !render) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!swipeable) return;
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeable || startY.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    // Свайп только вниз
    if (diff > 0) {
      setOffsetY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (!swipeable || startY.current === null) return;
    
    // Если свайпнули больше чем на 100px - закрываем модалку
    if (offsetY > 100) {
      onClose();
    }
    
    // Сбрасываем смещение
    setOffsetY(0);
    startY.current = null;
  };

  const alignmentClasses =
    align === 'center' ? 'items-center' : 'items-end sm:items-center';

  const animationClasses =
    animation === 'fade'
      ? visible
        ? 'translate-y-0 scale-100 opacity-100'
        : 'translate-y-4 scale-95 opacity-0'
      : visible
        ? 'translate-y-0 sm:scale-100 opacity-100'
        : 'translate-y-full sm:translate-y-8 sm:scale-95 opacity-0';

  const hasRenderedTitle = showHeader && Boolean(title);

  const modalContent = (
    <div 
      className={cn(
        'fixed inset-0 z-[9999] flex justify-center bg-zinc-950/80 backdrop-blur-sm transition-opacity duration-300 ease-out',
        alignmentClasses,
        visible ? 'opacity-100' : 'opacity-0',
        overlayClassName,
      )}
      onClick={onClose}
    >
      <div 
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={hasRenderedTitle ? titleId : undefined}
        aria-label={hasRenderedTitle ? undefined : (title || closeLabel)}
        tabIndex={-1}
        className={cn(
          MODAL_WIDTH_CLASSES[width],
          'max-h-[90dvh] flex flex-col transition-[transform,opacity] ease-out duration-300 relative overflow-hidden outline-none',
          !unstyled && 'bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl',
          animationClasses,
          panelClassName,
        )}
        style={{ 
          transform: offsetY > 0 ? `translateY(${offsetY}px)` : undefined,
          transition: offsetY === 0 ? 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)' : 'none'
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {showHeader && (
          <div className="absolute inset-x-0 top-0 flex flex-col items-center bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-transparent z-[999]">
              {swipeable && (
              <div className="w-full flex justify-center pt-3 sm:hidden cursor-grab active:cursor-grabbing">
                  <div className="w-12 h-1.5 bg-zinc-700 rounded-full" />
              </div>
              )}
              
              <div className="flex items-center justify-between px-3 pb-3 sm:pt-3 w-full">
                  <h2 id={titleId} className="text-xl font-bold text-white backdrop-shadow-lg">{title}</h2>
                  <button 
                      type="button"
                      aria-label={closeLabel}
                      onClick={onClose}
                      className="cursor-pointer hidden sm:flex p-1.5 rounded-full border border-transparent hover:bg-zinc-800/50 hover:border-zinc-600/30 duration-300 active:scale-95"
                  >
                      <svg className="w-5 h-5 fill-zinc-300" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <use href="#IC-times"></use>
                      </svg>
                  </button>
              </div>
          </div>
        )}
        <div
          className={cn(
            'overflow-y-auto overflow-x-hidden',
            showHeader ? 'p-3 pt-[64px]' : 'p-0',
            bodyClassName,
          )}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
