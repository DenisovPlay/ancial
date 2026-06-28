'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AncialAPI, type WalletAccount, type WalletTransaction } from '../../lib/api-v2';
import Modal from '../../components/modal';
import { TransactionItem, TransactionDetailsModal } from '../components/transaction-item';

type HistoryFilterId = 'all' | 'deposit' | 'withdraw' | 'transfer' | 'done' | 'onhold' | 'canceled';

export default function HistoryContent() {
  const router = useRouter();
  const { lang, isAuthenticated, isLoading: authLoading } = useAuth();

  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [activeFilter, setActiveFilter] = useState<HistoryFilterId>('all');
  const [isTransactionDetailsModalOpen, setIsTransactionDetailsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);
  const hasLoadedTransactions = useRef(false);
  const latestTransactionsRequest = useRef(0);
  const filterButtonsRef = useRef<HTMLDivElement>(null);

  const strings = useMemo(() => {
    return {
      all: lang?.all || 'Все',
      canceled: lang?.canceled || 'Отмененные',
      deposit: lang?.deposit || 'Пополнения',
      done: lang?.done || 'Выполненные',
      history: lang?.history || 'История',
      onhold: lang?.onmoderation || 'В процессе',
      system: lang?.system || 'Система',
      transfer: lang?.transfer || 'Переводы',
      withdraw: lang?.withdraw || 'Выводы',
    };
  }, [lang]);

  const filterButtons = useMemo(() => {
    return [
      { id: 'all' as const, label: strings.all },
      { id: 'deposit' as const, label: strings.deposit },
      { id: 'withdraw' as const, label: strings.withdraw },
      { id: 'transfer' as const, label: strings.transfer },
      { id: 'done' as const, label: strings.done },
      { id: 'onhold' as const, label: strings.onhold },
      { id: 'canceled' as const, label: strings.canceled },
    ];
  }, [strings]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setInitialLoading(false);
      return;
    }

    const loadOverview = async () => {
      try {
        const overview = await AncialAPI.getWalletOverview();
        setAccounts(overview.accounts || []);
      } catch (err) {
        console.error('Failed to load wallet overview:', err);
      }
    };

    loadOverview();
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setInitialLoading(false);
      return;
    }

    const requestId = latestTransactionsRequest.current + 1;
    latestTransactionsRequest.current = requestId;

    const cacheKey = `wallet_history_cache_${activeFilter}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setTransactions(parsed);
          hasLoadedTransactions.current = true;
          setInitialLoading(false);
        }
      } catch (e) {
        console.error('Failed to parse history cache:', e);
      }
    }

    const loadTransactions = async () => {
      if (hasLoadedTransactions.current) {
        setIsRefreshing(true);
      } else {
        setInitialLoading(true);
      }

      try {
        const response = await AncialAPI.getTransactions({ sort: activeFilter });

        if (latestTransactionsRequest.current !== requestId) {
          return;
        }

        const fetchedTransactions = response.transactions || [];
        setTransactions(fetchedTransactions);
        hasLoadedTransactions.current = true;
        localStorage.setItem(cacheKey, JSON.stringify(fetchedTransactions));
      } catch (err) {
        if (latestTransactionsRequest.current !== requestId) {
          return;
        }

        console.error('Failed to load transaction history:', err);
      } finally {
        if (latestTransactionsRequest.current !== requestId) {
          return;
        }

        setInitialLoading(false);
        setIsRefreshing(false);
      }
    };

    loadTransactions();
  }, [activeFilter, authLoading, isAuthenticated]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const container = filterButtonsRef.current;
      const activeButton = container?.querySelector<HTMLElement>('[data-filter-active="true"]');

      if (!container || !activeButton) return;

      const scrollLeft =
        activeButton.offsetLeft - container.offsetWidth / 2 + activeButton.offsetWidth / 2;

      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth',
      });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [activeFilter]);

  const ownedAccountIds = useMemo(() => new Set(accounts.map((account) => account.id)), [accounts]);


  const renderFilterIcon = (filterId: HistoryFilterId) => {
    switch (filterId) {
      case 'all':
        return (
          <svg className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path d="M 7.5 5 C 6.122 5 5 6.122 5 7.5 L 5 13.5 C 5 14.878 6.122 16 7.5 16 L 13.5 16 C 14.878 16 16 14.878 16 13.5 L 16 7.5 C 16 6.122 14.878 5 13.5 5 L 7.5 5 z M 20.5 9 A 1.50015 1.50015 0 1 0 20.5 12 L 41.5 12 A 1.50015 1.50015 0 1 0 41.5 9 L 20.5 9 z M 7.5 18.5 C 6.122 18.5 5 19.622 5 21 L 5 27 C 5 28.378 6.122 29.5 7.5 29.5 L 13.5 29.5 C 14.878 29.5 16 28.378 16 27 L 16 21 C 16 19.622 14.878 18.5 13.5 18.5 L 7.5 18.5 z M 20.5 22.5 A 1.50015 1.50015 0 1 0 20.5 25.5 L 41.5 25.5 A 1.50015 1.50015 0 1 0 41.5 22.5 L 20.5 22.5 z M 7.5 32 C 6.1364058 32 5 33.136406 5 34.5 L 5 40.5 C 5 41.863594 6.1364058 43 7.5 43 L 13.5 43 C 14.863594 43 16 41.863594 16 40.5 L 16 34.5 C 16 33.136406 14.863594 32 13.5 32 L 7.5 32 z M 8 35 L 13 35 L 13 40 L 8 40 L 8 35 z M 20.5 36 A 1.50015 1.50015 0 1 0 20.5 39 L 41.5 39 A 1.50015 1.50015 0 1 0 41.5 36 L 20.5 36 z" />
          </svg>
        );
      case 'deposit':
        return (
          <svg className="fill-green-500 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path d="M 24 4 C 18.494917 4 14 8.494921 14 14 C 14 19.505079 18.494917 24 24 24 C 29.505083 24 34 19.505079 34 14 C 34 8.494921 29.505083 4 24 4 z M 24 7 C 27.883764 7 31 10.116238 31 14 C 31 17.883762 27.883764 21 24 21 C 20.116236 21 17 17.883762 17 14 C 17 10.116238 20.116236 7 24 7 z M 22.75 10 C 22.273 10 21.862531 10.336688 21.769531 10.804688 L 21.269531 13.304688 C 21.210531 13.598688 21.286562 13.903766 21.476562 14.134766 C 21.666562 14.366766 21.95 14.5 22.25 14.5 L 24.25 14.5 C 24.664 14.5 25 14.836 25 15.25 C 25 15.765 24.481 16 24 16 C 23.115 16 22.583922 15.685156 22.544922 15.660156 C 22.085922 15.363156 21.472969 15.489313 21.167969 15.945312 C 20.861969 16.405313 20.986313 17.026031 21.445312 17.332031 C 21.548313 17.400031 22.491 18 24 18 C 25.71 18 27 16.818 27 15.25 C 27 13.733 25.767 12.5 24.25 12.5 L 23.470703 12.5 L 23.570312 12 L 25.5 12 C 26.052 12 26.5 11.552 26.5 11 C 26.5 10.448 26.052 10 25.5 10 L 22.75 10 z M 2.5 13 A 1.50015 1.50015 0 1 0 2.5 16 L 5.5 16 C 5.7950452 16 6 16.204955 6 16.5 L 6 38.5 C 6 41.519774 8.4802259 44 11.5 44 L 36.5 44 C 39.519774 44 42 41.519774 42 38.5 L 42 16.5 C 42 16.204955 42.204955 16 42.5 16 L 45 16 A 1.50015 1.50015 0 1 0 45 13 L 42.5 13 C 40.585045 13 39 14.585045 39 16.5 L 39 38.5 C 39 39.898226 37.898226 41 36.5 41 L 11.5 41 C 10.101774 41 9 39.898226 9 38.5 L 9 16.5 C 9 14.585045 7.4149548 13 5.5 13 L 2.5 13 z M 18.402344 27.980469 A 1.50015 1.50015 0 0 0 17.394531 30.513672 L 22.894531 36.513672 A 1.50015 1.50015 0 0 0 25.105469 36.513672 L 30.605469 30.513672 A 1.50015 1.50015 0 0 0 29.554688 27.984375 A 1.50015 1.50015 0 0 0 28.394531 28.486328 L 24 33.28125 L 19.605469 28.486328 A 1.50015 1.50015 0 0 0 18.402344 27.980469 z" />
          </svg>
        );
      case 'withdraw':
        return (
          <svg className="fill-red-500 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path d="M 8.5 5 A 1.50015 1.50015 0 1 0 8.5 8 L 39.5 8 A 1.50015 1.50015 0 1 0 39.5 5 L 8.5 5 z M 23.925781 8.0019531 A 1.50015 1.50015 0 0 0 22.976562 8.4042969 L 15.476562 15.404297 A 1.50015 1.50015 0 0 0 16.5 18 L 31.5 18 A 1.50015 1.50015 0 0 0 32.523438 15.404297 L 25.023438 8.4042969 A 1.50015 1.50015 0 0 0 23.925781 8.0019531 z M 24 11.550781 L 27.695312 15 L 20.304688 15 L 24 11.550781 z M 14.556641 24 C 13.182903 24 12 25.12855 12 26.529297 L 12 41 L 5.5 41 A 1.50015 1.50015 0 1 0 5.5 44 L 42.5 44 A 1.50015 1.50015 0 1 0 42.5 41 L 36.001953 41 L 36.001953 26.529297 C 36.001953 25.12855 34.81905 24 33.445312 24 L 14.556641 24 z M 18.828125 27 L 29.173828 27 A 3 3 0 0 0 32 31 A 3 3 0 0 0 33.001953 30.824219 L 33.001953 41 L 29.972656 41 C 29.696418 38.195222 27.12612 36 24 36 C 20.87388 36 18.303582 38.195222 18.027344 41 L 15 41 L 15 30.828125 A 3 3 0 0 0 16 31 A 3 3 0 0 0 18.828125 27 z M 24 30 A 2 2 0 0 0 24 34 A 2 2 0 0 0 24 30 z M 24 39 C 25.445326 39 26.66023 39.859275 26.939453 41 L 21.060547 41 C 21.33977 39.859275 22.554674 39 24 39 z" />
          </svg>
        );
      case 'transfer':
        return (
          <svg className="fill-blue-500 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path d="M 11.478516 5 A 1.50015 1.50015 0 0 0 10.439453 5.4394531 L 4.4394531 11.439453 A 1.50015 1.50015 0 1 0 6.5605469 13.560547 L 10 10.121094 L 10 35.25 C 10 39.512545 13.487455 43 17.75 43 C 22.012545 43 25.5 39.512545 25.5 35.25 L 25.5 12.75 C 25.5 10.108545 27.608545 8 30.25 8 C 32.891455 8 35 10.108545 35 12.75 L 35 37.878906 L 31.560547 34.439453 A 1.50015 1.50015 0 0 0 30.484375 33.984375 A 1.50015 1.50015 0 0 0 29.439453 36.560547 L 35.439453 42.560547 A 1.50015 1.50015 0 0 0 37.560547 42.560547 L 43.560547 36.560547 A 1.50015 1.50015 0 1 0 41.439453 34.439453 L 38 37.878906 L 38 12.75 C 38 8.4874554 34.512545 5 30.25 5 C 25.987455 5 22.5 8.4874554 22.5 12.75 L 22.5 35.25 C 22.5 37.891455 20.391455 40 17.75 40 C 15.108545 40 13 37.891455 13 35.25 L 13 10.121094 L 16.439453 13.560547 A 1.50015 1.50015 0 1 0 18.560547 11.439453 L 12.560547 5.4394531 A 1.50015 1.50015 0 0 0 11.478516 5 z" />
          </svg>
        );
      case 'done':
        return (
          <svg className="fill-lime-500 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path d="M 43.470703 8.9863281 A 1.50015 1.50015 0 0 0 42.439453 9.4394531 L 16.5 35.378906 L 5.5605469 24.439453 A 1.50015 1.50015 0 1 0 3.4394531 26.560547 L 15.439453 38.560547 A 1.50015 1.50015 0 0 0 17.560547 38.560547 L 44.560547 11.560547 A 1.50015 1.50015 0 0 0 43.470703 8.9863281 z" />
          </svg>
        );
      case 'onhold':
        return (
          <svg className="fill-yellow-500 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path d="M 24 4 C 12.972066 4 4 12.972074 4 24 C 4 35.027926 12.972066 44 24 44 C 35.027934 44 44 35.027926 44 24 C 44 12.972074 35.027934 4 24 4 z M 24 7 C 33.406615 7 41 14.593391 41 24 C 41 33.406609 33.406615 41 24 41 C 14.593385 41 7 33.406609 7 24 C 7 14.593391 14.593385 7 24 7 z M 23.476562 11.978516 A 1.50015 1.50015 0 0 0 22 13.5 L 22 25.5 A 1.50015 1.50015 0 0 0 23.5 27 L 31.5 27 A 1.50015 1.50015 0 1 0 31.5 24 L 25 24 L 25 13.5 A 1.50015 1.50015 0 0 0 23.476562 11.978516 z" />
          </svg>
        );
      case 'canceled':
        return (
          <svg className="fill-red-500 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path d="M 39.486328 6.9785156 A 1.50015 1.50015 0 0 0 38.439453 7.4394531 L 24 21.878906 L 9.5605469 7.4394531 A 1.50015 1.50015 0 0 0 8.484375 6.984375 A 1.50015 1.50015 0 0 0 7.4394531 9.5605469 L 21.878906 24 L 7.4394531 38.439453 A 1.50015 1.50015 0 1 0 9.5605469 40.560547 L 24 26.121094 L 38.439453 40.560547 A 1.50015 1.50015 0 1 0 40.560547 38.439453 L 26.121094 24 L 40.560547 9.5605469 A 1.50015 1.50015 0 0 0 39.486328 6.9785156 z" />
          </svg>
        );
    }
  };



  return (
    <div className="flex flex-col w-full items-center justify-start pb-6 gap-3 bg-gradient-to-b from-black to-black via-black min-h-screen text-white">
      <div className="w-full max-w-screen-2xl min-h-14 flex flex-col lg:flex-row lg:items-center gap-3 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-[99]">
        <span
          onClick={() => router.push('/wallet')}
          className="shrink-0 px-3 lg:px-0 w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer"
        >
          <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path d="M 29.449219 4.9863281 A 1.50015 1.50015 0 0 0 28.423828 5.4550781 L 11.423828 22.955078 A 1.50015 1.50015 0 0 0 11.423828 25.044922 L 28.423828 42.544922 A 1.50015 1.50015 0 1 0 30.576172 40.455078 L 14.591797 24 L 30.576172 7.5449219 A 1.50015 1.50015 0 0 0 29.449219 4.9863281 z" />
          </svg>
          {strings.history}
        </span>
        <div className="flex-grow hidden lg:flex" />
        <div ref={filterButtonsRef} className="overflow-auto px-3 md:px-0 py-3 -my-3 flex viewport duration-300">
          <div className="flex flex-row flex-nowrap gap-3">
            {filterButtons.map((filter) => {
              const isActive = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  data-filter-active={isActive ? 'true' : 'false'}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`border border-zinc-600/30 shrink-0 flex items-center gap-3 shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95 backdrop-blur-md backdrop-saturate-200 ${isActive
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-300 bg-zinc-900/20 hover:bg-zinc-700 hover:text-white'
                    }`}
                >
                  {renderFilterIcon(filter.id)}
                  <span>{filter.label}</span>
                  {isActive && isRefreshing ? (
                    <div className="w-4 h-4 rounded-full animate-spin border-2 border-solid border-zinc-300 border-t-transparent" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center gap-3 w-full max-w-screen-2xl duration-300 shrink-0">
        <div className="relative flex flex-col items-center justify-center w-full border border-zinc-600/30 bg-zinc-800/50 lg:bg-zinc-800/70 rounded-3xl overflow-hidden duration-300">
          {isRefreshing ? (
            <div className="absolute inset-x-0 top-0 h-0.5 bg-zinc-700/70 overflow-hidden z-[2]">
              <div className="h-full w-1/3 bg-purple-500 animate-[pulse_0.9s_ease-in-out_infinite]" />
            </div>
          ) : null}
          {initialLoading && transactions.length === 0 ? (
            <div className="w-full flex flex-col p-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex gap-3 items-center w-full animate-pulse py-1">
                  <div className="h-10 w-10 lg:h-12 lg:w-12 bg-zinc-700/60 rounded-full shrink-0" />
                  <div className="flex flex-col gap-1.5 flex-grow">
                    <div className="h-4 w-32 lg:w-48 bg-zinc-700/60 rounded" />
                    <div className="h-3 w-20 bg-zinc-700/60 rounded" />
                  </div>
                  <div className="h-5 w-16 bg-zinc-700/60 rounded" />
                </div>
              ))}
            </div>
          ) : transactions.length > 0 ? (
            <div className={`w-full transition-opacity duration-200 ${isRefreshing ? 'opacity-85' : 'opacity-100'}`}>
              {transactions.map((trans) => (
                <TransactionItem
                  key={trans.id}
                  trans={trans}
                  ownedIds={ownedAccountIds}
                  systemLabel={strings.system}
                  onClick={(t) => { setSelectedTransaction(t); setIsTransactionDetailsModalOpen(true); }}
                />
              ))}
            </div>
          ) : (
            <div className={`text-center w-full flex flex-col gap-0.5 justify-center items-center pb-3 transition-opacity duration-200 ${isRefreshing ? 'opacity-85' : 'opacity-100'}`}>
              <Image src="/img/status/nothingfound.webp" width={224} height={224} className="h-56 w-auto" alt="Empty" />
              <span className="text-base text-zinc-100 w-full text-center font-black">Слишком пусто...</span>
              <span className="text-sm text-zinc-300 w-full text-center font-medium">
                Может фильтры сломались или ты ничего не переводил...
              </span>
            </div>
          )}
        </div>
      </div>

      <TransactionDetailsModal
        transaction={selectedTransaction}
        isOpen={isTransactionDetailsModalOpen}
        onClose={() => setIsTransactionDetailsModalOpen(false)}
        ownedIds={ownedAccountIds}
        systemLabel={strings.system}
      />

      <div className="lg:hidden"><br /><br /><br /><br /></div>
    </div>
  );
}
