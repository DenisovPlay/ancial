'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Modal from '../../components/modal';
import { Dropdown, DropdownItem } from '../../components/navigation';
import PostsRenderer, {
  type PostCardLang,
  type PostData,
} from '../../components/posts-renderer';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  buildApiUrl,
  cn,
  SvgIcon,
  uploadImageToImgbb,
} from '../../feed/editor-shared';
import FeedPostSkeleton from '../../feed/feed-post-skeleton';

type Id = string | number;

interface UserFriendButton {
  action?: string | null;
  relation_id?: Id | null;
  status?: string | number | null;
  target_id?: Id | null;
}

interface UserPreview {
  fname?: string | null;
  id: Id;
  img?: string | null;
  lname?: string | null;
  online?: boolean | number | string | null;
  username?: string | null;
}

interface GroupPreview {
  id: Id;
  img?: string | null;
  name?: string | null;
  slnk?: string | null;
}

interface UserPageData {
  active?: boolean | number | string | null;
  cover?: string | null;
  description?: string | null;
  fname?: string | null;
  friend_button?: UserFriendButton | null;
  friends?: UserPreview[] | null;
  groups?: GroupPreview[] | null;
  id: Id;
  img?: string | null;
  is_owner?: boolean | number | string | null;
  lname?: string | null;
  login?: string | null;
  online?: boolean | number | string | null;
  subscribers?: UserPreview[] | null;
  verify?: boolean | number | string | null;
}

interface UserPageResponse {
  data?: UserPageData;
  error?: string;
  success?: boolean;
}

interface FeedResponse {
  has_more?: boolean;
  last_id?: Id;
  posts?: PostData[];
}

interface FeedCommentUser {
  img: string;
  is_verified?: boolean | number | string | null;
  name: string;
  username: string;
}

interface FeedComment {
  content: string;
  date: string;
  id: Id;
  is_own_comment?: boolean | number | string | null;
  user: FeedCommentUser;
}

interface ReportTarget {
  id: Id;
  type: number;
}

interface UserProfileCacheEntry {
  currentLastId: Id;
  hasMorePages: boolean;
  posts: PostData[];
  userData: UserPageData;
}

function flag(value: boolean | number | string | null | undefined) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function toNumber(value: number | string | boolean | null | undefined) {
  const nextValue = Number(value ?? 0);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

function getUserProfileCacheKey(
  login: string,
  userId: string | null | undefined,
  isAuthenticated: boolean,
) {
  const normalizedLogin = login.trim().toLowerCase() || '__unknown__';
  const viewer = isAuthenticated ? `user-${userId ?? 'auth'}` : 'guest';
  return `user_profile_cache:${viewer}:${normalizedLogin}`;
}

function readUserProfileCache(key: string): UserProfileCacheEntry | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = window.localStorage.getItem(key);
    if (!cached) return null;

    const parsed = JSON.parse(cached) as Partial<UserProfileCacheEntry>;
    if (!parsed.userData || !Array.isArray(parsed.posts)) return null;

    return {
      currentLastId: parsed.currentLastId ?? 0,
      hasMorePages: typeof parsed.hasMorePages === 'boolean' ? parsed.hasMorePages : true,
      posts: parsed.posts,
      userData: parsed.userData,
    };
  } catch (error) {
    console.error('Failed to read user profile cache', error);
    return null;
  }
}

function writeUserProfileCache(key: string, value: UserProfileCacheEntry) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to write user profile cache', error);
  }
}

function clearUserProfileCache(key: string) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear user profile cache', error);
  }
}

