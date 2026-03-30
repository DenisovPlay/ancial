'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  swipeable?: boolean;
  width?: 'sm' | 'md' | 'lg';
}

export default function Modal({ isOpen, onClose, title, children, swipeable = true, width = 'sm' }: ModalProps) {
  const [offsetY, setOffsetY] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [render, setRender] = useState(isOpen);
  const [visible, setVisible] = useState(isOpen);
  const startY = useRef<number | null>(null);

  // Для корректной работы с порталами в Next.js
  useEffect(() => {
    setMounted(true);
  }, []);

  // Блокировка прокрутки фона при открытом окне и управление анимацией
  useEffect(() => {
    if (isOpen) {
      setRender(true);
      document.body.style.overflow = 'hidden';
      // Небольшая задержка перед применением классов видимости для срабатывания transition
      const timer = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
      document.body.style.overflow = '';
      // Ждем окончания анимации (300ms) перед тем как убрать компонент из DOM
      const timer = setTimeout(() => {
        setRender(false);
        setOffsetY(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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

  if (!mounted || !render) return null;

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
  };

  const modalContent = (
    <div 
      className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-zinc-950/80 backdrop-blur-sm transition-opacity duration-300 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div 
        className={`${widthClasses[width]} max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col transition-all ease-out duration-300 relative overflow-hidden ${visible ? 'translate-y-0 sm:scale-100 opacity-100' : 'translate-y-full sm:translate-y-8 sm:scale-95 opacity-0'}`}
        style={{ 
          transform: offsetY > 0 ? `translateY(${offsetY}px)` : undefined,
          transition: offsetY === 0 ? 'all 0.3s cubic-bezier(0.32, 0.72, 0, 1)' : 'none' 
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute inset-x-0 top-0 flex flex-col items-center border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-lg backdrop-saturate-200 z-10">
            {/* Индикатор для свайпа на мобильных устройствах */}
            {swipeable && (
            <div className="w-full flex justify-center pt-3 sm:hidden cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1.5 bg-zinc-700 rounded-full" />
            </div>
            )}
            
            {/* Шапка модального окна */}
            <div className="flex items-center justify-between p-3 border-b border-zinc-800/50 w-full">
                <h2 className="text-xl font-bold text-white">{title}</h2>
                <button 
                    onClick={onClose}
                    className="cursor-pointer hidden sm:flex p-1.5 rounded-full border border-transparent hover:bg-zinc-800/50 hover:border-zinc-600/30 duration-300 active:scale-95"
                >
                    <svg className="w-5 h-5 fill-zinc-300" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
        </div>
        {/* Контент с запретом на всплытие событий касания чтобы можно было скроллить контент без закрытия (полезно при длинном тексте) */}
        <div className="p-3 overflow-y-auto pt-[84px] lg:pt-[72px]" onTouchStart={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
