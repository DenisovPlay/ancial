'use client';

import Link from 'next/link';
import AppImage from './app-image';
import React, { useCallback, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { AncialAPI } from '../lib/api-v2';
import { normalizeAvatarUrl } from '../lib/avatar';
import { useAppearanceMotion } from '../lib/use-appearance';
import { cn } from '../lib/cn';
import { motion, AnimatePresence, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';
import Icon from './svg-icon';

const NavItem = ({
  href,
  icon,
  imgSrc,
  onClick,
  isActive,
  badgeCount,
}: {
  href?: string;
  icon?: string;
  imgSrc?: string;
  onClick?: () => void;
  isActive?: boolean;
  badgeCount?: number;
}) => {
  const pathname = usePathname();
  const active = isActive !== undefined
    ? isActive
    : Boolean(
      href && (
        pathname === href ||
        (href !== '/' && href !== '/cinema' && pathname?.startsWith(`${href}/`))
      ),
    );

  // Отзывчивые эффекты (магнит, блик, «желе») — настройка «Интерфейс → Анимации», не режим стекла.
  const responsive = useAppearanceMotion().nav;

  const itemRef = useRef<HTMLDivElement | null>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawScaleX = useMotionValue(1);
  const rawScaleY = useMotionValue(1);
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  // Press animation values (replaces whileTap — whileTap gets stuck on iOS Safari)
  const pressScaleX = useMotionValue(1);
  const pressScaleY = useMotionValue(1);

  const springX = useSpring(rawX, { stiffness: 420, damping: 22 });
  const springY = useSpring(rawY, { stiffness: 420, damping: 22 });
  const springPressScaleX = useSpring(pressScaleX, { stiffness: 500, damping: 30 });
  const springPressScaleY = useSpring(pressScaleY, { stiffness: 500, damping: 30 });

  const itemSheen = useMotionTemplate`radial-gradient(45px circle at ${mouseX}px ${mouseY}px, rgba(255, 255, 255, 0.20), transparent 70%)`;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!responsive) return;
    const el = itemRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const dx = relX - centerX;
    const dy = relY - centerY;

    mouseX.set(relX);
    mouseY.set(relY);

    rawX.set(Math.max(-2.5, Math.min(2.5, dx * 0.08)));
    rawY.set(Math.max(-2.5, Math.min(2.5, dy * 0.08)));

    const distNorm = Math.min(1, Math.hypot(dx, dy) / Math.max(centerX, centerY));
    rawScaleX.set(1 + distNorm * 0.015);
    rawScaleY.set(1 - distNorm * 0.012);
  };

  const handleMouseLeave = () => {
    if (!responsive) return;
    rawX.set(0);
    rawY.set(0);
    rawScaleX.set(1);
    rawScaleY.set(1);
    mouseX.set(-100);
    mouseY.set(-100);
  };

  const handlePressStart = () => {
    if (!responsive) return;
    pressScaleX.set(1.05);
    pressScaleY.set(0.90);
  };

  const handlePressEnd = () => {
    if (!responsive) return;
    pressScaleX.set(1);
    pressScaleY.set(1);
  };

  const className = `relative overflow-hidden w-14 h-14 ${imgSrc ? `p-0` : `p-1`} cursor-pointer flex items-center justify-center rounded-full border duration-300 ${active
    ? "bg-zinc-700/90 border-zinc-600/30"
    : "hover:bg-zinc-700/95 border-transparent hover:border-zinc-600/30"
    } ${!responsive ? 'active:scale-95' : ''}`;

  const avatarSrc = imgSrc ? normalizeAvatarUrl(imgSrc) : '';

  const innerContent = (
    <>
      {/* Specular sheen inside round NavItem in full glass mode */}
      {responsive && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-0 rounded-full opacity-80"
          style={{ background: itemSheen }}
        />
      )}
      <div className="relative z-10 flex items-center justify-center w-full h-full">
        {avatarSrc ? (
          <AppImage
            src={avatarSrc}
            alt="Avatar"
            width={56}
            height={56}
            preload
            className="w-14 h-14 rounded-full object-cover"
          />
        ) : icon ? (
          <Icon name={icon} className="w-8 h-8 fill-white" />
        ) : null}
      </div>
      {Boolean(badgeCount && badgeCount > 0) && (
        <span className="absolute top-1 right-1 min-w-[18px] h-4.5 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-zinc-900 shadow-md z-20">
          {badgeCount! > 99 ? '99+' : badgeCount}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <motion.div
        ref={itemRef}
        onMouseMove={responsive ? handleMouseMove : undefined}
        onMouseLeave={responsive ? handleMouseLeave : undefined}
        onTouchEnd={responsive ? handleMouseLeave : undefined}
        onTouchCancel={responsive ? handleMouseLeave : undefined}
        onPointerDown={responsive ? handlePressStart : undefined}
        onPointerUp={responsive ? handlePressEnd : undefined}
        onPointerCancel={responsive ? handlePressEnd : undefined}
        onPointerLeave={responsive ? handlePressEnd : undefined}
        style={
          responsive
            ? {
              x: springX,
              y: springY,
              scaleX: springPressScaleX,
              scaleY: springPressScaleY,
            }
            : undefined
        }
      >
        <Link href={href} className={className} onClick={onClick}>
          {innerContent}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={itemRef}
      onMouseMove={responsive ? handleMouseMove : undefined}
      onMouseLeave={responsive ? handleMouseLeave : undefined}
      onTouchEnd={responsive ? handleMouseLeave : undefined}
      onTouchCancel={responsive ? handleMouseLeave : undefined}
      onPointerDown={responsive ? handlePressStart : undefined}
      onPointerUp={responsive ? handlePressEnd : undefined}
      onPointerCancel={responsive ? handlePressEnd : undefined}
      onPointerLeave={responsive ? handlePressEnd : undefined}
      style={
        responsive
          ? {
            x: springX,
            y: springY,
            scaleX: springPressScaleX,
            scaleY: springPressScaleY,
          }
          : undefined
      }
    >
      <button type="button" onClick={onClick} className={className}>
        {innerContent}
      </button>
    </motion.div>
  );
};

/**
 * Анимация появления меню — общая для Dropdown и кастомных выпадашек (селекты, пикеры):
 * пружина с blur при включённых «Интерфейс → Анимации → меню», иначе короткий easeOut.
 */
export function getDropdownMotionProps(responsive: boolean) {
  return {
    initial: { opacity: 0, scale: 0.94, filter: responsive ? 'blur(4px)' : 'none' },
    animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, scale: 0.94, filter: responsive ? 'blur(4px)' : 'none' },
    transition: responsive
      ? { type: 'spring' as const, stiffness: 420, damping: 28, mass: 0.8 }
      : { duration: 0.18, ease: 'easeOut' as const },
  };
}

