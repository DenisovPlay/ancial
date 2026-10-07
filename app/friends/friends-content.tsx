"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import YandexRtb from '../components/yandex-rtb';
import { AncialAPI, getApiMessage } from '../lib/api-v2';
import { cache } from '../lib/cache.ts';
import { getPresenceText, isPresenceOnline, usePresences } from '../lib/presence';
import { useDragScroll } from '../hooks/useDragScroll';
import { cn } from '../lib/cn';

interface Friend {
  id: string | number;
  relation_id?: string | number;
  is_request?: boolean;
  is_outgoing?: boolean;
  login?: string;
  username?: string;
  name?: string;
  fname?: string;
  lname?: string;
  img?: string;
  verify?: string | number;
  online?: boolean;
  isOnline?: boolean;
  status?: number;
  isPending?: boolean;
  is_incoming?: boolean;
  isIncoming?: boolean;
  friendId?: string | number;
  isCurrentUser?: boolean;
  /** Общие друзья (вкладка «Возможно, знакомы») */
  mutual?: number;
}

type FriendsTab = 'all' | 'requests' | 'suggestions';
const TABS: Array<{ id: FriendsTab; key: string; fallback: string }> = [
  { id: 'all', key: 'friends_tab_all', fallback: 'Все' },
  { id: 'requests', key: 'friends_tab_requests', fallback: 'Заявки' },
  { id: 'suggestions', key: 'friends_tab_suggestions', fallback: 'Возможные' },
];

import AccountName from '../components/account-name';
import { PresenceCoverBadge } from '../components/presence-activity';
import AppImage from '../components/app-image';
import Icon from '../components/svg-icon';
import BrandLoader from '../components/brand-loader';

const ICON_BTN = 'h-10 w-10 border border-transparent hover:border-zinc-600/30 flex items-center justify-center p-1.5 hover:bg-zinc-700/50 duration-300 rounded-3xl cursor-pointer';

function profileHref(friend: Friend) {
  return `/@${friend.username || friend.login || friend.id}`;
}

/** Строка человека: аватар, имя, подпись и кнопки справа. */
function FriendRow({
  actions,
  fallbackName,
  friend,
  isSelf,
  presence,
  selfLabel,
  subtitle,
}: {
  actions?: React.ReactNode;
  fallbackName: string;
  friend: Friend;
  isSelf: boolean;
  presence: ReturnType<typeof usePresences>[number] | undefined;
  selfLabel: string;
  subtitle?: React.ReactNode;
}) {
  const isOnline = isPresenceOnline(presence) || friend.online || friend.isOnline;
  return (
    <div id={`friend_${friend.id}`} className="group relative flex items-center justify-between gap-3 p-3 hover:bg-zinc-800 duration-300 cursor-pointer active:scale-95 active:rounded-3xl">
      {isSelf && (
        <div className="absolute inset-x-0 w-[50%] h-[50%] left-[25%] bottom-[0%] blur-3xl rounded-full bg-gradient-to-t from-lime-500/20 to-transparent z-[-1]"></div>
      )}
      <Link className="flex-shrink-0 relative cursor-pointer" href={profileHref(friend)}>
        <AppImage
          width={64}
          height={64}
          src={friend.img || '/img/placeholders/user.png'}
          fallbackSrc="/img/placeholders/user.png"
          alt=""
          className={`block shadow w-16 h-16 rounded-full shrink-0 object-cover border ${isOnline ? 'border-lime-500' : 'border-transparent'}`}
        />
        <PresenceCoverBadge presence={presence} className="absolute bottom-0 left-0" />
      </Link>
      <Link className="flex-grow flex flex-col justify-center overflow-hidden cursor-pointer" href={profileHref(friend)}>
        <AccountName
          user={friend}
          fallback={fallbackName}
          className="text-zinc-200 lg:text-lg font-medium cursor-pointer"
          nameClassName="text-zinc-200 lg:text-lg font-medium truncate"
        />
        {isSelf ? <div className="text-sm text-lime-500 font-medium">👆 {selfLabel}</div> : subtitle}
      </Link>
      {actions ? <div className="flex gap-1.5 shrink-0">{actions}</div> : null}
    </div>
  );
}

