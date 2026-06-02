'use client';

import Link from 'next/link';
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const NavItem = ({ href, icon, imgSrc, onClick, isActive }: { href?: string, icon?: string, imgSrc?: string, onClick?: () => void, isActive?: boolean }) => {
  const pathname = usePathname();
  const active = isActive !== undefined
    ? isActive
    : Boolean(
        href && (
          pathname === href ||
          (href !== '/' && pathname?.startsWith(`${href}/`))
        ),
      );
  
  const className = `w-14 h-14 ${imgSrc ? `p-0` : `p-1`} cursor-pointer flex items-center justify-center rounded-full border duration-300 active:scale-95 ${
    active
      ? "bg-zinc-700/90 border-zinc-600/30"
      : "hover:bg-zinc-700/95 border-transparent hover:border-zinc-600/30"
  }`;

  const innerContent = imgSrc ? (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imgSrc} alt="Avatar" className="w-14 h-14 rounded-full object-cover" />
    </>
  ) : icon ? (
    <svg className="w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <use href={`#${icon}`}></use>
    </svg>
  ) : null;
  
  if (href) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {innerContent}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      {innerContent}
    </button>
  );
};

type DropdownProps = {
  activePaths?: string[];
  align?: 'start' | 'end' | 'center';
  children: React.ReactNode;
  closeOnChildClick?: boolean;
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
  // И выравнивание относительно оси (например, если position="top", то align="end" прижмет меню к правому краю кнопки)
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
            <svg className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <use href={`#${compactTriggerIcon}`}></use>
            </svg>
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
      <div 
        className={`${cn(
          'absolute',
          getPositionClasses(),
          getOriginClass(),
          'p-1',
          direction === 'col' ? 'flex-col rounded-3xl' : 'flex-row rounded-full',
          widthClasses,
          'bg-zinc-900/50 backdrop-blur-lg backdrop-saturate-200 border border-zinc-600/30 shadow-xl flex gap-1 z-50 transition-all duration-200 ease-out',
          menuClassName,
        )}
          ${isOpen ? 'opacity-100 scale-100 visible pointer-events-auto' : 'opacity-0 scale-95 invisible pointer-events-none'}
        `}
      >
        {/* Клонируем элементы и добавляем закрытие дропдауна при клике на любой элемент внутри */}
        {React.Children.map(children, (child) => {
          if (React.isValidElement<{onClick?: () => void}>(child)) {
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
        })}
      </div>
    </div>
  );
};

type DropdownItemProps = {
  children: React.ReactNode;
  className?: string;
  href?: string;
  icon?: string;
  iconClassName?: string;
  iconNode?: React.ReactNode;
  onClick?: () => void;
};