/**
 * Открытое меню. Motion-значения, пружины и блик живут здесь, а не в Dropdown: закрытых меню
 * на странице сотни (по одному на каждое сообщение чата), и подписки им не нужны.
 */
function DropdownMenuPanel({
  children,
  className,
  responsive,
}: {
  children: React.ReactNode;
  className: string;
  responsive: boolean;
}) {
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Меню не должно уезжать за край экрана: после открытия сдвигаем его по горизонтали
  // внутрь окна с отступом 12px. offsetLeft/offsetWidth не зависят от scale-анимации появления.
  useLayoutEffect(() => {
    const el = menuContainerRef.current;
    if (!el) return;
    const gutter = 12;
    // Шире экрана (min-w-max у width="auto" с длинным текстом) — сужаем, текст переносится.
    const maxWidth = window.innerWidth - gutter * 2;
    if (el.offsetWidth > maxWidth) {
      el.style.minWidth = '0px';
      el.style.maxWidth = `${maxWidth}px`;
    }
    const left = el.getBoundingClientRect().left + (el.getBoundingClientRect().width - el.offsetWidth) / 2;
    const right = left + el.offsetWidth;
    const maxRight = window.innerWidth - gutter;
    let shift = 0;
    if (right > maxRight) shift = maxRight - right;
    if (left + shift < gutter) shift = gutter - left;
    if (shift) el.style.translate = `${shift}px 0`;
  }, []);

  // Liquid glass cursor tracking for menu container
  const mouseX = useMotionValue(-200);
  const mouseY = useMotionValue(-200);

  // Micro magnetic elastic pull on the menu container (max +/- 1.5px)
  const rawMenuX = useMotionValue(0);
  const rawMenuY = useMotionValue(0);
  const menuSpringX = useSpring(rawMenuX, { stiffness: 350, damping: 25 });
  const menuSpringY = useSpring(rawMenuY, { stiffness: 350, damping: 25 });

  const sheenBackground = useMotionTemplate`radial-gradient(140px circle at ${mouseX}px ${mouseY}px, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.01) 40%, transparent 80%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!responsive || !menuContainerRef.current) return;
    const rect = menuContainerRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    mouseX.set(relX);
    mouseY.set(relY);

    // Мягкое микро-смещение меню к курсору (не более 1.5px)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const dx = relX - centerX;
    const dy = relY - centerY;
    rawMenuX.set(Math.max(-1.5, Math.min(1.5, dx * 0.015)));
    rawMenuY.set(Math.max(-1.5, Math.min(1.5, dy * 0.015)));
  };

  const handleMouseLeave = () => {
    if (!responsive) return;
    mouseX.set(-200);
    mouseY.set(-200);
    rawMenuX.set(0);
    rawMenuY.set(0);
  };

  return (
    <motion.div
      ref={menuContainerRef}
      onMouseMove={responsive ? handleMouseMove : undefined}
      onMouseLeave={responsive ? handleMouseLeave : undefined}
      onTouchEnd={responsive ? handleMouseLeave : undefined}
      onTouchCancel={responsive ? handleMouseLeave : undefined}
      {...getDropdownMotionProps(responsive)}
      style={
        responsive
          ? {
            x: menuSpringX,
            y: menuSpringY,
          }
          : undefined
      }
      data-dropdown-menu="true"
      className={className}
    >
      {/* Apple Liquid Glass Specular Sheen (только в режиме "Полное") */}
      {responsive && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-0 rounded-3xl opacity-80"
          style={{
            background: sheenBackground,
          }}
        />
      )}
      {children}
    </motion.div>
  );
}

type DropdownProps = {
  activePaths?: string[];
  align?: 'start' | 'end' | 'center';
  children: React.ReactNode;
  closeOnChildClick?: boolean;
  customTrigger?: React.ReactNode;
  direction?: 'row' | 'col';
  icon?: string;
  imgSrc?: string;
  menuClassName?: string;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  position?: 'left' | 'right' | 'top' | 'bottom';
  renderTrigger?: boolean;
  triggerAriaLabel?: string;
  triggerClassName?: string;
  triggerDisabled?: boolean;
  triggerIcon?: string;
  triggerNode?: React.ReactNode;
  triggerSize?: 'default' | 'sm';
  width?: 'default' | 'auto';
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
};

export const Dropdown = ({
  icon,
  imgSrc,
  position = 'right',
  align = 'start',
  direction = 'col',
  activePaths = [],
  children,
  customTrigger,
  triggerSize = 'default',
  triggerIcon,
  triggerAriaLabel = 'Open menu',
  triggerClassName,
  triggerNode,
  menuClassName,
  width = 'default',
  closeOnChildClick = true,
  onOpenChange,
  open,
  renderTrigger = true,
  triggerDisabled = false,
  wrapperClassName,
  wrapperStyle,
}: DropdownProps) => {
  const pathname = usePathname();
  const [internalOpen, setInternalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isControlled = typeof open === 'boolean';
  const isOpen = isControlled ? open : internalOpen;

  // Эффект Apple Liquid Glass активен эксклюзивно для режима "Полное"
  // Отзывчивые эффекты (магнит, блик, «желе») — настройка «Интерфейс → Анимации», не режим стекла.
  const responsive = useAppearanceMotion().menu;

  const setOpen = useCallback((nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }, [isControlled, onOpenChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, setOpen]);

  // Вычисляем позицию дропдауна относительно кнопки (сверху, снизу, слева, справа)
  const getPositionClasses = () => {
    switch (position) {
      case 'right':
        return `left-full ${align === 'start' ? 'top-0' : align === 'end' ? 'bottom-0' : 'top-1/2 -translate-y-1/2'} ml-3`;
      case 'left':
        return `right-full ${align === 'start' ? 'top-0' : align === 'end' ? 'bottom-0' : 'top-1/2 -translate-y-1/2'} mr-3`;
      case 'top':
        return `bottom-full ${align === 'start' ? 'left-0' : align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2'} mb-3`;
      case 'bottom':
        return `top-full ${align === 'start' ? 'left-0' : align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2'} mt-3`;
      default:
        return 'left-full top-0 ml-3';
    }
  };

  // Вычисляем точку трансформации для красивой анимации вылета
  const getOriginClass = () => {
    if (position === 'right') return align === 'start' ? 'origin-top-left' : align === 'end' ? 'origin-bottom-left' : 'origin-left';
    if (position === 'left') return align === 'start' ? 'origin-top-right' : align === 'end' ? 'origin-bottom-right' : 'origin-right';
    if (position === 'top') return align === 'start' ? 'origin-bottom-left' : align === 'end' ? 'origin-bottom-right' : 'origin-bottom';
    if (position === 'bottom') return align === 'start' ? 'origin-top-left' : align === 'end' ? 'origin-top-right' : 'origin-top';
    return 'origin-center';
  };

  const isActive = activePaths.some(path => pathname === path || pathname?.startsWith(path + '/'));
  const isCompactTrigger = triggerSize === 'sm';
  const compactTriggerIcon = triggerIcon ?? icon ?? 'IC-more';
  const widthClasses =
    direction === 'row'
      ? 'w-max items-center'
      : width === 'auto'
        ? 'w-auto min-w-max items-start'
        : 'w-48';

  // Клик по пункту меню закрывает его (если не отключено) — оборачиваем onClick детей.
  const wrappedChildren = isOpen ? React.Children.map(children, (child) => {
    if (React.isValidElement<{ onClick?: () => void }>(child)) {
      return React.cloneElement(child, {
        onClick: () => {
          if (child.props.onClick) child.props.onClick();
          if (closeOnChildClick) {
            setOpen(false);
          }
        }
      });
    }
    return child;
  }) : null;

  const handleTriggerClick = () => {
    if (triggerDisabled) {
      return;
    }
    setOpen(!isOpen);
  };

  return (
    <div
      className={cn(
        'relative',
        renderTrigger && !isCompactTrigger && (imgSrc ? 'w-auto h-auto' : 'w-14 h-14'),
        wrapperClassName,
      )}
      ref={dropdownRef}
      style={wrapperStyle}
    >
      {customTrigger}
      {renderTrigger && isCompactTrigger ? (
        <button
          type="button"
          onClick={handleTriggerClick}
          aria-label={triggerAriaLabel}
          disabled={triggerDisabled}
          className={cn(
            'flex justify-center items-center cursor-pointer rounded-3xl w-8 h-8 bg-zinc-800/0 hover:bg-zinc-700/80 duration-300 active:scale-95 text-zinc-400',
            triggerDisabled && 'cursor-not-allowed opacity-50',
            triggerClassName,
          )}
        >
          {triggerNode ?? (
            <Icon name={compactTriggerIcon} className="w-5 h-5 fill-white" />
          )}
        </button>
      ) : null}
      {renderTrigger && !isCompactTrigger ? (
        <NavItem
          icon={icon}
          imgSrc={imgSrc}
          onClick={handleTriggerClick}
          isActive={isActive}
        />
      ) : null}
      <AnimatePresence>
        {isOpen && (
          <DropdownMenuPanel
            className={cn(
              'absolute',
              direction === 'col' ? 'overflow-hidden' : 'overflow-visible',
              getPositionClasses(),
              getOriginClass(),
              'p-1',
              direction === 'col' ? 'flex-col rounded-3xl' : 'flex-row rounded-full',
              widthClasses,
              'glass-menu border border-zinc-600/30 shadow-2xl shadow-black/60 flex gap-1 z-50',
              menuClassName,
            )}
            responsive={responsive}
          >
            {direction === 'col' ? (
              <div className="relative z-10 flex flex-col gap-1 w-full">
                {wrappedChildren}
              </div>
            ) : (
              <>{wrappedChildren}</>
            )}
          </DropdownMenuPanel>
        )}
      </AnimatePresence>
    </div>
  );
};

