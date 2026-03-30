'use client';

import Link from 'next/link';
import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

const NavItem = ({ href, icon, imgSrc, onClick, isActive }: { href?: string, icon?: string, imgSrc?: string, onClick?: () => void, isActive?: boolean }) => {
  const pathname = usePathname();
  const active = isActive !== undefined ? isActive : (href && pathname === href);
  
  const className = `w-14 h-14 ${imgSrc ? `p-0` : `p-1`} cursor-pointer flex items-center justify-center rounded-full border duration-300 active:scale-95 ${
    active
      ? "bg-zinc-700/90 border-zinc-600/30"
      : "hover:bg-zinc-700/95 border-transparent hover:border-zinc-600/30"
  }`;

  const innerContent = imgSrc ? (
    <img src={imgSrc} alt="Avatar" className="w-14 h-14 rounded-full object-cover" />
  ) : icon ? (
    <svg className="w-8 h-8 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <use href={`/icons.svg#${icon}`}></use>
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

const Dropdown = ({ icon, imgSrc, position = 'right', align = 'start', direction = 'col', activePaths = [], children }: { icon?: string; imgSrc?: string; position?: 'left' | 'right' | 'top' | 'bottom'; align?: 'start' | 'end' | 'center'; direction?: 'row' | 'col'; activePaths?: string[]; children: React.ReactNode }) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

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

  return (
    <div className={`relative ${imgSrc ? `w-auto h-auto` : `w-14 h-14`}`} ref={dropdownRef}>
      <NavItem 
        icon={icon} 
        imgSrc={imgSrc}
        onClick={() => setIsOpen(!isOpen)} 
        isActive={isActive}
      />
      <div 
        className={`absolute ${getPositionClasses()} ${getOriginClass()} p-1 ${direction === 'col' ? 'w-48 flex-col rounded-3xl' : 'w-max flex-row items-center rounded-full'} bg-zinc-900/50 backdrop-blur-lg backdrop-saturate-200 border border-zinc-600/30 shadow-xl flex gap-1 z-50 transition-all duration-200 ease-out
          ${isOpen ? 'opacity-100 scale-100 visible pointer-events-auto' : 'opacity-0 scale-95 invisible pointer-events-none'}
        `}
      >
        {/* Клонируем элементы и добавляем закрытие дропдауна при клике на любой элемент внутри */}
        {React.Children.map(children, (child) => {
          if (React.isValidElement<{onClick?: () => void}>(child)) {
            return React.cloneElement(child, {
              onClick: () => {
                if (child.props.onClick) child.props.onClick();
                setIsOpen(false);
              }
            });
          }
          return child;
        })}
      </div>
    </div>
  );
};

const DropdownItem = ({ href, icon, onClick, children }: { href?: string; icon: string; onClick?: () => void; children: React.ReactNode }) => {
  const pathname = usePathname();
  const isActive = href ? pathname === href : false;
  
  const className = `w-full text-left font-medium hover:shadow cursor-pointer rounded-3xl duration-150 p-2 text-content-600 flex items-center gap-2 border hover:border-zinc-600/30 cursor-pointer ${isActive ? 'bg-zinc-700/80  border-zinc-600/30' : 'bg-zinc-700/0 hover:bg-zinc-700/95  border-transparent'}`;

  const content = (
    <>
      <svg className="inline w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <use href={`/icons.svg#${icon}`}></use>
      </svg>
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
};

export default function Navigation() {
  const { user, isAuthenticated, logout, lang } = useAuth();

  return (
    <>
        <nav className="hidden md:flex flex-col p-1 fixed gap-1 top-3 left-3 bg-zinc-900/50 rounded-full border border-zinc-600/30 z-[50]">
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
            <Dropdown icon="IC-compass" position="right" activePaths={['/pulse', '/wallet', '/games']}>
                <DropdownItem href="/pulse" icon="IC-music">
                    Pulse
                </DropdownItem>
                <DropdownItem href="/wallet" icon="IC-wallet">
                    Wallet
                </DropdownItem>
                <DropdownItem href="/games" icon="IC-games">
                    ZYNT
                </DropdownItem>
            </Dropdown>
            )}

            {isAuthenticated && user && (
                <Dropdown imgSrc={user.img} position="right" activePaths={[`/${user.username}`, '/settings']}>
                    <DropdownItem href={`/${user.username}`} icon="IC-user">
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
                <NavItem href="/music" icon="IC-games" />
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


        <nav className="md:hidden fixed bottom-0 left-0 w-full flex items-center p-1 z-[50]">
            <div className="flex p-1 bg-zinc-900/50 backdrop-blur-lg rounded-full border border-zinc-600/30 gap-1">
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
                    <Dropdown imgSrc={user.img} position="top" align="end" activePaths={[`/${user.username}`, '/settings']}>
                        <DropdownItem href={`/${user.username}`} icon="IC-user">
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
                <Dropdown icon="IC-compass" position="top" align="end" direction="row" activePaths={['/pulse', '/wallet', '/games']}>
                    <NavItem href="/pulse" icon="IC-music" />
                    <NavItem href="/wallet" icon="IC-wallet" />
                    <NavItem href="/games" icon="IC-games" />
                </Dropdown>
            </div>
        </nav>
    </>
  );
}
