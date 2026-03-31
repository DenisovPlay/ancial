'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  align?: 'responsive' | 'center';
  animation?: 'sheet' | 'fade';
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  swipeable?: boolean;
  width?: 'sm' | 'md' | 'lg' | 'full';
  bodyClassName?: string;
  overlayClassName?: string;
  panelClassName?: string;
  showHeader?: boolean;
  unstyled?: boolean;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

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
}: ModalProps) {
  const [offsetY, setOffsetY] = useState(0);
  const [render, setRender] = useState(isOpen);
  const [visible, setVisible] = useState(false);
  const startY = useRef<number | null>(null);

  // Блокировка прокрутки фона при открытом окне и управление анимацией
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (isOpen) {
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

    document.body.style.overflow = '';

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
      document.body.style.overflow = '';
    };
  }, []);

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  const widthClasses = {
    sm: 'w-full sm:w-[500px]',
    md: 'w-full sm:w-[700px]',
    lg: 'w-full sm:w-[900px]',
    full: 'w-full',
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
        className={cn(
          widthClasses[width],
          'max-h-[90vh] flex flex-col transition-all ease-out duration-300 relative overflow-hidden',
          !unstyled && 'bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl',
          animationClasses,
          panelClassName,
        )}
        style={{ 
          transform: offsetY > 0 ? `translateY(${offsetY}px)` : undefined,
          transition: offsetY === 0 ? 'all 0.3s cubic-bezier(0.32, 0.72, 0, 1)' : 'none' 
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {showHeader && (
          <div className="absolute inset-x-0 top-0 flex flex-col items-center border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-lg backdrop-saturate-200 z-[999]">
              {swipeable && (
              <div className="w-full flex justify-center pt-3 sm:hidden cursor-grab active:cursor-grabbing">
                  <div className="w-12 h-1.5 bg-zinc-700 rounded-full" />
              </div>
              )}
              
              <div className="flex items-center justify-between p-3 border-b border-zinc-800/50 w-full">
                  <h2 className="text-xl font-bold text-white">{title}</h2>
                  <button 
                      onClick={onClose}
                      className="cursor-pointer hidden sm:flex p-1.5 rounded-full border border-transparent hover:bg-zinc-800/50 hover:border-zinc-600/30 duration-300 active:scale-95"
                  >
                      <svg className="w-5 h-5 fill-zinc-300" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <use href="/icons.svg#IC-times"></use>
                      </svg>
                  </button>
              </div>
          </div>
        )}
        <div
          className={cn(
            'overflow-y-auto',
            showHeader ? 'p-3 pt-[84px] lg:pt-[72px]' : 'p-0',
            bodyClassName,
          )}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