type DropdownItemProps = {
  children?: React.ReactNode;
  className?: string;
  href?: string;
  icon?: string;
  iconClassName?: string;
  iconNode?: React.ReactNode;
  onClick?: () => void;
  badgeCount?: number;
};

export const DropdownItem = ({
  href,
  icon,
  onClick,
  children,
  className,
  iconClassName,
  iconNode,
  badgeCount,
}: DropdownItemProps) => {
  const pathname = usePathname();
  // Подстраницы (/settings/security и т.п.) держат подсветку раздела — как у пилла-аватарки.
  const isActive = href
    ? pathname === href || (href !== '/' && !!pathname?.startsWith(`${href}/`))
    : false;
  const itemRef = useRef<HTMLDivElement | null>(null);

  // Эффект Liquid Glass активен эксклюзивно для режима "Полное"
  // Отзывчивые эффекты (магнит, блик, «желе») — настройка «Интерфейс → Анимации», не режим стекла.
  const responsive = useAppearanceMotion().menu;

  // Magnetic Jelly Physics (сверхмягкая физика, не выходящая за пределы контейнера)
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawScaleX = useMotionValue(1);
  const rawScaleY = useMotionValue(1);
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const springX = useSpring(rawX, { stiffness: 400, damping: 24 });
  const springY = useSpring(rawY, { stiffness: 400, damping: 24 });
  // Press animation (replaces whileTap — whileTap gets stuck on iOS Safari)
  const pressScaleX = useMotionValue(1);
  const pressScaleY = useMotionValue(1);
  const springPressScaleX = useSpring(pressScaleX, { stiffness: 500, damping: 30 });
  const springPressScaleY = useSpring(pressScaleY, { stiffness: 500, damping: 30 });

  const itemSheen = useMotionTemplate`radial-gradient(60px circle at ${mouseX}px ${mouseY}px, rgba(255, 255, 255, 0.12), transparent 70%)`;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!responsive) return;
    const el = itemRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const dx = relX - centerX;
    const dy = relY - centerY;

    mouseX.set(relX);
    mouseY.set(relY);

    // Микро-магнитное смещение: строго ограничено не более +/- 2px по X и +/- 1.5px по Y
    rawX.set(Math.max(-2, Math.min(2, dx * 0.05)));
    rawY.set(Math.max(-1.5, Math.min(1.5, dy * 0.05)));

    // Нежная упругость: не более 0.6% растяжения
    const distNorm = Math.min(1, Math.hypot(dx, dy) / Math.max(centerX, centerY));
    rawScaleX.set(1 + distNorm * 0.006);
    rawScaleY.set(1 - distNorm * 0.004);
  };

  const handleMouseLeave = () => {
    if (!responsive) return;
    rawX.set(0);
    rawY.set(0);
    rawScaleX.set(1);
    rawScaleY.set(1);
    mouseX.set(-100);
    mouseY.set(-100);
  };

  const handlePressStart = () => {
    if (!responsive) return;
    pressScaleX.set(1.01);
    pressScaleY.set(0.97);
  };

  const handlePressEnd = () => {
    if (!responsive) return;
    pressScaleX.set(1);
    pressScaleY.set(1);
  };

  const itemClassName = cn(
    'relative overflow-hidden w-full text-left font-medium hover:shadow cursor-pointer rounded-3xl p-2 text-white flex items-center gap-2 border duration-150',
    isActive ? 'bg-zinc-700/80 border-zinc-600/30' : 'bg-zinc-700/0 hover:bg-zinc-700/80 border-transparent hover:border-zinc-500/20 active:scale-95',
    className,
  );

  const hasCustomFill = iconClassName && /\bfill-/.test(iconClassName);

  const content = (
    <>
      {/* Specular sheen inside item (только в режиме "Полное") */}
      {responsive && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-0 rounded-3xl opacity-75"
          style={{ background: itemSheen }}
        />
      )}
      <div className="relative inline-flex items-center shrink-0 z-10">
        {iconNode ?? (
          <Icon name={icon ?? ''} className={cn('inline w-6 h-6', !hasCustomFill && 'fill-white', iconClassName)} />
        )}
      </div>
      <span className="flex-grow truncate z-10">{children}</span>
      {Boolean(badgeCount && badgeCount > 0) && (
        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full shrink-0 z-10">
          {badgeCount! > 99 ? '99+' : badgeCount}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <motion.div
        ref={itemRef}
        onMouseMove={responsive ? handleMouseMove : undefined}
        onMouseLeave={responsive ? handleMouseLeave : undefined}
        onTouchEnd={responsive ? handleMouseLeave : undefined}
        onTouchCancel={responsive ? handleMouseLeave : undefined}
        onPointerDown={responsive ? handlePressStart : undefined}
        onPointerUp={responsive ? handlePressEnd : undefined}
        onPointerCancel={responsive ? handlePressEnd : undefined}
        onPointerLeave={responsive ? handlePressEnd : undefined}
        style={
          responsive
            ? {
              x: springX,
              y: springY,
              scaleX: springPressScaleX,
              scaleY: springPressScaleY,
            }
            : undefined
        }
        className="w-full"
      >
        <Link href={href} className={itemClassName} onClick={onClick}>
          {content}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={itemRef}
      onMouseMove={responsive ? handleMouseMove : undefined}
      onMouseLeave={responsive ? handleMouseLeave : undefined}
      onTouchEnd={responsive ? handleMouseLeave : undefined}
      onTouchCancel={responsive ? handleMouseLeave : undefined}
      onPointerDown={responsive ? handlePressStart : undefined}
      onPointerUp={responsive ? handlePressEnd : undefined}
      onPointerCancel={responsive ? handlePressEnd : undefined}
      onPointerLeave={responsive ? handlePressEnd : undefined}
      style={
        responsive
          ? {
            x: springX,
            y: springY,
            scaleX: springPressScaleX,
            scaleY: springPressScaleY,
          }
          : undefined
      }
      className="w-full"
    >
      <button type="button" onClick={onClick} className={itemClassName}>
        {content}
      </button>
    </motion.div>
  );
};