async function apiJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(buildApiUrl(path), {
    cache: 'no-store',
    credentials: 'include',
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

async function apiText(path: string, init?: RequestInit) {
  const response = await fetch(buildApiUrl(path), {
    cache: 'no-store',
    credentials: 'include',
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.text();
}

function VerifyIcon() {
  return (
    <svg
      className="w-5 h-5 inline fill-blue-500"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
    >
      <path d="M 19.117188 5.0097656 C 17.966069 5.0248122 16.843416 5.649605 16.279297 6.7402344 L 14.910156 9.3867188 C 14.870216 9.4640098 14.795234 9.5079874 14.707031 9.5039062 L 11.730469 9.3671875 L 11.728516 9.3671875 C 9.8600154 9.2815038 8.2783586 10.861716 8.3652344 12.730469 L 8.5039062 15.707031 C 8.5080763 15.797231 8.4651861 15.871559 8.3867188 15.912109 L 5.7402344 17.279297 A 1.50015 1.50015 0 0 0 5.7382812 17.279297 C 4.0775961 18.139227 3.4980775 20.29937 4.5078125 21.875 L 6.1152344 24.382812 C 6.1632214 24.457712 6.1632214 24.544244 6.1152344 24.619141 L 4.5078125 27.126953 C 3.4985264 28.701883 4.0763699 30.863047 5.7382812 31.722656 A 1.50015 1.50015 0 0 0 5.7402344 31.722656 L 8.3867188 33.089844 C 8.4640098 33.129784 8.5079873 33.206719 8.5039062 33.294922 L 8.3652344 36.271484 C 8.2783274 38.140905 9.8610476 39.721672 11.730469 39.634766 L 14.707031 39.498047 C 14.797231 39.493847 14.869606 39.536767 14.910156 39.615234 L 16.279297 42.261719 A 1.50015 1.50015 0 0 0 16.279297 42.263672 C 17.139227 43.924354 19.297416 44.501922 20.873047 43.492188 L 23.382812 41.884766 C 23.457712 41.836776 23.542291 41.836776 23.617188 41.884766 L 26.126953 43.492188 C 27.701883 44.501474 29.861094 43.92363 30.720703 42.261719 L 32.089844 39.615234 C 32.129784 39.537944 32.204766 39.493966 32.292969 39.498047 L 35.271484 39.634766 C 37.140031 39.720446 38.721641 38.140237 38.634766 36.271484 L 38.496094 33.294922 C 38.491894 33.204722 38.534814 33.130394 38.613281 33.089844 L 41.259766 31.722656 A 1.50015 1.50015 0 0 0 41.261719 31.722656 C 42.922401 30.862726 43.501922 28.702584 42.492188 27.126953 L 40.884766 24.619141 C 40.836776 24.544241 40.836776 24.457709 40.884766 24.382812 L 42.492188 21.875 C 43.501474 20.30007 42.92363 18.138906 41.261719 17.279297 A 1.50015 1.50015 0 0 0 41.259766 17.279297 L 38.613281 15.912109 C 38.535991 15.872169 38.492013 15.795234 38.496094 15.707031 L 38.634766 12.730469 C 38.721636 10.861716 37.140031 9.2815038 35.271484 9.3671875 L 35.269531 9.3671875 L 32.292969 9.5039062 C 32.202769 9.5080763 32.130394 9.4651861 32.089844 9.3867188 L 30.720703 6.7402344 C 29.860773 5.0795523 27.702584 4.5000306 26.126953 5.5097656 L 23.617188 7.1171875 C 23.542288 7.1651745 23.45771 7.1651745 23.382812 7.1171875 L 20.873047 5.5097656 C 20.479314 5.2574441 20.048746 5.1027764 19.611328 5.0410156 C 19.447297 5.0178554 19.281633 5.0076161 19.117188 5.0097656 z M 19.076172 7.9941406 C 19.128876 7.9803047 19.189371 7.9937992 19.253906 8.0351562 L 21.763672 9.6425781 C 22.818775 10.318591 24.181225 10.318591 25.236328 9.6425781 L 27.746094 8.0351562 C 27.874463 7.9528913 27.986571 7.9838236 28.056641 8.1191406 L 29.423828 10.765625 C 29.999525 11.878386 31.180326 12.559763 32.431641 12.501953 L 35.410156 12.363281 C 35.562735 12.356181 35.643812 12.439221 35.636719 12.591797 L 35.5 15.568359 C 35.44208 16.820157 36.121619 18.000114 37.236328 18.576172 L 39.882812 19.945312 C 40.016877 20.015773 40.049034 20.127542 39.966797 20.255859 L 38.357422 22.763672 A 1.50015 1.50015 0 0 0 38.357422 22.765625 C 37.681409 23.820728 37.681409 25.181225 38.357422 26.236328 A 1.50015 1.50015 0 0 0 38.357422 26.238281 L 39.966797 28.746094 C 40.048587 28.873715 40.016122 28.98648 39.882812 29.056641 L 37.236328 30.425781 C 36.122795 31.001231 35.442167 32.181791 35.5 33.433594 L 35.636719 36.410156 C 35.643819 36.562735 35.562739 36.645765 35.410156 36.638672 L 32.431641 36.5 C 31.179843 36.44208 29.999886 37.123572 29.423828 38.238281 L 28.056641 40.884766 C 27.986251 41.020854 27.875164 41.049512 27.746094 40.966797 L 25.236328 39.359375 C 24.181225 38.683362 22.818775 38.683362 21.763672 39.359375 L 19.253906 40.966797 C 19.125537 41.049057 19.013429 41.018122 18.943359 40.882812 L 17.576172 38.238281 C 17.000722 37.124749 15.820162 36.442167 14.568359 36.5 L 11.589844 36.638672 C 11.437265 36.645772 11.356188 36.562732 11.363281 36.410156 L 11.5 33.433594 C 11.55792 32.181796 10.878381 31.001839 9.7636719 30.425781 L 7.1171875 29.056641 C 6.9831238 28.98618 6.9509714 28.874411 7.0332031 28.746094 L 8.6425781 26.238281 A 1.50015 1.50015 0 0 0 8.6425781 26.236328 C 9.3185911 25.181225 9.3185911 23.820728 8.6425781 22.765625 A 1.50015 1.50015 0 0 0 8.6425781 22.763672 L 7.0332031 20.255859 C 6.9514181 20.128238 6.9838705 20.015473 7.1171875 19.945312 L 9.7636719 18.576172 C 10.877205 18.000816 11.557833 16.820162 11.5 15.568359 L 11.363281 12.591797 C 11.356181 12.439218 11.437261 12.356188 11.589844 12.363281 L 14.568359 12.501953 C 15.819669 12.559853 16.999868 11.879561 17.576172 10.765625 L 17.576172 10.763672 L 18.943359 8.1171875 C 18.978554 8.0491432 19.023468 8.0079766 19.076172 7.9941406 z M 31.28125 17.988281 A 1.50015 1.50015 0 0 0 30.34375 18.289062 C 27.039034 20.710403 24.034498 23.748337 21.240234 27.203125 C 19.921503 25.633951 18.557285 24.247502 17.060547 23.251953 A 1.50015 1.50015 0 1 0 15.398438 25.748047 C 16.957756 26.785221 18.498201 28.340758 20.025391 30.394531 A 1.50015 1.50015 0 0 0 22.425781 30.404297 C 25.375009 26.507068 28.605658 23.283807 32.117188 20.710938 A 1.50015 1.50015 0 0 0 31.28125 17.988281 z"></path>
    </svg>
  );
}

function EmptyIllustration({
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
      <span className="text-base text-zinc-200 w-full text-center font-black">{title}</span>
      {description ? (
        <span className="text-sm text-zinc-400 w-full text-center font-medium">{description}</span>
      ) : null}
    </div>
  );
}

function ProfileSkeleton() {
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

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path d="M 40.5 6 C 40.11625 6 39.732453 6.1464531 39.439453 6.4394531 L 21.462891 24.417969 L 20 28 L 23.582031 26.537109 L 41.560547 8.5605469 C 42.145547 7.9745469 42.145547 7.0254531 41.560547 6.4394531 C 41.267547 6.1464531 40.88375 6 40.5 6 z M 12.5 7 C 9.4802259 7 7 9.4802259 7 12.5 L 7 35.5 C 7 38.519774 9.4802259 41 12.5 41 L 35.5 41 C 38.519774 41 41 38.519774 41 35.5 L 41 18.5 A 1.50015 1.50015 0 1 0 38 18.5 L 38 35.5 C 38 36.898226 36.898226 38 35.5 38 L 12.5 38 C 11.101774 38 10 36.898226 10 35.5 L 10 12.5 C 10 11.101774 11.101774 10 12.5 10 L 29.5 10 A 1.50015 1.50015 0 1 0 29.5 7 L 12.5 7 z"></path>
    </svg>
  );
}

function FriendAddIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path d="M 17 2 C 11.494917 2 7 6.494921 7 12 C 7 17.505079 11.494917 22 17 22 C 22.505083 22 27 17.505079 27 12 C 27 6.494921 22.505083 2 17 2 z M 17 5 C 20.883764 5 24 8.1162385 24 12 C 24 15.883762 20.883764 19 17 19 C 13.116236 19 10 15.883762 10 12 C 10 8.1162385 13.116236 5 17 5 z M 35 24 C 28.925 24 24 28.925 24 35 C 24 41.075 28.925 46 35 46 C 41.075 46 46 41.075 46 35 C 46 28.925 41.075 24 35 24 z M 6.2226562 26 C 4.1706562 26 2.5 27.784516 2.5 29.978516 L 2.5 31.5 C 2.5 34.781 4.1953906 37.632344 7.2753906 39.527344 C 9.8663906 41.122344 13.32 42 17 42 C 19.19 42 21.431516 41.675766 23.478516 41.009766 C 23.018516 40.128766 22.664062 39.186172 22.414062 38.201172 C 20.717062 38.735172 18.837 39 17 39 C 11.461 39 5.5 36.653 5.5 31.5 L 5.5 29.978516 C 5.5 29.447516 5.8316562 29 6.2226562 29 L 23.474609 29 C 24.049609 27.897 24.778813 26.889 25.632812 26 L 6.2226562 26 z M 35 27 C 35.552 27 36 27.448 36 28 L 36 34 L 42 34 C 42.552 34 43 34.448 43 35 C 43 35.552 42.552 36 42 36 L 36 36 L 36 42 C 36 42.552 35.552 43 35 43 C 34.448 43 34 42.552 34 42 L 34 36 L 28 36 C 27.448 36 27 35.552 27 35 C 27 34.448 27.448 34 28 34 L 34 34 L 34 28 C 34 27.448 34.448 27 35 27 z"></path>
    </svg>
  );
}

function FriendDeleteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path d="M 17 2 C 11.494917 2 7 6.494921 7 12 C 7 17.505079 11.494917 22 17 22 C 22.505083 22 27 17.505079 27 12 C 27 6.494921 22.505083 2 17 2 z M 17 5 C 20.883764 5 24 8.1162385 24 12 C 24 15.883762 20.883764 19 17 19 C 13.116236 19 10 15.883762 10 12 C 10 8.1162385 13.116236 5 17 5 z M 35 24 C 28.925 24 24 28.925 24 35 C 24 41.075 28.925 46 35 46 C 41.075 46 46 41.075 46 35 C 46 28.925 41.075 24 35 24 z M 6.2226562 26 C 4.1696563 26 2.5 27.784516 2.5 29.978516 L 2.5 31.5 C 2.5 34.781 4.1953906 37.632344 7.2753906 39.527344 C 9.8663906 41.122344 13.32 42 17 42 C 19.19 42 21.431516 41.675766 23.478516 41.009766 C 23.018516 40.128766 22.664062 39.186172 22.414062 38.201172 C 20.717062 38.735172 18.837 39 17 39 C 11.461 39 5.5 36.653 5.5 31.5 L 5.5 29.978516 C 5.5 29.447516 5.8306562 29 6.2226562 29 L 23.474609 29 C 24.049609 27.897 24.778812 26.889 25.632812 26 L 6.2226562 26 z M 30 29 C 30.25575 29 30.511531 29.097469 30.707031 29.292969 L 35 33.585938 L 39.292969 29.292969 C 39.683969 28.901969 40.316031 28.901969 40.707031 29.292969 C 41.098031 29.683969 41.098031 30.316031 40.707031 30.707031 L 36.414062 35 L 40.707031 39.292969 C 41.098031 39.683969 41.098031 40.316031 40.707031 40.707031 C 40.512031 40.902031 40.256 41 40 41 C 39.744 41 39.487969 40.902031 39.292969 40.707031 L 35 36.414062 L 30.707031 40.707031 C 30.512031 40.902031 30.256 41 30 41 C 29.744 41 29.487969 40.902031 29.292969 40.707031 C 28.901969 40.316031 28.901969 39.683969 29.292969 39.292969 L 33.585938 35 L 29.292969 30.707031 C 28.901969 30.316031 28.901969 29.683969 29.292969 29.292969 C 29.488469 29.097469 29.74425 29 30 29 z"></path>
    </svg>
  );
}