export const DropdownItem = ({
  href,
  icon,
  onClick,
  children,
  className,
  iconClassName,
  iconNode,
}: DropdownItemProps) => {
  const pathname = usePathname();
  const isActive = href ? pathname === href : false;
  
  const itemClassName = cn(
    'w-full text-left font-medium hover:shadow cursor-pointer rounded-3xl duration-150 p-2 text-white flex items-center gap-2 border hover:border-zinc-600/30',
    isActive ? 'bg-zinc-700/80 border-zinc-600/30' : 'bg-zinc-700/0 hover:bg-zinc-700/95 border-transparent',
    className,
  );

  const content = (
    <>
      {iconNode ?? (
        <svg className={cn('inline w-6 h-6 fill-white', iconClassName)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <use href={`#${icon}`}></use>
        </svg>
      )}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={itemClassName} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={itemClassName}>
      {content}
    </button>
  );
};

export default function Navigation() {
  const { user, isAuthenticated, logout, lang } = useAuth();
  const pathname = usePathname();
  const isPulseContext = pathname === '/pulse' || pathname?.startsWith('/pulse/');

  return (
    <>
        <nav data-app-nav="desktop" className="hidden md:flex flex-col p-1 fixed gap-1 top-3 left-3 bg-zinc-900/50 rounded-full border border-zinc-600/30 z-[50]">
            <div className="rounded-full absolute w-full h-full backdrop-blur-md backdrop-saturate-200 top-0 left-0 z-[-1]"></div>
            <NavItem href="/" icon="IC-home" />
            <NavItem href="/feed" icon="IC-feed" />
            {isAuthenticated && user && (
                <NavItem href="/messages" icon="IC-chats" />
            )}
            {isAuthenticated && user && (
                <NavItem href="/friends" icon="IC-friends" />
            )}
            {isAuthenticated && user && (
                <NavItem href="/groups" icon="IC-groups" />
            )}

            {isAuthenticated && user && (
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
            )}

            {isAuthenticated && user && (
                <Dropdown imgSrc={user.img} position="right" activePaths={[`/@${user.username}`, '/settings']}>
                    <DropdownItem href={`/@${user.username}`} icon="IC-user">
                        {lang?.myaccount}
                    </DropdownItem>
                    <DropdownItem href="/notifications" icon="IC-notification">
                        {lang?.notif}
                    </DropdownItem>
                    <DropdownItem href="/settings" icon="IC-settings">
                        {lang?.settings}
                    </DropdownItem>
                    <DropdownItem onClick={logout} icon="IC-exit">
                        {lang?.logout}
                    </DropdownItem>
                </Dropdown>
            )}

            {!isAuthenticated && (
                <NavItem href="/apps" icon="IC-games" />
            )}

            {!isAuthenticated && (
                <NavItem href="/pulse" icon="IC-music" />
            )}

            {!isAuthenticated && (
                <NavItem href="/login" icon="IC-login" />
            )}
            {!isAuthenticated && (
                <NavItem href="/signup" icon="IC-signup" />
            )}
            {!isAuthenticated && (
                <NavItem href="/settings" icon="IC-settings" />
            )}
        </nav>


        <nav data-app-nav="mobile" className="md:hidden fixed bottom-0 left-0 w-full flex items-center p-1 z-[1600]">
            <div className="flex p-1 bg-zinc-900/50 backdrop-blur-lg rounded-full border border-zinc-600/30 gap-1 relative overflow-hidden transition-all duration-300">
                {isPulseContext ? (
                    <div className="flex gap-1 animate-in fade-in slide-in-from-left duration-300">
                        <NavItem href="/pulse" icon="IC-home" />
                        <NavItem href="/pulse/search" icon="IC-search" />
                        {isAuthenticated && user && (
                            <NavItem href="/pulse/my" icon="IC-library" />
                        )}
                    </div>
                ) : (
                    <div className="flex gap-1 animate-in fade-in slide-in-from-left duration-300">
                        <NavItem href="/feed" icon="IC-feed" />
                        {!isAuthenticated && (
                            <NavItem href="/pulse" icon="IC-music" />
                        )}
                        {isAuthenticated && user && (
                            <NavItem href="/messages" icon="IC-chats" />
                        )}
                        {isAuthenticated && user && (
                            <NavItem href="/friends" icon="IC-friends" />
                        )}
                        {isAuthenticated && user && (
                            <NavItem href="/groups" icon="IC-groups" />
                        )}
                    </div>
                )}
            </div>
            <div className='flex-grow'></div>
            <div className="flex p-1 bg-zinc-900/50 relative rounded-full border border-zinc-600/30 gap-1">
                <div className="rounded-full absolute w-full h-full backdrop-blur-md backdrop-saturate-200 top-0 left-0 z-[-1]"></div>
                {!isAuthenticated && (
                    <NavItem href="/login" icon="IC-login" />
                )}
                {!isAuthenticated && (
                    <NavItem href="/signup" icon="IC-signup" />
                )}
                {isAuthenticated && user && (
                    <Dropdown imgSrc={user.img} position="top" align="end" activePaths={[`/@${user.username}`, '/settings']}>
                        <DropdownItem href={`/@${user.username}`} icon="IC-user">
                            {lang?.myaccount}
                        </DropdownItem>
                        <DropdownItem href="/notifications" icon="IC-notification">
                            {lang?.notif}
                        </DropdownItem>
                        <DropdownItem href="/settings" icon="IC-settings">
                            {lang?.settings}
                        </DropdownItem>
                        <DropdownItem onClick={logout} icon="IC-exit">
                            {lang?.logout}
                        </DropdownItem>
                    </Dropdown>
                )}
                <Dropdown 
                  icon="IC-compass" 
                  position="top" 
                  align="end" 
                  direction="row" 
                  menuClassName={cn(
                    "justify-center",
                    isPulseContext ? "flex-wrap !w-[16.5rem] !rounded-[2rem]" : "flex-nowrap !w-max !rounded-full"
                  )}
                  activePaths={isPulseContext ? ['/wallet', '/apps', '/games'] : ['/pulse', '/wallet', '/apps', '/games']}
                >
                    {isPulseContext && <NavItem href="/feed" icon="IC-feed" />}
                    {isPulseContext && isAuthenticated && user && <NavItem href="/messages" icon="IC-chats" />}
                    {isPulseContext && isAuthenticated && user && <NavItem href="/friends" icon="IC-friends" />}
                    {isPulseContext && isAuthenticated && user && <NavItem href="/groups" icon="IC-groups" />}
                    {!isPulseContext && <NavItem href="/pulse" icon="IC-music" />}
                    <NavItem href="/wallet" icon="IC-wallet" />
                    <NavItem href="/apps" icon="IC-games" />
                    <NavItem href="/" icon="IC-search" />
                </Dropdown>
            </div>
        </nav>
    </>
  );
}
