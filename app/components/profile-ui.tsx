'use client';

import Image from 'next/image';
import { useDragScroll } from '../hooks/useDragScroll';
import { cn, SvgIcon } from '../feed/editor-shared';
import Modal from './modal';

export interface UserPreview {
  fname?: string | null;
  id: string | number;
  img?: string | null;
  lname?: string | null;
  online?: boolean | number | string | null;
  username?: string | null;
}

export interface GroupPreview {
  id: string | number;
  img?: string | null;
  name?: string | null;
  slnk?: string | null;
}

export function UserMiniCard({
  image,
  isOnline,
  label,
  onClick,
}: {
  image: string;
  isOnline?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-0.5 cursor-pointer duration-500 group overflow-hidden justify-center items-center w-full active:scale-95"
    >
      <Image
        alt="User Profile"
        width={64}
        height={64}
        src={image}
        className={cn(
          'w-16 h-16 rounded-full shadow duration-300 border-2 group-hover:border-purple-500 bg-cover bg-center',
          isOnline && 'border-lime-500',
          !isOnline && 'border-transparent',
        )}
      />
      <span className="text-zinc-300 w-16 text-center text-sm truncate">{label}</span>
    </button>
  );
}

export function GroupMiniCard({
  image,
  label,
  onClick,
}: {
  image: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-0.5 cursor-pointer duration-300 group overflow-hidden justify-center items-center w-full active:scale-95"
    >
      <Image
        alt="Group"
        width={64}
        height={64}
        src={image}
        className="w-16 h-16 rounded-full shadow duration-300 border-2 group-hover:border-purple-500 bg-cover bg-center"
      />
      <span className="text-zinc-300 w-16 text-center text-sm truncate">{label}</span>
    </button>
  );
}

export function PeopleSection({
  borderClassName,
  children,
  onOpen,
  title,
}: {
  borderClassName: string;
  children: React.ReactNode;
  onOpen: () => void;
  title: string;
}) {
  const scrollRef = useDragScroll({ speed: 2 });

  return (
    <div
      className={cn(
        'md:rounded-3xl md:border border-zinc-600/30 bg-zinc-900 flex flex-col items-center md:shadow duration-300',
        borderClassName,
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex justify-start items-start w-full px-3 md:pt-3 cursor-pointer text-left"
      >
        <span className="text-zinc-300 text-lg font-thin hover:text-zinc-200 duration-300 hover:font-bold">
          {title} {'->'}
        </span>
      </button>
      <div
        ref={scrollRef}
        className="drag-scroll overflow-x-auto w-full px-3 mb-3 flex flex-nowrap viewport md:rounded-2xl"
      >
        <div className="flex flex-row flex-nowrap gap-3 justify-center items-center flex-shrink-0">
          {children}
        </div>
      </div>
    </div>
  );
}

export function RelationGridModal({
  emptyText,
  isOpen,
  items,
  onClose,
  onOpen,
  title,
  type,
}: {
  emptyText: string;
  isOpen: boolean;
  items: Array<GroupPreview | UserPreview>;
  onClose: () => void;
  onOpen: (value: GroupPreview | UserPreview) => void;
  title: string;
  type: 'groups' | 'users';
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} width="lg">
      <div className="grid grid-cols-4 lg:grid-cols-5 gap-3">
        {items.length > 0 ? (
          items.map((item) => {
            const image = item.img || 'https://ancial.ru/includes/img/new_user.png';

            if (type === 'groups') {
              const group = item as GroupPreview;
              return (
                <button
                  key={String(group.id)}
                  type="button"
                  onClick={() => onOpen(group)}
                  className="cursor-pointer flex flex-col items-center justify-center"
                >
                  <div className="flex items-center justify-center overflow-hidden rounded-full max-w-16">
                    <Image
                      alt="Group"
                      width={64}
                      height={64}
                      src={image}
                      className="w-16 h-16 rounded-full shadow duration-300 border-2 group-hover:border-purple-500 bg-cover bg-center"
                    />
                  </div>
                  <p className="text-center truncate overflow-hidden w-20">
                    {group.name || ''}
                  </p>
                </button>
              );
            }

            const user = item as UserPreview;
            return (
              <button
                key={String(user.id)}
                type="button"
                onClick={() => onOpen(user)}
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <div className="flex items-center justify-center overflow-hidden rounded-full max-w-16">
                  <Image
                    alt="User Profile"
                    width={64}
                    height={64}
                    src={image}
                    className={cn(
                      'w-16 h-16 rounded-full shadow duration-300 border-2 group-hover:border-purple-500 bg-cover bg-center',
                      user.online === true ||
                        user.online === 1 ||
                        user.online === '1' ||
                        user.online === 'true'
                        ? 'border-lime-500'
                        : 'border-transparent',
                    )}
                  />
                </div>
                <p className="text-center truncate overflow-hidden w-20">
                  {user.fname || ''}
                </p>
              </button>
            );
          })
        ) : (
          <p className="p-5 text-lg col-span-4 lg:col-span-5">{emptyText}</p>
        )}
      </div>
    </Modal>
  );
}

export function ProfileAvatar({
  image,
  isOnline,
  sizeClassName,
}: {
  image: string;
  isOnline?: boolean;
  sizeClassName: string;
}) {
  return (
    <div
      className={cn(
        'shadow duration-300 rounded-full bg-cover bg-center ring-2',
        sizeClassName,
        isOnline && 'ring-lime-500',
        !isOnline && 'ring-transparent',
      )}
      style={{ backgroundImage: `url('${image}')` }}
    />
  );
}

export function ProfileMediaButton({
  className,
  onClick,
}: {
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'active:scale-95 border border-zinc-600/30 bg-zinc-800/80 hover:bg-zinc-700 backdrop-blur-lg flex items-center justify-center text-zinc-100 rounded-2xl hover:text-zinc-300 cursor-pointer duration-300',
        className,
      )}
    >
      <SvgIcon className="w-6 h-6 fill-white inline" id="IC-edit" viewBox="0 0 48 48" />
    </button>
  );
}

export function EmptyIllustration({
  description,
  title,
}: {
  description?: string;
  title: string;
}) {
  return (
    <div className="text-center w-full flex flex-col gap-0.5 justify-center items-center bg-zinc-900 text-zinc-100 rounded-3xl p-6 border border-zinc-600/30">
      <Image
        src="/img/status/nothingfound.webp"
        alt="Nothing found"
        width={224}
        height={224}
        className="h-56 w-auto"
      />
      <span className="text-base text-zinc-200 w-full text-center font-black">
        {title}
      </span>
      {description ? (
        <span className="text-sm text-zinc-400 w-full text-center font-medium">
          {description}
        </span>
      ) : null}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-3 items-center flex-grow w-full max-w-screen-2xl">
      <div className="w-full px-3">
        <div className="animate-pulse bg-zinc-700 h-8 w-48 rounded-md mt-3"></div>
      </div>

      <div className="bg-zinc-900 border border-zinc-600/30 rounded-3xl flex flex-col w-full md:shadow duration-300">
        <div className="animate-pulse bg-zinc-700 h-32 lg:h-48 w-full rounded-t-3xl"></div>
        <div className="p-3 flex flex-col md:flex-row gap-3">
          <div className="flex gap-1.5 items-center flex-grow">
            <div className="animate-pulse bg-zinc-700 w-16 h-16 md:w-24 md:h-24 rounded-full"></div>
            <div className="flex flex-col gap-2">
              <div className="animate-pulse bg-zinc-700 h-6 w-32 rounded-md"></div>
              <div className="animate-pulse bg-zinc-700 h-4 w-48 rounded-md"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