function ProfileMediaButton({
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
      <PencilIcon className="w-6 h-6 fill-white inline" />
    </button>
  );
}

function ProfileAvatar({
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
        'shadow duration-300 rounded-full bg-cover bg-center',
        sizeClassName,
        isOnline && 'ring-2 ring-lime-500 ring-offset-2 ring-offset-zinc-900',
      )}
      style={{ backgroundImage: `url('${image}')` }}
    />
  );
}

function UserMiniCard({
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
      <div
        className={cn(
          'w-16 h-16 rounded-full shadow duration-300 border-2 border-transparent group-hover:border-purple-500 bg-cover bg-center',
          isOnline && 'ring-2 ring-lime-500 ring-offset-2 ring-offset-zinc-900',
        )}
        style={{ backgroundImage: `url('${image}')` }}
      />
      <span className="text-zinc-300 w-16 text-center text-sm truncate">{label}</span>
    </button>
  );
}

function GroupMiniCard({
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
      <div
        className="w-16 h-16 rounded-full shadow duration-300 border-2 border-transparent group-hover:border-purple-500 bg-cover bg-center"
        style={{ backgroundImage: `url('${image}')` }}
      />
      <span className="text-zinc-300 w-16 text-center text-sm truncate">{label}</span>
    </button>
  );
}

function PeopleSection({
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
      <div className="w-full px-3 mb-3 overflow-x-auto flex md:rounded-2xl">
        <div className="flex flex-row flex-nowrap gap-3 justify-center items-center">{children}</div>
      </div>
    </div>
  );
}

function RelationGridModal({
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
            const image =
              item.img || 'https://ancial.ru/includes/img/new_user.png';

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
                    <div
                      className="rounded-full w-16 h-16 shadow shrink-0 bg-center bg-cover"
                      style={{ backgroundImage: `url('${image}')` }}
                    />
                  </div>
                  <p className="text-center truncate overflow-hidden w-20">{group.name || ''}</p>
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
                  <div
                    className={cn(
                      'rounded-full w-16 h-16 shadow shrink-0 bg-center bg-cover',
                      flag(user.online) && 'ring-2 ring-lime-500 ring-offset-2 ring-offset-zinc-900',
                    )}
                    style={{ backgroundImage: `url('${image}')` }}
                  />
                </div>
                <p className="text-center truncate overflow-hidden w-20">{user.fname || ''}</p>
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

function FeedCommentCard({
  comment,
  deleteLabel,
  onDelete,
  onNavigateToUser,
  onReport,
  reportLabel,
}: {
  comment: FeedComment;
  deleteLabel: string;
  onDelete: (comment: FeedComment) => void;
  onNavigateToUser: (username: string) => void;
  onReport: (comment: FeedComment) => void;
  reportLabel: string;
}) {
  return (
    <div
      id={`comment${comment.id}`}
      className="p-3 border border-zinc-600/30 duration-300 rounded-3xl bg-zinc-800/50 flex flex-col w-full shadow"
    >
      <div className="text-sm lg:text-base text-zinc-200 font-medium flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onNavigateToUser(comment.user.username)}
          className="active:scale-95 duration-300 w-10 h-10 rounded-3xl shadow bg-cover bg-center"
          style={{ backgroundImage: `url('${comment.user.img}')` }}
        />

        <div className="flex flex-col flex-grow">
          <button
            type="button"
            onClick={() => onNavigateToUser(comment.user.username)}
            className="cursor-pointer hover:text-zinc-100 duration-300 font-meduim w-fit text-left flex items-center gap-1.5"
          >
            <span>{comment.user.name}</span>
            {flag(comment.user.is_verified) ? <VerifyIcon /> : null}
          </button>
          <span className="text-zinc-300 text-xs">{comment.date}</span>
        </div>

        <Dropdown
          triggerSize="sm"
          triggerIcon="IC-more"
          triggerAriaLabel="Comment actions"
          position="left"
          align="start"
          triggerClassName="hover:bg-zinc-800/50"
          menuClassName="-mt-8 min-w-44 rounded-2xl"
        >
          {flag(comment.is_own_comment) ? (
            <DropdownItem
              onClick={() => onDelete(comment)}
              icon="IC-times"
              className="p-1 text-sm"
              iconClassName="w-5 h-5"
            >
              {deleteLabel}
            </DropdownItem>
          ) : null}
          <DropdownItem
            onClick={() => onReport(comment)}
            icon="IC-report"
            className="p-1 text-sm"
            iconClassName="w-5 h-5"
          >
            {reportLabel}
          </DropdownItem>
        </Dropdown>
      </div>

      <div className="text-base lg:text-lg text-zinc-200 font-medium">{comment.content}</div>
    </div>
  );
}

function CommentsEmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="text-center w-full flex flex-col gap-0.5 justify-center items-center">
      <Image
        src="/img/status/nothingfound.webp"
        alt="No comments"
        width={224}
        height={224}
        className="h-56 w-auto"
      />
      <span className="text-base text-zinc-100 w-full text-center font-black">{title}</span>
      <span className="text-sm text-zinc-300 w-full text-center font-medium">{description}</span>
    </div>
  );
}