/** Друзья в сети лентой аватарок (как истории): вкладка «Все». */
function OnlineNow({ friends, presences }: { friends: Friend[]; presences: ReturnType<typeof usePresences> }) {
  const scrollRef = useDragScroll({ speed: 2 });
  return (
    <div className="flex w-full flex-col">
      <div ref={scrollRef} className="drag-scroll viewport flex w-full flex-nowrap overflow-x-auto px-3 md:px-0">
        <div className="flex flex-shrink-0 flex-row flex-nowrap gap-3">
          {friends.map((friend) => (
            <Link key={friend.id} href={profileHref(friend)} className="group flex w-16 shrink-0 cursor-pointer flex-col items-center gap-0.5 duration-300 active:scale-95">
              <span className="relative">
                <AppImage
                  width={64}
                  height={64}
                  src={friend.img || '/img/placeholders/user.png'}
                  fallbackSrc="/img/placeholders/user.png"
                  alt=""
                  className="block h-16 w-16 rounded-full border border-lime-500 object-cover shadow"
                />
                <PresenceCoverBadge presence={presences[Number(friend.id)]} className="absolute bottom-0 left-0" />
              </span>
              <span className="w-16 truncate text-center text-sm text-zinc-300">{friend.fname || (friend.name || '').split(' ')[0] || friend.username}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="w-full flex flex-col">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 p-3">
          <div className="w-16 h-16 rounded-full shrink-0 bg-zinc-800 animate-pulse"></div>
          <div className="flex-grow flex flex-col justify-center gap-3">
            <div className="h-4 w-32 bg-zinc-800 rounded-full animate-pulse"></div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyBlock({ description, title }: { description?: string; title?: string }) {
  return (
    <div className="w-full flex flex-col gap-0.5 justify-center items-center px-3 py-10 text-center duration-300">
      <AppImage skeleton={false} width={224} height={224} src="/img/load-placeholders/nothingfound.webp" className="w-48 lg:w-56" alt="Nothing found" />
      <span className="text-base text-zinc-100 w-full text-center font-black">{title}</span>
      {description ? <span className="text-sm text-zinc-300 w-full text-center font-medium">{description}</span> : null}
    </div>
  );
}

// Отдельный компонент для контента, чтобы использовать useSearchParams безопасно
function FriendsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading, lang, user } = useAuth();
  const { showNote } = useNotification();
  const tabsRef = useDragScroll({ speed: 2 });

  const rawTab = searchParams.get('tab');
  const tab: FriendsTab = rawTab === 'requests' || rawTab === 'suggestions' ? rawTab : 'all';

  const [friends, setFriends] = useState<Friend[]>([]);
  const [suggestions, setSuggestions] = useState<Friend[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  const accepted = useMemo(() => friends.filter((friend) => !(friend.status === 0 || friend.isPending || friend.is_request)), [friends]);
  const incoming = useMemo(() => friends.filter((friend) => (friend.status === 0 || friend.isPending || friend.is_request) && (friend.is_incoming || friend.isIncoming)), [friends]);
  const outgoing = useMemo(() => friends.filter((friend) => (friend.status === 0 || friend.isPending || friend.is_request) && !(friend.is_incoming || friend.isIncoming)), [friends]);

  // Статусы с учётом приватности каждого человека; онлайн-друзья поднимаются выше (в поиске порядок не трогаем).
  const presences = usePresences([...friends, ...(suggestions ?? [])].map((friend) => friend.id));
  const sortedAccepted = useMemo(() => {
    if (searchQuery) return accepted;
    return [...accepted].sort((a, b) =>
      Number(isPresenceOnline(presences[Number(b.id)])) - Number(isPresenceOnline(presences[Number(a.id)])),
    );
  }, [accepted, presences, searchQuery]);
  const onlineFriends = useMemo(
    () => accepted.filter((friend) => isPresenceOnline(presences[Number(friend.id)]) || friend.online || friend.isOnline),
    [accepted, presences],
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?backurl=/friends');
    }
  }, [isAuthenticated, authLoading, router]);

  const goTab = (next: FriendsTab) => router.replace(next === 'all' ? '/friends' : `/friends?tab=${next}`);

  // Обновляем query в роутере при сабмите
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput) {
      router.push(`/friends?q=${encodeURIComponent(searchInput)}`);
      setSearchQuery(searchInput);
    } else {
      router.push(`/friends`);
      setSearchQuery('');
    }
  };

  // Синхронизируем стейт если сменился URL
  useEffect(() => {
    const q = searchParams.get('q') || '';
    // URL → стейт: источник правды здесь, синхронного сеттлера без каскада нет.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchInput(q);
    setSearchQuery(q);
  }, [searchParams]);

  const fetchFriends = useCallback(async () => {
    try {
      if (!searchQuery) {
        const parsed = cache.get<Friend[]>('friends_cache', { category: 'friends', subcategory: 'list' });
        if (parsed) {
          setFriends(parsed);
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }
      } else {
        setIsLoading(true);
      }

      const response = await AncialAPI.socialAction<Friend[] | { friends?: Friend[]; data?: Friend[] }>('friends', searchQuery);
      const fetchedFriends = Array.isArray(response) ? response : (response?.friends || response?.data || []);

      setFriends(fetchedFriends);

      if (!searchQuery && fetchedFriends.length > 0) {
        cache.set('friends_cache', fetchedFriends, { category: 'friends', subcategory: 'list' });
      }

    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (isAuthenticated) {
      // Легаси mount-загрузка друзей: сеттлеры внутри после await.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchFriends();
    }
  }, [isAuthenticated, fetchFriends]);

  // «Возможно, знакомы» грузим при первом открытии вкладки.
  useEffect(() => {
    if (!isAuthenticated || tab !== 'suggestions' || suggestions !== null) return;
    let cancelled = false;
    AncialAPI.socialAction<{ suggestions?: Friend[] }>('suggestions')
      .then((response) => {
        if (!cancelled) setSuggestions(Array.isArray(response?.suggestions) ? response.suggestions : []);
      })
      .catch((error: unknown) => {
        console.error('Error fetching suggestions:', error);
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, suggestions, tab]);

  const handleCreateDialog = async (userId: string) => {
    try {
      const response = await AncialAPI.createDialog<{ hash?: string, message?: string }>(userId);

      if (response.hash) {
        router.push(`/messages/${response.hash}`);
      } else if (response.message) {
        showNote({ content: getApiMessage(response.message, lang), type: 'info', time: 5 });
      }
    } catch (e) {
      console.error(e);
      showNote({ content: getApiMessage(e instanceof Error ? e.message : null, lang, lang?.errorhappend || 'Произошла ошибка'), type: 'error', time: 5 });
    }
  };

  const handleAction = async (action: 'add' | 'delete', id: string) => {
    try {
      await AncialAPI.friendAction<{ message?: string }>(action, id);
      void fetchFriends();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSuggestion = async (friend: Friend) => {
    try {
      const response = await AncialAPI.friendAction<{ message?: string }>('add', String(friend.id));
      setSuggestions((current) => (current ?? []).filter((item) => item.id !== friend.id));
      showNote({ content: getApiMessage(response?.message, lang, lang?.friends_request_sent || 'Заявка отправлена'), type: 'success', time: 3 });
      void fetchFriends();
    } catch (e) {
      console.error(e);
      showNote({ content: getApiMessage(e instanceof Error ? e.message : null, lang, lang?.errorhappend || 'Произошла ошибка'), type: 'error', time: 5 });
    }
  };

  if (authLoading || (!isAuthenticated && !authLoading)) {
    // Загрузка авторизации: индикатор по центру страницы.
    return <BrandLoader page />;
  }

  const fallbackName = lang?.anonymous || 'Аноним';
  const selfLabel = lang?.friends_your_account || 'Это ваш аккаунт';
  const subtitleOf = (friend: Friend) => {
    const presence = presences[Number(friend.id)];
    // Только реальная активность: «не в сети»/«в сети» и так видно по рамке аватарки.
    return isPresenceOnline(presence) && presence?.activity_type !== 'none'
      ? <span className="truncate text-sm text-zinc-400">{getPresenceText(presence, lang)}</span>
      : null;
  };
  const dialogButton = (friend: Friend) => (
    <div onClick={() => handleCreateDialog(String(friend.id))} className={ICON_BTN}>
      <Icon name="IC-chats" className="inline w-6 h-6 fill-white" />
    </div>
  );

  const renderPeople = (people: Friend[], render: (friend: Friend) => React.ReactNode) =>
    people.map((friend, i) => (
      <React.Fragment key={friend.id || i}>
        {(i + 1) % 6 === 0 && <YandexRtb className="" />}
        {render(friend)}
      </React.Fragment>
    ));

  const requestsCount = incoming.length;

  return (
    <div className="flex flex-col justify-center items-center py-3 w-full">

      {!searchQuery ? (
        <span className="w-full max-w-3xl text-3xl font-extralight px-3 lg:px-0">
          <span>{lang?.friends}</span>
        </span>
      ) : (
        <div className="w-full max-w-3xl">
          <span
            onClick={() => {
              setSearchInput('');
              router.push('/friends');
            }}
            className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 px-3 lg:px-0 cursor-pointer"
          >
            <Icon name="IC-chevron-left" className="w-8 h-8 fill-white inline" />
            <span>{lang?.friends}</span>
          </span>
        </div>
      )}

      <div className="flex gap-3 items-center relative w-full max-w-3xl p-3 lg:px-0 sticky top-0 bg-gradient-to-b from-black via-black/90 to-transparent z-[90]">
        <form onSubmit={handleSearch} className="glass-input [--glass-sat:2] flex items-center justify-center border border-zinc-600/30 rounded-full w-full p-1 h-12 z-[11]">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600 text-white"
            placeholder={lang?.friends_search || 'Поиск друзей...'}
            autoComplete="off"
          />
          <button type="submit" className="cursor-pointer shrink-0 w-10 h-10 flex items-center justify-center active:scale-95 duration-300 rounded-full hover:bg-zinc-700/50 border border-transparent hover:border-zinc-600/30">
            <Icon name="IC-search" className="inline w-8 h-8 fill-white" />
          </button>
        </form>
      </div>

      {/* Друзья в сети — над вкладками и на любой вкладке (в поиске не нужны) */}
      {!searchQuery && !isLoading && onlineFriends.length > 0 ? (
        <div className="w-full max-w-3xl pb-3">
          <OnlineNow friends={onlineFriends} presences={presences} />
        </div>
      ) : null}

      {!searchQuery ? (
        <div ref={tabsRef} role="tablist" aria-label={lang?.friends} className="drag-scroll viewport flex w-full max-w-3xl flex-nowrap overflow-x-auto px-3 pb-3 lg:px-0">
          <div className="flex flex-shrink-0 flex-row flex-nowrap gap-3">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => goTab(item.id)}
                className={cn(
                  'glass-panel [--glass-alpha:0] [--glass-sat:2] text-lg px-3 py-2 cursor-pointer shrink-0 flex items-center justify-center gap-1.5 border border-zinc-600/30 active:scale-95 duration-300 rounded-full',
                  tab === item.id ? 'bg-zinc-700/80 text-white shadow' : 'bg-zinc-900/20 text-zinc-300 hover:bg-zinc-700 hover:text-white',
                )}
              >
                {lang?.[item.key] || item.fallback}
                {item.id === 'requests' && requestsCount > 0 ? (
                  <span className="rounded-full bg-purple-500 px-1.5 text-sm font-semibold leading-5 text-white">{requestsCount}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex w-full max-w-3xl flex-col gap-3">
        <div className="flex flex-col overflow-hidden border border-transparent md:border-zinc-600/30 md:bg-zinc-900 md:rounded-3xl md:shadow w-full duration-300">
          {searchQuery ? (
            isLoading ? <ListSkeleton /> : friends.length === 0 ? (
              <EmptyBlock title={lang?.nofriends} description={lang?.nosfriendsdesc} />
            ) : renderPeople(friends, (friend) => (
              <FriendRow
                friend={friend}
                presence={presences[Number(friend.id)]}
                isSelf={friend.id === user?.id}
                fallbackName={fallbackName}
                selfLabel={selfLabel}
                subtitle={subtitleOf(friend)}
              />
            ))
          ) : tab === 'all' ? (
            isLoading ? <ListSkeleton /> : sortedAccepted.length === 0 ? (
              <EmptyBlock title={lang?.nofriends} description={lang?.nosfriendsdesc} />
            ) : renderPeople(sortedAccepted, (friend) => (
              <FriendRow
                friend={friend}
                presence={presences[Number(friend.id)]}
                isSelf={friend.id === user?.id}
                fallbackName={fallbackName}
                selfLabel={selfLabel}
                subtitle={subtitleOf(friend)}
                actions={dialogButton(friend)}
              />
            ))
          ) : tab === 'requests' ? (
            isLoading ? <ListSkeleton /> : incoming.length + outgoing.length === 0 ? (
              <EmptyBlock title={lang?.friends_no_requests || 'Заявок нет'} description={lang?.friends_no_requests_desc || 'Входящие и исходящие заявки в друзья появятся здесь'} />
            ) : (
              <>
                {incoming.length > 0 ? (
                  <>
                    <span className="px-3 pt-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">{lang?.friends_requests_incoming || 'Входящие'}</span>
                    {renderPeople(incoming, (friend) => (
                      <FriendRow
                        friend={friend}
                        presence={presences[Number(friend.id)]}
                        isSelf={false}
                        fallbackName={fallbackName}
                        selfLabel={selfLabel}
                        actions={(
                          <>
                            <div onClick={() => handleAction('add', String(friend.id))} className={ICON_BTN}><Icon name="IC-plus" className="inline w-6 h-6 fill-white" /></div>
                            <div onClick={() => handleAction('delete', String(friend.id))} className={ICON_BTN}><Icon name="IC-times" className="inline w-6 h-6 fill-white" /></div>
                          </>
                        )}
                      />
                    ))}
                  </>
                ) : null}
                {outgoing.length > 0 ? (
                  <>
                    <span className="px-3 pt-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">{lang?.friends_requests_outgoing || 'Исходящие'}</span>
                    {renderPeople(outgoing, (friend) => (
                      <FriendRow
                        friend={friend}
                        presence={presences[Number(friend.id)]}
                        isSelf={false}
                        fallbackName={fallbackName}
                        selfLabel={selfLabel}
                        actions={<div onClick={() => handleAction('delete', String(friend.id))} className={ICON_BTN}><Icon name="IC-times" className="inline w-6 h-6 fill-white" /></div>}
                      />
                    ))}
                  </>
                ) : null}
              </>
            )
          ) : suggestions === null ? (
            <ListSkeleton />
          ) : suggestions.length === 0 ? (
            <EmptyBlock title={lang?.friends_no_suggestions || 'Пока некого предложить'} description={lang?.friends_no_suggestions_desc || 'Добавьте друзей — здесь появятся их знакомые'} />
          ) : renderPeople(suggestions, (friend) => (
            <FriendRow
              friend={friend}
              presence={presences[Number(friend.id)]}
              isSelf={false}
              fallbackName={fallbackName}
              selfLabel={selfLabel}
              subtitle={friend.mutual ? <span className="truncate text-sm text-zinc-400">{`${lang?.friends_mutual || 'Общих друзей'}: ${friend.mutual}`}</span> : null}
              actions={<div onClick={() => void handleAddSuggestion(friend)} className={ICON_BTN}><Icon name="IC-plus" className="inline w-6 h-6 fill-white" /></div>}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FriendsPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-3xl mx-auto flex flex-col md:mt-3 border border-transparent md:border-zinc-600/30 md:bg-zinc-900 md:rounded-3xl">
        <ListSkeleton />
      </div>
    }>
      <FriendsContent />
    </Suspense>
  );
}
