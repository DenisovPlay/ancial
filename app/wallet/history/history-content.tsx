'use client';

import AppImage from '../../components/app-image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AncialAPI, type WalletAccount, type WalletTransaction } from '../../lib/api-v2';
import { cache } from '../../lib/cache.ts';
import { TransactionItem, TransactionDetailsModal } from '../components/transaction-item';
import Icon from '../../components/svg-icon';

type HistoryFilterId = 'all' | 'deposit' | 'withdraw' | 'transfer' | 'done' | 'onhold' | 'canceled';

export default function HistoryContent() {
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
      // Неавторизован — терминальное состояние, снимаем лоадер сразу.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // Неавторизован — терминальное состояние, снимаем лоадер сразу.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInitialLoading(false);
      return;
    }

    const requestId = latestTransactionsRequest.current + 1;
    latestTransactionsRequest.current = requestId;

    const cacheKey = `wallet_history_cache_${activeFilter}`;
    const parsed = cache.get<WalletTransaction[]>(cacheKey, { category: 'wallet', subcategory: 'history' });
    if (Array.isArray(parsed)) {
      setTransactions(parsed);
      hasLoadedTransactions.current = true;
      setInitialLoading(false);
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
        cache.set(cacheKey, fetchedTransactions, { category: 'wallet', subcategory: 'history' });
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
          <Icon name="IC-history-all" className="h-5 w-5 fill-current" />
        );
      case 'deposit':
        return (
          <Icon name="IC-topup" className="fill-green-500 h-5 w-5" />
        );
      case 'withdraw':
        return (
          <Icon name="IC-withdraw" className="fill-red-500 h-5 w-5" />
        );
      case 'transfer':
        return (
          <Icon name="IC-transfer" className="fill-blue-500 h-5 w-5" />
        );
      case 'done':
        return (
          <Icon name="IC-check" className="fill-lime-500 h-5 w-5" />
        );
      case 'onhold':
        return (
          <Icon name="IC-clock" className="fill-yellow-500 h-5 w-5" />
        );
      case 'canceled':
        return (
          <Icon name="IC-times" className="fill-red-500 h-5 w-5" />
        );
    }
  };



  return (
    <div className="flex flex-col w-full items-center justify-start pb-6 gap-3 bg-gradient-to-b from-black to-black via-black min-h-screen text-white">
      <div className="w-full max-w-screen-2xl min-h-14 flex flex-col lg:flex-row lg:items-center gap-3 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-[99]">
        <Link
          href="/wallet"
          className="shrink-0 px-3 lg:px-0 w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer"
        >
          <Icon name="IC-chevron-left" className="w-8 h-8 fill-white inline" />
          {strings.history}
        </Link>
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
              <AppImage src="/img/load-placeholders/nothingfound.webp" width={224} height={224} className="h-56 w-auto" alt="Empty" />
              <span className="text-base text-zinc-100 w-full text-center font-black">{lang?.too_empty || 'Слишком пусто...'}</span>
              <span className="text-sm text-zinc-300 w-full text-center font-medium">
                {lang?.maybe_filters_broken || 'Может фильтры сломались или ты ничего не переводил...'}
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