export default function UserProfileContent({ login }: { login: string }) {
  const router = useRouter();
  const { checkAuth, isAuthenticated, isLoading: authLoading, lang, user } = useAuth();
  const { showNote } = useNotification();

  const abortRef = useRef<AbortController | null>(null);
  const currentLastIdRef = useRef<Id>(0);
  const hasMorePagesRef = useRef(true);
  const profileIdRef = useRef<Id | null>(null);
  const loadPostsRef = useRef<
    (
      profileId: Id,
      lastId: Id,
      append?: boolean,
      options?: { preserveExisting?: boolean },
    ) => Promise<void>
  >(async () => {});
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserPageData | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [activeCommentsPost, setActiveCommentsPost] = useState<PostData | null>(null);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PostData | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [isSubscribersModalOpen, setIsSubscribersModalOpen] = useState(false);
  const [isGroupsModalOpen, setIsGroupsModalOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const profileCacheKey = useMemo(
    () => getUserProfileCacheKey(login, user?.id, isAuthenticated),
    [isAuthenticated, login, user?.id],
  );

  const strings = useMemo(() => {
    const fallback = {
      accept: 'Принять',
      add: 'Добавить',
      blockedaccdesc: 'Аккаунт заблокирован',
      bookmarkadded: 'Добавлено в закладки',
      bookmarked: 'В закладках',
      bookmarkremoved: 'Удалено из закладок',
      candidimage: 'Откровенное изображение',
      cancel: 'Отменить',
      copylink: 'Скопировать ссылку',
      delete: 'Удалить',
      deletepost: 'Удалить пост',
      dialogblocked: 'Диалог заблокирован',
      dialogcreated: 'Диалог создан',
      emptycomments: 'Комментариев пока нет',
      emptycommentsdesc: 'Будьте первым, кто что-то напишет.',
      errorhappend: 'Произошла ошибка =(',
      friends: 'Друзья',
      groups: 'Сообщества',
      home: 'Home',
      langname: 'en',
      less: 'Скрыть',
      linkcopied: 'Ссылка скопирована',
      loading: 'Загрузка...',
      logintoreact: 'Войдите, чтобы взаимодействовать с публикациями',
      more: 'Подробнее',
      no: 'Нет',
      noposts: 'Постов пока нет',
      nopostsdesc: 'У этого пользователя пока нет публикаций.',
      pagenotfound: 'Пользователь не найден',
      postcomments: 'Комментарии',
      prohibitedgood: 'Запрещённый товар',
      propertyrights: 'Нарушение интеллектуальных прав',
      reallywantdeletepost: 'Вы действительно хотите удалить пост?',
      report: 'Пожаловаться',
      scam: 'Обман',
      share: 'Поделиться',
      somethingwrong: 'Что-то пошло не так',
      spam: 'Спам',
      subscribers: 'Подписчики',
      successProfileUpdate: 'Это успех! Все готово, проверяйте!',
      tbookmark: 'В закладки',
      updateprofilecover: 'Обновить обложку профиля',
      updateprofilepicture: 'Обновить фото профиля',
      uploadphoto: 'Выберите изображение',
      violence: 'Насилие и вражда',
      writecomment: 'Напишите комментарий',
      writetouser: 'Написать',
      yes: 'Да',
    };

    return {
      accept: lang?.accept || fallback.accept,
      blockedaccdesc: lang?.blockedaccdesc || fallback.blockedaccdesc,
      bookmarkadded: lang?.bookmarkadded || fallback.bookmarkadded,
      bookmarked: lang?.bookmarked || fallback.bookmarked,
      bookmarkremoved: lang?.bookmarkremoved || fallback.bookmarkremoved,
      candidimage: lang?.candidimage || fallback.candidimage,
      cancel: lang?.cancel || fallback.cancel,
      copylink: lang?.copylink || fallback.copylink,
      delete: lang?.delete || fallback.delete,
      deletepost: lang?.deletepost || fallback.deletepost,
      dialogblocked: lang?.dialogblocked || fallback.dialogblocked,
      dialogcreated: lang?.dialogcreated || fallback.dialogcreated,
      edit: lang?.edit || 'Редактировать',
      emptycomments: lang?.emptycomments || fallback.emptycomments,
      emptycommentsdesc: lang?.emptycommentsdesc || fallback.emptycommentsdesc,
      errorhappend: lang?.errorhappend || fallback.errorhappend,
      friends: lang?.friends || fallback.friends,
      groups: lang?.groups || fallback.groups,
      home: lang?.Home || lang?.home || fallback.home,
      langname: lang?.langname || fallback.langname,
      less: lang?.less || fallback.less,
      linkcopied: lang?.linkcopied || fallback.linkcopied,
      loading: lang?.['loading...'] || fallback.loading,
      logintoreact: lang?.logintoreact || fallback.logintoreact,
      more: lang?.more || fallback.more,
      no: lang?.no || fallback.no,
      noposts: lang?.noposts || fallback.noposts,
      nopostsdesc: lang?.nopostsdesc || fallback.nopostsdesc,
      pagenotfound: lang?.pagenotfound || fallback.pagenotfound,
      postcomments: lang?.postcomments || fallback.postcomments,
      prohibitedgood: lang?.prohibitedgood || fallback.prohibitedgood,
      propertyrights: lang?.propertyrights || fallback.propertyrights,
      reallywantdeletepost: lang?.reallywantdeletepost || fallback.reallywantdeletepost,
      report: lang?.report || fallback.report,
      scam: lang?.scam || fallback.scam,
      share: lang?.share || fallback.share,
      somethingwrong: lang?.somethingwrong || fallback.somethingwrong,
      spam: lang?.spam || fallback.spam,
      subscribers: lang?.subscribers || fallback.subscribers,
      successProfileUpdate: fallback.successProfileUpdate,
      tobookmarks: lang?.tobookmarks || fallback.tbookmark,
      updateprofilecover: lang?.updateprofilecover || fallback.updateprofilecover,
      updateprofilepicture: lang?.updateprofilepicture || fallback.updateprofilepicture,
      uploadphoto: lang?.photo || fallback.uploadphoto,
      violence: lang?.violence || fallback.violence,
      writecomment: lang?.writecomment || fallback.writecomment,
      writetouser: lang?.writetouser || fallback.writetouser,
      yes: lang?.yes || fallback.yes,
      add: lang?.add || fallback.add,
    };
  }, [lang]);

  const postCardLang: Partial<PostCardLang> = {
    adultContentWarning:
      lang?.adult_content_warning || 'Изображение может содержать контент 18+',
    bookmarked: strings.bookmarked,
    delete: strings.delete,
    edit: strings.edit,
    less: strings.less,
    more: strings.more,
    report: strings.report,
    share: strings.share,
    tobookmarks: strings.tobookmarks,
    translate: lang?.translate || 'Перевести',
  };

  const hasFriends = Boolean(userData?.friends?.length);
  const hasSubscribers = Boolean(userData?.subscribers?.length);
  const hasGroups = Boolean(userData?.groups?.length);

  const navigateToUser = useCallback(
    (username: string | null | undefined) => {
      if (!username) return;
      router.push(`/@${username}`);
    },
    [router],
  );

  const navigateToGroup = useCallback(
    (slnk: string | null | undefined) => {
      if (!slnk) return;
      router.push(`/$${slnk}`);
    },
    [router],
  );

  const loadComments = useCallback(
    async (postId: Id) => {
      setIsCommentsLoading(true);

      try {
        const nextComments = await apiJson<FeedComment[]>(`/api/posts/comments.php?id=${postId}`);
        setComments(Array.isArray(nextComments) ? nextComments : []);
      } catch (nextError) {
        console.error('Failed to load comments', nextError);
        setComments([]);
        showNote({
          content: strings.somethingwrong,
          type: 'error',
          time: 5,
        });
      } finally {
        setIsCommentsLoading(false);
      }
    },
    [showNote, strings.somethingwrong],
  );

  const updatePost = useCallback((postId: Id, updater: (post: PostData) => PostData) => {
    setPosts((currentPosts) =>
      currentPosts.map((currentPost) =>
        String(currentPost.id) === String(postId) ? updater(currentPost) : currentPost,
      ),
    );
  }, []);

  const loadProfile = useCallback(
    async (options?: { preserveExisting?: boolean }) => {
      const preserveExisting = options?.preserveExisting ?? false;

      if (!preserveExisting) {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await apiJson<UserPageResponse>(
          `/api/user/get_user_page.php?login=${encodeURIComponent(login)}`,
        );

        if (!response.success || !response.data) {
          clearUserProfileCache(profileCacheKey);
          setUserData(null);
          profileIdRef.current = null;
          setError(response.error || strings.pagenotfound);
          setPosts([]);
          setPostsLoading(false);
          currentLastIdRef.current = 0;
          setHasMorePages(false);
          hasMorePagesRef.current = false;
          return;
        }

        if (String(response.data.active ?? 1) === '0') {
          clearUserProfileCache(profileCacheKey);
          setUserData(null);
          profileIdRef.current = null;
          setError(strings.blockedaccdesc);
          setPosts([]);
          setPostsLoading(false);
          currentLastIdRef.current = 0;
          setHasMorePages(false);
          hasMorePagesRef.current = false;
          return;
        }

        setUserData(response.data);
        profileIdRef.current = response.data.id;
        setError(null);

        if (!preserveExisting) {
          setPosts([]);
          currentLastIdRef.current = 0;
          setHasMorePages(true);
          hasMorePagesRef.current = true;
          setPostsLoading(true);
        }

        void loadPostsRef.current(response.data.id, 0, false, { preserveExisting });
      } catch (nextError) {
        console.error('Failed to load profile', nextError);

        if (!preserveExisting) {
          setUserData(null);
          profileIdRef.current = null;
          setError(strings.somethingwrong);
          setPosts([]);
          setPostsLoading(false);
          currentLastIdRef.current = 0;
          setHasMorePages(false);
          hasMorePagesRef.current = false;
        }
      } finally {
        if (!preserveExisting) {
          setLoading(false);
        }
      }
    },
    [login, profileCacheKey, strings.blockedaccdesc, strings.pagenotfound, strings.somethingwrong],
  );

  const loadPosts = useCallback(
    async (
      profileId: Id,
      lastId: Id,
      append = false,
      options?: { preserveExisting?: boolean },
    ) => {
      if (!profileId) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (append) {
        setIsLoadingMore(true);
      } else {
        const preserveExisting = options?.preserveExisting ?? false;
        if (!preserveExisting) {
          setPostsLoading(true);
        }
      }

      try {
        const response = await apiJson<FeedResponse>(
          `/api/posts/feed.php?last_id=${lastId}&id=${profileId}&type=1`,
          { signal: controller.signal },
        );

        if (controller.signal.aborted) return;

        const nextPosts = Array.isArray(response.posts) ? response.posts : [];

        if (nextPosts.length > 0) {
          const nextLastId = response.last_id ?? lastId;
          const nextHasMorePages = Boolean(response.has_more);

          setPosts((currentPosts) => (append ? [...currentPosts, ...nextPosts] : nextPosts));
          currentLastIdRef.current = nextLastId;
          setHasMorePages(nextHasMorePages);
          hasMorePagesRef.current = nextHasMorePages;
        } else if (!append) {
          setPosts([]);
          currentLastIdRef.current = 0;
          setHasMorePages(false);
          hasMorePagesRef.current = false;
        } else {
          setHasMorePages(false);
          hasMorePagesRef.current = false;
        }
      } catch (nextError) {
        if (nextError instanceof DOMException && nextError.name === 'AbortError') {
          return;
        }

        console.error('Failed to load user posts', nextError);

        if (!append && !options?.preserveExisting) {
          setPosts([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setPostsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [],
  );

  loadPostsRef.current = loadPosts;

  useEffect(() => {
    if (authLoading) return;

    const cached = readUserProfileCache(profileCacheKey);
    if (cached) {
      setError(null);
      setUserData(cached.userData);
      profileIdRef.current = cached.userData.id;
      setPosts(cached.posts);
      setPostsLoading(false);
      currentLastIdRef.current = cached.currentLastId;
      setHasMorePages(cached.hasMorePages);
      hasMorePagesRef.current = cached.hasMorePages;
      setLoading(false);
      void loadProfile({ preserveExisting: true });
      return;
    }

    void loadProfile();

    return () => {
      abortRef.current?.abort();
    };
  }, [authLoading, loadProfile, profileCacheKey]);

  useEffect(() => {
    if (loading || postsLoading || !userData) return;

    writeUserProfileCache(profileCacheKey, {
      currentLastId: currentLastIdRef.current,
      hasMorePages,
      posts,
      userData,
    });
  }, [hasMorePages, loading, posts, postsLoading, profileCacheKey, userData]);

  useEffect(() => {
    const indicator = loadMoreRef.current;
    if (!indicator) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!hasMorePagesRef.current || postsLoading || isLoadingMore) return;
        if (!profileIdRef.current) return;

        void loadPostsRef.current(profileIdRef.current, currentLastIdRef.current, true);
      },
      { rootMargin: '0px 0px 20% 0px' },
    );

    observer.observe(indicator);
    return () => observer.disconnect();
  }, [isLoadingMore, posts.length, postsLoading, userData?.id]);

  const handleBookmark = async (post: PostData, nextValue: boolean) => {
    try {
      const response = await apiText(`/api/posts/bookmarks.php?pid=${post.id}`);

      showNote({
        content: response,
        html: true,
        type: 'success',
        time: 5,
      });

      updatePost(post.id, (currentPost) => {
        const isAdded = response === strings.bookmarkadded;
        const isRemoved = response === strings.bookmarkremoved;
        const nextBookmarked = isAdded ? true : isRemoved ? false : nextValue;
        const currentAmount = toNumber(currentPost.bookmarked_amount);

        return {
          ...currentPost,
          is_bookmarked: nextBookmarked,
          bookmarked_amount: Math.max(
            0,
            isAdded
              ? currentAmount + 1
              : isRemoved
                ? currentAmount - 1
                : currentAmount + (nextBookmarked ? 1 : -1),
          ),
        };
      });
    } catch (nextError) {
      console.error('Bookmark failed', nextError);
      showNote({
        content: strings.somethingwrong,
        type: 'error',
        time: 5,
      });
    }
  };

  const handleVote = async (post: PostData, direction: 'up' | 'down') => {
    try {
      const response = await apiText(`/api/posts/vote.php?pid=${post.id}&vt=${direction}`);

      if (response === 'nlog') {
        showNote({
          content: strings.logintoreact,
          type: 'success',
          time: 5,
        });
        return;
      }

      updatePost(post.id, (currentPost) => {
        const currentVote =
          currentPost.user_vote_up === 'voted'
            ? 'up'
            : currentPost.user_vote_down === 'voted'
              ? 'down'
              : null;

        if (direction === 'up') {
          if (currentVote === 'up') return currentPost;

          if (currentVote === 'down') {
            return {
              ...currentPost,
              rating: toNumber(currentPost.rating) + 1,
              user_vote_down: null,
              user_vote_up: null,
            };
          }

          return {
            ...currentPost,
            rating: toNumber(currentPost.rating) + 1,
            user_vote_down: null,
            user_vote_up: 'voted',
          };
        }

        if (currentVote === 'down') return currentPost;

        if (currentVote === 'up') {
          return {
            ...currentPost,
            rating: toNumber(currentPost.rating) - 1,
            user_vote_down: null,
            user_vote_up: null,
          };
        }

        return {
          ...currentPost,
          rating: toNumber(currentPost.rating) - 1,
          user_vote_down: 'voted',
          user_vote_up: null,
        };
      });
    } catch (nextError) {
      console.error('Vote failed', nextError);
      showNote({
        content: strings.somethingwrong,
        type: 'error',
        time: 5,
      });
    }
  };

  const translatePost = async (post: PostData) => {
    const htmlToText = (value: string | null | undefined) => {
      const container = document.createElement('div');
      container.innerHTML = value ?? '';
      return container.textContent || container.innerText || '';
    };

    const translateText = async (sourceText: string) => {
      const url =
        'https://translate.googleapis.com/translate_a/single?client=gtx' +
        `&sl=auto&tl=${encodeURIComponent(strings.langname)}&dt=t&q=${encodeURIComponent(sourceText)}`;

      const response = await fetch(url, { cache: 'no-store' });
      const data = (await response.json()) as unknown[];

      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translatedText = (data[0] as Array<[string]>)
          .map((item) => item?.[0])
          .filter(Boolean)
          .join('');

        return translatedText || sourceText;
      }

      return sourceText;
    };

    try {
      const [translatedTitle, translatedContent] = await Promise.all([
        translateText(htmlToText(post.title)),
        translateText(htmlToText(post.content)),
      ]);

      updatePost(post.id, (currentPost) => ({
        ...currentPost,
        title: translatedTitle,
        content: translatedContent,
      }));
    } catch (nextError) {
      console.error('Translate failed', nextError);
    }
  };

  const openCommentsModal = (post: PostData) => {
    setActiveCommentsPost(post);
    setComments([]);
    setCommentInput('');
    setIsCommentsModalOpen(true);
    void loadComments(post.id);
  };

  const incrementCommentsCount = useCallback((postId: Id, delta: number) => {
    updatePost(postId, (currentPost) => ({
      ...currentPost,
      comments_count: Math.max(0, toNumber(currentPost.comments_count) + delta),
    }));
  }, [updatePost]);

  const handleCreateComment = async () => {
    if (!activeCommentsPost) return;
    if (!commentInput.trim()) return;

    try {
      await apiText(`/api/posts/createcomment.php?pid=${activeCommentsPost.id}`, {
        body: new URLSearchParams({ content: commentInput.trim() }).toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      });

      setCommentInput('');
      incrementCommentsCount(activeCommentsPost.id, 1);
      await loadComments(activeCommentsPost.id);
    } catch (nextError) {
      console.error('Create comment failed', nextError);
      showNote({
        content: strings.somethingwrong,
        type: 'error',
        time: 5,
      });
    }
  };

  const handleDeleteComment = async (comment: FeedComment) => {
    try {
      const response = await apiText(`/api/posts/deletecomment.php?id=${comment.id}`);

      showNote({
        content: response,
        html: true,
        type: 'success',
        time: 5,
      });

      setComments((currentComments) =>
        currentComments.filter((currentComment) => String(currentComment.id) !== String(comment.id)),
      );

      if (activeCommentsPost) {
        incrementCommentsCount(activeCommentsPost.id, -1);
      }
    } catch (nextError) {
      console.error('Delete comment failed', nextError);
      showNote({
        content: strings.somethingwrong,
        type: 'error',
        time: 5,
      });
    }
  };

  const handleReport = async (reason: string) => {
    if (!reportTarget) return;

    const currentTarget = reportTarget;
    setIsReportModalOpen(false);

    try {
      const response = await apiText(
        `/api/posts/report.php?id=${currentTarget.id}&type=${currentTarget.type}&comment=${encodeURIComponent(reason)}`,
      );

      showNote({
        content: response,
        html: true,
        type: 'success',
        time: 5,
      });
    } catch (nextError) {
      console.error('Report failed', nextError);
      showNote({
        content: strings.somethingwrong,
        type: 'error',
        time: 5,
      });
    }
  };

  const handleDeletePost = async () => {
    if (!deleteTarget) return;

    const currentTarget = deleteTarget;
    setIsDeleteModalOpen(false);

    try {
      const response = await apiText(
        `/api/posts/delete.php?pid=${currentTarget.id}&gid=${currentTarget.author.id}`,
      );

      showNote({
        content: response,
        html: true,
        type: 'success',
        time: 5,
      });

      setPosts((currentPosts) =>
        currentPosts.filter((currentPost) => String(currentPost.id) !== String(currentTarget.id)),
      );

      if (activeCommentsPost && String(activeCommentsPost.id) === String(currentTarget.id)) {
        setIsCommentsModalOpen(false);
        setActiveCommentsPost(null);
      }
    } catch (nextError) {
      console.error('Delete post failed', nextError);
      showNote({
        content: strings.errorhappend,
        type: 'error',
        time: 10,
      });
    }
  };

  const handleShareTo = (service: 'vk' | 'tg' | 'x') => {
    if (!shareUrl) return;

    if (service === 'vk') {
      window.open(
        `https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}`,
        'Поделиться',
        'width=800, height=600',
      );
      return;
    }

    if (service === 'tg') {
      window.open(
        `https://telegram.me/share/url?url=${encodeURIComponent(shareUrl)}`,
        'Поделиться',
        'width=800, height=600',
      );
      return;
    }

    window.open(
      `http://twitter.com/share?url=${encodeURIComponent(shareUrl)}`,
      'Поделиться',
      'width=800, height=600',
    );
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      showNote({
        content: strings.linkcopied,
        type: 'success',
        time: 5,
      });
    } catch (nextError) {
      console.error('Copy link failed', nextError);
      showNote({
        content: strings.somethingwrong,
        type: 'error',
        time: 5,
      });
    }
  };

  const handleFriendButtonClick = async () => {
    const friendButton = userData?.friend_button;
    if (!friendButton) return;

    const token = localStorage.getItem('token') || '';

    let path = '';
    if (friendButton.action === 'delete' || friendButton.action === 'cancel') {
      path = `/api/friends/delete.php?frid=${friendButton.relation_id}&token=${encodeURIComponent(token)}`;
    } else if (friendButton.action === 'accept') {
      path = `/api/friends/add.php?frid=${friendButton.relation_id}&token=${encodeURIComponent(token)}`;
    } else if (friendButton.action === 'add') {
      path = `/api/friends/create.php?fid=${friendButton.target_id}&token=${encodeURIComponent(token)}`;
    }

    if (!path) return;

    try {
      const response = await apiText(path);

      showNote({
        content: response,
        html: true,
        type: 'success',
        time: 5,
      });

      await loadProfile();
    } catch (nextError) {
      console.error('Friend action failed', nextError);
      showNote({
        content: strings.errorhappend,
        type: 'error',
        time: 5,
      });
    }
  };

  const handleCreateDialog = async () => {
    if (!userData) return;

    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(buildApiUrl('/api/messages/createdialog.php'), {
        body: new URLSearchParams({
          token,
          withu: String(userData.id),
        }).toString(),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const html = await response.text();

      if (html === strings.dialogcreated || html === strings.dialogblocked) {
        showNote({
          content: html,
          html: true,
          type: 'success',
          time: 5,
        });
        return;
      }

      router.push(`/messages/${html}`);
    } catch (nextError) {
      console.error('Create dialog failed', nextError);
      showNote({
        content: strings.errorhappend,
        type: 'error',
        time: 5,
      });
    }
  };

  const updateProfileMedia = async (field: 'cover' | 'img', file: File | null) => {
    if (!file) return;

    const setUploading = field === 'img' ? setIsUploadingPhoto : setIsUploadingCover;
    setUploading(true);

    try {
      showNote({
        content: strings.loading,
        type: 'info',
        time: 5,
      });

      const uploadedUrl = await uploadImageToImgbb(file);
      const token = localStorage.getItem('token') || '';
      const body = new URLSearchParams({
        [field]: uploadedUrl,
        token,
      });

      const response = await fetch(buildApiUrl('/api/user/updateinfo.php'), {
        body: body.toString(),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const message = (await response.text()) || strings.successProfileUpdate;

      showNote({
        content: message,
        html: true,
        type: 'success',
        time: 5,
      });

      if (field === 'img') {
        setIsPhotoModalOpen(false);
      } else {
        setIsCoverModalOpen(false);
      }

      await checkAuth();
      await loadProfile();
    } catch (nextError) {
      console.error('Profile media update failed', nextError);
      showNote({
        content: strings.errorhappend,
        type: 'error',
        time: 5,
      });
    } finally {
      setUploading(false);
    }
  };

  const friendButtonConfig = useMemo(() => {
    const button = userData?.friend_button;
    if (!button) return null;

    const isAddAction = button.action === 'add' || button.action === 'accept';

    return {
      colorClassName: isAddAction ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600',
      icon:
        button.action === 'add' || button.action === 'accept' ? (
          <FriendAddIcon className="w-6 h-6 inline fill-white mr-2" />
        ) : (
          <FriendDeleteIcon className="w-6 h-6 inline fill-white mr-2" />
        ),
      label:
        button.action === 'accept'
          ? strings.accept
          : button.action === 'add'
            ? strings.add
            : toNumber(button.status) === 1
              ? strings.delete
              : strings.cancel,
    };
  }, [strings.accept, strings.add, strings.cancel, strings.delete, userData?.friend_button]);

  const currentCover = userData?.cover || '/img/covers/placeholder.png';
  const currentAvatar = userData?.img || 'https://ancial.ru/includes/img/new_user.png';

  return (
    <div className="flex justify-center items-center md:pb-3">
      {loading ? (
        <ProfileSkeleton />
      ) : error ? (
        <div className="flex flex-col gap-3 min-h-screen items-center justify-center -m-3 p-3">
          <Image
            src="/img/status/nothingfound.webp"
            alt="Profile error"
            width={224}
            height={224}
            className="h-56 w-auto"
          />
          <div className="text-center text-zinc-200">{error}</div>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="cursor-pointer px-4 py-2 rounded-3xl shadow bg-purple-500 hover:bg-purple-600 duration-300 active:scale-95 uppercase"
          >
            {strings.home}
          </button>
        </div>
      ) : userData ? (
        <div className="flex flex-col gap-3 items-center flex-grow w-full max-w-screen-2xl">
          <span className="text-3xl font-extralight w-full pt-3 pl-3 md:pl-0 truncate z-[30]">
            @{userData.login}
          </span>

          <div
            className={cn(
              'border border-zinc-600/30 md:border-b bg-zinc-900 md:rounded-3xl flex flex-col w-full md:shadow duration-300 rounded-t-3xl',
              hasFriends || hasSubscribers || hasGroups
                ? 'border-b-0'
                : 'rounded-b-3xl',
            )}
          >
            <div className="relative group flex">
              {isAuthenticated && flag(userData.is_owner) ? (
                <ProfileMediaButton
                  className="absolute top-3 right-3 h-8 w-8 z-[20]"
                  onClick={() => setIsCoverModalOpen(true)}
                />
              ) : null}

              <div
                className="h-32 w-full max-w-screen-2xl object-cover lg:h-48 blur-lg rounded-3xl rounded-b-none bg-cover bg-center"
                style={{ backgroundImage: `url('${currentCover}')` }}
              />
              <div
                className="h-32 w-full max-w-screen-2xl object-cover lg:h-48 absolute rounded-3xl rounded-b-none bg-cover bg-center"
                style={{ backgroundImage: `url('${currentCover}')` }}
              />
            </div>

            <div className="p-3 flex flex-col md:flex-row gap-3">
              <div className="flex gap-1.5 items-center md:-mt-12 md:items-end flex-grow">
                <div className="group relative shrink-0">
                  {flag(userData.is_owner) ? (
                    <ProfileMediaButton
                      className="absolute -top-3 -right-3 w-8 h-8"
                      onClick={() => setIsPhotoModalOpen(true)}
                    />
                  ) : null}

                  <ProfileAvatar
                    image={currentAvatar}
                    isOnline={flag(userData.online)}
                    sizeClassName="h-16 w-16 md:h-24 md:w-24"
                  />
                </div>

                <div className="flex flex-col">
                  <span className="text-xl font-bold text-zinc-100 flex items-center gap-1.5">
                    <span>{`${userData.fname || ''} ${userData.lname || ''}`.trim()}</span>
                    {isAuthenticated && flag(userData.verify) ? <VerifyIcon /> : null}
                  </span>
                  {userData.description?.trim() ? (
                    <span className="text-xs md:text-sm text-zinc-300 lg:truncate lg:w-96">
                      {userData.description}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 items-center shrink-0">
                {isAuthenticated && user && friendButtonConfig ? (
                  <button
                    type="button"
                    onClick={() => void handleFriendButtonClick()}
                    className={cn(
                      'border border-zinc-600/30 flex items-center justify-center px-3 py-1 duration-300 active:scale-95 rounded-3xl w-full md:w-auto cursor-pointer',
                      friendButtonConfig.colorClassName,
                    )}
                  >
                    {friendButtonConfig.icon}
                    {friendButtonConfig.label}
                  </button>
                ) : null}

                {isAuthenticated &&
                user &&
                !flag(userData.is_owner) &&
                String(userData.id) !== String(user?.id) ? (
                  <button
                    type="button"
                    onClick={() => void handleCreateDialog()}
                    className="border border-zinc-600/30 flex items-center justify-center px-3 py-1 bg-zinc-700 hover:bg-zinc-700/70 duration-300 active:scale-95 rounded-3xl w-full md:w-auto cursor-pointer"
                  >
                    <SvgIcon className="inline w-6 h-6 fill-white mr-2" id="IC-comments" />
                    <span>{strings.writetouser}</span>
                  </button>
                ) : null}

                {isAuthenticated && flag(userData.is_owner) ? (
                  <button
                    type="button"
                    onClick={() => router.push('/settings/account')}
                    className="border border-zinc-600/30 flex items-center justify-center px-3 py-1 bg-purple-500 hover:bg-purple-600 duration-300 active:scale-95 rounded-3xl w-full md:w-auto cursor-pointer"
                  >
                    <PencilIcon className="w-6 h-6 fill-white inline mr-2" />
                    <span>{strings.edit}</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse md:flex-row gap-3 flex-grow w-full">
            <div className="flex flex-grow min-w-0 w-full flex-col gap-3">
              <div
                id={`postsuser${userData.id}`}
                className="flex-grow flex flex-col gap-3 w-full min-w-0"
              >
                {postsLoading && posts.length === 0 ? (
                  <FeedPostSkeleton />
                ) : posts.length > 0 ? (
                  <PostsRenderer
                    currentUserId={user?.id ?? null}
                    lang={postCardLang}
                    onBookmark={handleBookmark}
                    onComment={openCommentsModal}
                    onDelete={(post) => {
                      setDeleteTarget(post);
                      setIsDeleteModalOpen(true);
                    }}
                    onEdit={(post) => router.push(`/feed/edit?id=${post.id}`)}
                    onNavigate={(href) => router.push(href)}
                    onReport={(post) => {
                      setReportTarget({ id: post.id, type: 2 });
                      setIsReportModalOpen(true);
                    }}
                    onShare={(url) => {
                      setShareUrl(url);
                      setIsShareModalOpen(true);
                    }}
                    onTranslate={translatePost}
                    onVote={handleVote}
                    posts={posts}
                    shareBaseUrl="https://ancial.ru/feed/post"
                  />
                ) : (
                  <EmptyIllustration
                    title={strings.noposts}
                    description={strings.nopostsdesc}
                  />
                )}
              </div>

              {hasMorePages ? <div ref={loadMoreRef} className="h-4 w-full" /> : null}

              {isLoadingMore ? <FeedPostSkeleton /> : null}
            </div>

            <div className="flex flex-col md:gap-3 md:w-80 lg:w-96 shrink-0 -mt-3 md:mt-0 rounded-b-3xl md:rounded-b-none overflow-hidden">
              {hasFriends ? (
                <PeopleSection
                  borderClassName={cn(
                    hasSubscribers || hasGroups ? 'border-x' : 'border-x border-b rounded-b-3xl',
                  )}
                  onOpen={() => setIsFriendsModalOpen(true)}
                  title={strings.friends}
                >
                  {(userData.friends || []).slice(0, 6).map((friend) => (
                    <UserMiniCard
                      key={String(friend.id)}
                      image={friend.img || 'https://ancial.ru/includes/img/new_user.png'}
                      isOnline={flag(friend.online)}
                      label={friend.fname || ''}
                      onClick={() => navigateToUser(friend.username)}
                    />
                  ))}
                </PeopleSection>
              ) : null}

              {hasSubscribers ? (
                <PeopleSection
                  borderClassName={cn(
                    hasGroups ? 'border-x' : 'border-x border-b rounded-b-3xl',
                  )}
                  onOpen={() => setIsSubscribersModalOpen(true)}
                  title={strings.subscribers}
                >
                  {(userData.subscribers || []).slice(0, 6).map((subscriber) => (
                    <UserMiniCard
                      key={String(subscriber.id)}
                      image={subscriber.img || 'https://ancial.ru/includes/img/new_user.png'}
                      isOnline={flag(subscriber.online)}
                      label={subscriber.fname || ''}
                      onClick={() => navigateToUser(subscriber.username)}
                    />
                  ))}
                </PeopleSection>
              ) : null}

              {hasGroups ? (
                <PeopleSection
                  borderClassName="border-x border-b rounded-b-3xl"
                  onOpen={() => setIsGroupsModalOpen(true)}
                  title={strings.groups}
                >
                  {(userData.groups || []).slice(0, 6).map((group) => (
                    <GroupMiniCard
                      key={String(group.id)}
                      image={group.img || 'https://ancial.ru/includes/img/new_user.png'}
                      label={group.name || ''}
                      onClick={() => navigateToGroup(group.slnk)}
                    />
                  ))}
                </PeopleSection>
              ) : null}
            </div>
          </div>

          <div className="lg:hidden">
            <br />
            <br />
            <br />
          </div>
        </div>
      ) : null}

      <RelationGridModal
        emptyText="Нет друзей..."
        isOpen={isFriendsModalOpen}
        items={userData?.friends || []}
        onClose={() => setIsFriendsModalOpen(false)}
        onOpen={(value) => {
          setIsFriendsModalOpen(false);
          navigateToUser((value as UserPreview).username);
        }}
        title={strings.friends}
        type="users"
      />

      <RelationGridModal
        emptyText="Нет подписчиков..."
        isOpen={isSubscribersModalOpen}
        items={userData?.subscribers || []}
        onClose={() => setIsSubscribersModalOpen(false)}
        onOpen={(value) => {
          setIsSubscribersModalOpen(false);
          navigateToUser((value as UserPreview).username);
        }}
        title={strings.subscribers}
        type="users"
      />

      <RelationGridModal
        emptyText="Нет групп..."
        isOpen={isGroupsModalOpen}
        items={userData?.groups || []}
        onClose={() => setIsGroupsModalOpen(false)}
        onOpen={(value) => {
          setIsGroupsModalOpen(false);
          navigateToGroup((value as GroupPreview).slnk);
        }}
        title={strings.groups}
        type="groups"
      />

      <Modal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        title={strings.updateprofilepicture}
        width="sm"
      >
        <input
          type="file"
          accept="image/*"
          disabled={isUploadingPhoto}
          onChange={(event) => {
            void updateProfileMedia('img', event.target.files?.[0] || null);
            event.currentTarget.value = '';
          }}
          className="mt-1 block w-full text-sm text-zinc-200 file:mr-4 file:rounded-full file:border-0 file:bg-purple-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-purple-600"
        />
      </Modal>

      <Modal
        isOpen={isCoverModalOpen}
        onClose={() => setIsCoverModalOpen(false)}
        title={strings.updateprofilecover}
        width="sm"
      >
        <input
          type="file"
          accept="image/*"
          disabled={isUploadingCover}
          onChange={(event) => {
            void updateProfileMedia('cover', event.target.files?.[0] || null);
            event.currentTarget.value = '';
          }}
          className="mt-1 block w-full text-sm text-zinc-200 file:mr-4 file:rounded-full file:border-0 file:bg-purple-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-purple-600"
        />
      </Modal>

      <Modal
        isOpen={isCommentsModalOpen}
        onClose={() => setIsCommentsModalOpen(false)}
        title={strings.postcomments}
        width="lg"
      >
        <div className="flex flex-col gap-3">
          {isAuthenticated ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateComment();
              }}
              className="form-control flex-1 text-zinc-100 rounded-full shadow"
            >
              <div className="relative flex bg-zinc-800 rounded-full w-full p-1 h-12">
                <input
                  placeholder={strings.writecomment}
                  type="text"
                  autoComplete="off"
                  value={commentInput}
                  onChange={(event) => setCommentInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && event.ctrlKey) {
                      event.preventDefault();
                      void handleCreateComment();
                    }
                  }}
                  className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600"
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className={cn(
                    'cursor-pointer shrink-0 w-10 h-10 flex items-center justify-center active:scale-95 duration-300 rounded-full hover:bg-zinc-900',
                    !commentInput.trim() && 'opacity-50',
                  )}
                >
                  <svg className="fill-white w-8 h-8 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <path d="M39.175,10.016c1.687,0,2.131,1.276,1.632,4.272c-0.571,3.426-2.216,14.769-3.528,21.83 c-0.502,2.702-1.407,3.867-2.724,3.867c-0.724,0-1.572-0.352-2.546-0.995c-1.32-0.872-7.984-5.279-9.431-6.314 c-1.32-0.943-3.141-2.078-0.857-4.312c0.813-0.796,6.14-5.883,10.29-9.842c0.443-0.423,0.072-1.068-0.42-1.068 c-0.112,0-0.231,0.034-0.347,0.111c-5.594,3.71-13.351,8.859-14.338,9.53c-0.987,0.67-1.949,1.1-3.231,1.1 c-0.655,0-1.394-0.112-2.263-0.362c-1.943-0.558-3.84-1.223-4.579-1.477c-2.845-0.976-2.17-2.241,0.593-3.457 c11.078-4.873,25.413-10.815,27.392-11.637C36.746,10.461,38.178,10.016,39.175,10.016 M39.175,7.016L39.175,7.016 c-1.368,0-3.015,0.441-5.506,1.474L33.37,8.614C22.735,13.03,13.092,17.128,6.218,20.152c-1.074,0.473-4.341,1.91-4.214,4.916 c0.054,1.297,0.768,3.065,3.856,4.124l0.228,0.078c0.862,0.297,2.657,0.916,4.497,1.445c1.12,0.322,2.132,0.478,3.091,0.478 c1.664,0,2.953-0.475,3.961-1.028c-0.005,0.168-0.001,0.337,0.012,0.507c0.182,2.312,1.97,3.58,3.038,4.338l0.149,0.106 c1.577,1.128,8.714,5.843,9.522,6.376c1.521,1.004,2.894,1.491,4.199,1.491c2.052,0,4.703-1.096,5.673-6.318 c0.921-4.953,1.985-11.872,2.762-16.924c0.331-2.156,0.603-3.924,0.776-4.961c0.349-2.094,0.509-4.466-0.948-6.185 C42.208,7.875,41.08,7.016,39.175,7.016L39.175,7.016z"></path>
                  </svg>
                </button>
              </div>
            </form>
          ) : null}

          <div className="flex flex-col gap-3">
            {isCommentsLoading ? (
              <div className="w-full flex items-center justify-center py-6">
                <SvgIcon className="w-16 h-16 inline animate-spin fill-purple-500" id="IC-loader" />
              </div>
            ) : comments.length > 0 ? (
              comments.map((comment) => (
                <FeedCommentCard
                  key={comment.id}
                  comment={comment}
                  deleteLabel={strings.delete}
                  reportLabel={strings.report}
                  onDelete={(targetComment) => void handleDeleteComment(targetComment)}
                  onNavigateToUser={(username) => {
                    setIsCommentsModalOpen(false);
                    navigateToUser(username);
                  }}
                  onReport={(targetComment) => {
                    setReportTarget({ id: targetComment.id, type: 4 });
                    setIsReportModalOpen(true);
                  }}
                />
              ))
            ) : (
              <CommentsEmptyState
                title={strings.emptycomments}
                description={strings.emptycommentsdesc}
              />
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title={strings.report}
        width="sm"
      >
        <div className="flex flex-col justify-center rounded-3xl shadow overflow-hidden">
          {[
            { label: strings.spam, value: 'Спам' },
            { label: strings.prohibitedgood, value: 'Запрещённый товар' },
            { label: strings.scam, value: 'Обман' },
            { label: strings.violence, value: 'Насилие и вражда' },
            { label: strings.candidimage, value: 'Откровенное изображение' },
            { label: strings.propertyrights, value: 'Нарушение интеллектуальных прав' },
          ].map((reason) => (
            <button
              key={reason.value}
              type="button"
              onClick={() => void handleReport(reason.value)}
              className="text-left p-1.5 bg-zinc-800 text-lg cursor-pointer duration-300 hover:bg-zinc-700 active:scale-95 active:rounded-xl"
            >
              {reason.label}
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={strings.share}
        width="sm"
      >
        <div className="flex flex-col gap-3 justify-center items-center">
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={() => handleShareTo('vk')}
              className="w-16 h-16 rounded-2xl bg-blue-500 hover:bg-blue-600 cursor-pointer active:scale-95 duration-300 flex items-center justify-center shadow"
            >
              <Image src="/img/socials/vk.png" alt="VK" width={48} height={48} className="w-12 h-12" />
            </button>
            <button
              type="button"
              onClick={() => handleShareTo('tg')}
              className="w-16 h-16 rounded-2xl bg-sky-400 hover:bg-sky-500 cursor-pointer active:scale-95 duration-300 flex items-center justify-center shadow"
            >
              <Image src="/img/socials/tg.png" alt="Telegram" width={48} height={48} className="w-12 h-12" />
            </button>
            <button
              type="button"
              onClick={() => handleShareTo('x')}
              className="w-16 h-16 rounded-2xl bg-slate-800 hover:bg-slate-900 cursor-pointer active:scale-95 duration-300 flex items-center justify-center shadow"
            >
              <Image src="/img/socials/x.png" alt="X" width={48} height={48} className="w-12 h-12" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => void handleCopyShareLink()}
            className="cursor-pointer w-full border border-zinc-600/30 rounded-3xl flex items-center justify-center gap-3 px-4 py-2 duration-300 active:scale-95 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
          >
            {strings.copylink}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={strings.deletepost}
        width="sm"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 justify-center items-center">
            <SvgIcon className="w-24 h-24 fill-white" id="IC-times" />
            <span className="text-base text-zinc-200">{strings.reallywantdeletepost}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => void handleDeletePost()}
              className="flex items-center justify-center gap-3 px-4 py-2 duration-300 active:scale-95 bg-red-600 hover:bg-red-700 text-white rounded-2xl w-full shadow"
            >
              {strings.yes}
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="flex items-center justify-center gap-3 px-4 py-2 duration-300 active:scale-95 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-2xl w-full shadow"
            >
              {strings.no}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