const MotionNavItem = ({ children, isVisible, id }: { children: React.ReactNode, isVisible: boolean | undefined | null | "", id: string }) => {
  return (
    <AnimatePresence mode="popLayout">
      {isVisible ? (
        <motion.div
          layout
          key={id}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default function Navigation() {
  const { user, isAuthenticated, logout, lang } = useAuth();
  const pathname = usePathname();

  const isPulseContext = pathname === '/pulse' || pathname?.startsWith('/pulse/');
  const isCinemaContext = pathname === '/cinema' || pathname?.startsWith('/cinema/');
  const isCinemaWatchContext = pathname?.startsWith('/cinema/watch');

  // Отзывчивые эффекты (магнит, блик, «желе») — настройка «Интерфейс → Анимации», не режим стекла.
  const responsive = useAppearanceMotion().nav;

  // Desktop dock tracking
  const desktopDockRef = useRef<HTMLElement>(null);
  const desktopMouseX = useMotionValue(-200);
  const desktopMouseY = useMotionValue(-200);
  const desktopSheen = useMotionTemplate`radial-gradient(130px circle at ${desktopMouseX}px ${desktopMouseY}px, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.01) 50%, transparent 80%)`;

  const handleDesktopMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!responsive || !desktopDockRef.current) return;
    const rect = desktopDockRef.current.getBoundingClientRect();
    desktopMouseX.set(e.clientX - rect.left);
    desktopMouseY.set(e.clientY - rect.top);
  };

  const handleDesktopMouseLeave = () => {
    if (!responsive) return;
    desktopMouseX.set(-200);
    desktopMouseY.set(-200);
  };

  // Mobile pill tracking
  const mobilePillRef = useRef<HTMLDivElement>(null);
  const mobileMouseX = useMotionValue(-200);
  const mobileMouseY = useMotionValue(-200);
  const mobileSheen = useMotionTemplate`radial-gradient(120px circle at ${mobileMouseX}px ${mobileMouseY}px, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.01) 50%, transparent 80%)`;

  const handleMobileMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!responsive || !mobilePillRef.current) return;
    const rect = mobilePillRef.current.getBoundingClientRect();
    mobileMouseX.set(e.clientX - rect.left);
    mobileMouseY.set(e.clientY - rect.top);
  };

  const handleMobileMouseLeave = () => {
    if (!responsive) return;
    mobileMouseX.set(-200);
    mobileMouseY.set(-200);
  };

  // Mobile right pill tracking
  const mobileRightPillRef = useRef<HTMLDivElement>(null);
  const mobileRightMouseX = useMotionValue(-200);
  const mobileRightMouseY = useMotionValue(-200);
  const mobileRightSheen = useMotionTemplate`radial-gradient(120px circle at ${mobileRightMouseX}px ${mobileRightMouseY}px, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.01) 50%, transparent 80%)`;

  const handleMobileRightMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!responsive || !mobileRightPillRef.current) return;
    const rect = mobileRightPillRef.current.getBoundingClientRect();
    mobileRightMouseX.set(e.clientX - rect.left);
    mobileRightMouseY.set(e.clientY - rect.top);
  };

  const handleMobileRightMouseLeave = () => {
    if (!responsive) return;
    mobileRightMouseX.set(-200);
    mobileRightMouseY.set(-200);
  };

  const [unreadMessages, setUnreadMessages] = useState<number>(0);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  /** Полезная нагрузка GetDialogList.php для счётчика непрочитанных. */
  interface DialogsUnreadPayload {
    unread_count?: number;
    dialogs?: Array<{ unread_count?: number | string | null }>;
  }

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const fetchUnreadCounts = async () => {
      try {
        const [resMsgs, resNotifs] = await Promise.all([
          AncialAPI.getDialogListResponse<DialogsUnreadPayload>().catch(() => null),
          AncialAPI.getNotificationsResponse<{ unread_count?: number }>().catch(() => null),
        ]);

        if (resMsgs?.success) {
          const rawData = resMsgs.data ?? resMsgs;
          const count = typeof rawData?.unread_count === 'number'
            ? rawData.unread_count
            : Array.isArray(rawData?.dialogs)
              ? rawData.dialogs.reduce((acc: number, d) => acc + Number(d.unread_count ?? 0), 0)
              : 0;
          setUnreadMessages(count);
        }

        if (resNotifs?.success) {
          setUnreadNotifications(resNotifs.data?.unread_count ?? 0);
        }
      } catch { }
    };

    void fetchUnreadCounts();

    const handleCustomUnread = (e: Event) => {
      const detail = (e as CustomEvent<{ type?: string; count?: number; delta?: number }>).detail;
      if (detail?.type === 'messages_set') {
        setUnreadMessages(Math.max(0, detail.count ?? 0));
      } else if (detail?.type === 'messages') {
        setUnreadMessages((prev) => Math.max(0, prev + (detail.delta ?? 1)));
      } else if (detail?.type === 'notifications') {
        setUnreadNotifications((prev) => Math.max(0, prev + (detail.delta ?? 1)));
      } else if (detail?.type === 'clear_notifications') {
        setUnreadNotifications(0);
      } else if (detail?.type === 'clear_messages') {
        setUnreadMessages(0);
      }
    };

    window.addEventListener('ancial:unread_update', handleCustomUnread);
    return () => window.removeEventListener('ancial:unread_update', handleCustomUnread);
  }, [isAuthenticated, user]);

  return (
    <>
      {!isCinemaContext && (
        <motion.nav
          ref={desktopDockRef}
          onMouseMove={responsive ? handleDesktopMouseMove : undefined}
          onMouseLeave={responsive ? handleDesktopMouseLeave : undefined}
          onTouchEnd={responsive ? handleDesktopMouseLeave : undefined}
          onTouchCancel={responsive ? handleDesktopMouseLeave : undefined}
          layoutRoot
          layout
          data-app-nav="desktop"
          className={cn(
            'hidden lg:flex flex-col p-1 fixed gap-1 top-3 left-3 rounded-full border z-[50]',
            'border-zinc-600/30'
          )}
        >
          {/* Стекло — слоем под содержимым: у пилюли overflow-visible и движущиеся дети. */}
          <div className="glass-nav rounded-full absolute w-full h-full top-0 left-0 z-[-1]"></div>
          {responsive && (
            <motion.div
              className="pointer-events-none absolute inset-0 z-0 rounded-full opacity-80"
              style={{ background: desktopSheen }}
            />
          )}

          <MotionNavItem id="desktop-home" isVisible={true}>
            <NavItem href="/" icon="IC-home" />
          </MotionNavItem>

          <MotionNavItem id="desktop-feed" isVisible={true}>
            <NavItem href="/feed" icon="IC-feed" />
          </MotionNavItem>

          <MotionNavItem id="desktop-messages" isVisible={isAuthenticated && user ? true : false}>
            <NavItem href="/messages" icon="IC-chats" badgeCount={unreadMessages} />
          </MotionNavItem>

          <MotionNavItem id="desktop-friends" isVisible={isAuthenticated && user ? true : false}>
            <NavItem href="/friends" icon="IC-friends" />
          </MotionNavItem>

          <MotionNavItem id="desktop-groups" isVisible={isAuthenticated && user ? true : false}>
            <NavItem href="/groups" icon="IC-groups" />
          </MotionNavItem>

          <MotionNavItem id="desktop-compass" isVisible={isAuthenticated && user ? true : false}>
            <Dropdown icon="IC-compass" position="right" activePaths={['/pulse', '/wallet', '/apps', '/games']}>
              <DropdownItem href="/pulse" icon="IC-music">
                Pulse
              </DropdownItem>
              <DropdownItem href="/wallet" icon="IC-wallet">
                Wallet
              </DropdownItem>
              <DropdownItem href="/apps" icon="IC-games">
                ZYNT
              </DropdownItem>
            </Dropdown>
          </MotionNavItem>

          <MotionNavItem id="desktop-user" isVisible={isAuthenticated && user ? true : false}>
            <Dropdown imgSrc={user?.img} position="right" activePaths={[`/@${user?.username}`, '/settings', '/notifications']}>
              <DropdownItem href={`/@${user?.username}`} icon="IC-user">
                {lang?.myaccount}
              </DropdownItem>
              <DropdownItem href="/notifications" icon="IC-notification" badgeCount={unreadNotifications}>
                {lang?.notif}
              </DropdownItem>
              <DropdownItem href="/settings" icon="IC-settings">
                {lang?.settings}
              </DropdownItem>
              <DropdownItem onClick={logout} icon="IC-exit">
                {lang?.logout}
              </DropdownItem>
            </Dropdown>
          </MotionNavItem>

          <MotionNavItem id="desktop-games-unauth" isVisible={!isAuthenticated}>
            <NavItem href="/apps" icon="IC-games" />
          </MotionNavItem>

          <MotionNavItem id="desktop-pulse-unauth" isVisible={!isAuthenticated}>
            <NavItem href="/pulse" icon="IC-music" />
          </MotionNavItem>

          <MotionNavItem id="desktop-login-unauth" isVisible={!isAuthenticated}>
            <NavItem href="/login" icon="IC-login" />
          </MotionNavItem>

          <MotionNavItem id="desktop-signup-unauth" isVisible={!isAuthenticated}>
            <NavItem href="/signup" icon="IC-signup" />
          </MotionNavItem>

          <MotionNavItem id="desktop-settings-unauth" isVisible={!isAuthenticated}>
            <NavItem href="/settings" icon="IC-settings" />
          </MotionNavItem>
        </motion.nav>
      )}


      {!isCinemaWatchContext && (
        <nav data-app-nav="mobile" className="lg:hidden fixed bottom-0 left-0 w-full flex items-center p-1 z-[1600]">
          <motion.div
            ref={mobilePillRef}
            onMouseMove={responsive ? handleMobileMouseMove : undefined}
            onMouseLeave={responsive ? handleMobileMouseLeave : undefined}
            onTouchEnd={responsive ? handleMobileMouseLeave : undefined}
            onTouchCancel={responsive ? handleMobileMouseLeave : undefined}
            data-app-nav="mobile-pill"
            layoutRoot
            layout
            className={cn(
              'flex p-1 rounded-full border gap-1 relative overflow-visible',
              'border-zinc-600/30'
            )}
          >
            {/* Стекло — слоем под содержимым: у пилюли overflow-visible и движущиеся дети. */}
            <div className="glass-nav rounded-full absolute w-full h-full top-0 left-0 z-[-1]"></div>
            {responsive && (
              <motion.div
                className="pointer-events-none absolute inset-0 z-0 rounded-full opacity-80"
                style={{ background: mobileSheen }}
              />
            )}
            {/* PULSE CONTEXT */}
            <MotionNavItem id="pulse" isVisible={isPulseContext}>
              <NavItem href="/pulse" icon="IC-home" isActive={pathname === '/pulse'} />
            </MotionNavItem>
            <MotionNavItem id="pulse-search" isVisible={isPulseContext}>
              <NavItem href="/pulse/search" icon="IC-search" />
            </MotionNavItem>
            <MotionNavItem id="pulse-my" isVisible={isPulseContext && isAuthenticated && user ? true : false}>
              <NavItem href="/pulse/my" icon="IC-book" />
            </MotionNavItem>

            {/* CINEMA CONTEXT */}
            <MotionNavItem id="cinema-home" isVisible={isCinemaContext}>
              <NavItem href="/cinema" icon="IC-home" isActive={pathname === '/cinema'} />
            </MotionNavItem>
            <MotionNavItem id="cinema-search" isVisible={isCinemaContext}>
              <NavItem href="/cinema/search" icon="IC-search" />
            </MotionNavItem>
            <MotionNavItem id="cinema-categories" isVisible={isCinemaContext}>
              <Dropdown
                icon="IC-more"
                position="top"
                align="start"
                direction="col"
                menuClassName="!w-44 shadow-2xl z-[1700]"
                activePaths={['/cinema/movies', '/cinema/series', '/cinema/anime']}
              >
                <DropdownItem href="/cinema/movies" icon="IC-movie">Фильмы</DropdownItem>
                <DropdownItem href="/cinema/series" icon="IC-series">Сериалы</DropdownItem>
                <DropdownItem href="/cinema/anime" icon="IC-anime">Аниме</DropdownItem>
              </Dropdown>
            </MotionNavItem>

            {/* STANDARD CONTEXT */}
            <MotionNavItem id="feed" isVisible={!isPulseContext && !isCinemaContext}>
              <NavItem href="/feed" icon="IC-feed" />
            </MotionNavItem>
            <MotionNavItem id="general-pulse" isVisible={!isPulseContext && !isCinemaContext && !isAuthenticated}>
              <NavItem href="/pulse" icon="IC-music" />
            </MotionNavItem>
            <MotionNavItem id="messages" isVisible={!isPulseContext && !isCinemaContext && isAuthenticated && user ? true : false}>
              <NavItem href="/messages" icon="IC-chats" badgeCount={unreadMessages} />
            </MotionNavItem>
            <MotionNavItem id="friends" isVisible={!isPulseContext && !isCinemaContext && isAuthenticated && user ? true : false}>
              <NavItem href="/friends" icon="IC-friends" />
            </MotionNavItem>
            <MotionNavItem id="groups" isVisible={!isPulseContext && !isCinemaContext && isAuthenticated && user ? true : false}>
              <NavItem href="/groups" icon="IC-groups" />
            </MotionNavItem>
          </motion.div>
          <div className="flex-grow"></div>
          <motion.div
            ref={mobileRightPillRef}
            onMouseMove={responsive ? handleMobileRightMouseMove : undefined}
            onMouseLeave={responsive ? handleMobileRightMouseLeave : undefined}
            onTouchEnd={responsive ? handleMobileRightMouseLeave : undefined}
            onTouchCancel={responsive ? handleMobileRightMouseLeave : undefined}
            data-app-nav="mobile-pill"
            layoutRoot
            layout
            className={cn(
              'flex p-1 relative rounded-full border gap-1',
              'border-zinc-600/30'
            )}
          >
            {/* Стекло — слоем под содержимым: у пилюли overflow-visible и движущиеся дети. */}
            <div className="glass-nav rounded-full absolute w-full h-full top-0 left-0 z-[-1]"></div>
            {responsive && (
              <motion.div
                className="pointer-events-none absolute inset-0 z-0 rounded-full opacity-80"
                style={{ background: mobileRightSheen }}
              />
            )}

            <MotionNavItem id="mobile-login" isVisible={!isAuthenticated}>
              <NavItem href="/login" icon="IC-login" />
            </MotionNavItem>
            <MotionNavItem id="mobile-signup" isVisible={!isAuthenticated}>
              <NavItem href="/signup" icon="IC-signup" />
            </MotionNavItem>

            <MotionNavItem id="mobile-user" isVisible={isAuthenticated && user ? true : false}>
              <Dropdown imgSrc={user?.img} position="top" align="end" activePaths={[`/@${user?.username}`, '/settings', '/notifications']}>
                <DropdownItem href={`/@${user?.username}`} icon="IC-user">
                  {lang?.myaccount}
                </DropdownItem>
                <DropdownItem href="/notifications" icon="IC-notification" badgeCount={unreadNotifications}>
                  {lang?.notif}
                </DropdownItem>
                <DropdownItem href="/settings" icon="IC-settings">
                  {lang?.settings}
                </DropdownItem>
                <DropdownItem onClick={logout} icon="IC-exit">
                  {lang?.logout}
                </DropdownItem>
              </Dropdown>
            </MotionNavItem>

            <MotionNavItem id="mobile-compass" isVisible={true}>
              <Dropdown
                icon="IC-compass"
                position="top"
                align="end"
                direction="row"
                menuClassName={cn(
                  "justify-center",
                  ((isPulseContext || isCinemaContext) && isAuthenticated && user) ? "flex-wrap !w-[15.5rem] !rounded-[2rem]" : "flex-nowrap !w-max !rounded-full"
                )}
                activePaths={(isPulseContext || isCinemaContext) ? ['/wallet', '/apps', '/games'] : ['/pulse', '/wallet', '/apps', '/games']}
              >
                {(isPulseContext || isCinemaContext) && <NavItem href="/feed" icon="IC-feed" />}
                {(isPulseContext || isCinemaContext) && isAuthenticated && user && <NavItem href="/messages" icon="IC-chats" />}
                {(isPulseContext || isCinemaContext) && isAuthenticated && user && <NavItem href="/friends" icon="IC-friends" />}
                {(isPulseContext || isCinemaContext) && isAuthenticated && user && <NavItem href="/groups" icon="IC-groups" />}
                {!isPulseContext && isAuthenticated && user && <NavItem href="/pulse" icon="IC-music" />}
                {isAuthenticated && user && <NavItem href="/wallet" icon="IC-wallet" />}
                <NavItem href="/apps" icon="IC-games" />
                {!isAuthenticated && <NavItem href="/settings" icon="IC-settings" />}
                <NavItem href="/" icon="IC-search" />
              </Dropdown>
            </MotionNavItem>
          </motion.div>
        </nav>
      )}
    </>
  );
}

