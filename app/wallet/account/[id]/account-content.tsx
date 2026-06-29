'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { AncialAPI, type WalletAccount, type WalletTransaction } from '../../../lib/api-v2';
import Modal from '../../../components/modal';
import { TransactionItem, TransactionDetailsModal } from '../../components/transaction-item';

interface AccountContentProps {
  accountId: number;
}

export default function AccountContent({ accountId }: AccountContentProps) {
  const router = useRouter();
  const { lang, isAuthenticated, isLoading: authLoading, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentAccount, setCurrentAccount] = useState<WalletAccount | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const activeFilter = 'all';

  // Modals state
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isCloseConfirmModalOpen, setIsCloseConfirmModalOpen] = useState(false);
  const [isTransactionDetailsModalOpen, setIsTransactionDetailsModalOpen] = useState(false);

  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);

  // Form states - Topup
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupError, setTopupError] = useState<string | null>(null);

  // Form states - Request / Receive
  const [receiveQrUrl, setReceiveQrUrl] = useState<string | null>(null);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);

  // Close account loading
  const [closeLoading, setCloseLoading] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  const strings = useMemo(() => {
    return {
      withdraw: lang?.withdraw || 'Вывести',
      send: lang?.send || 'Перевести',
      receive: lang?.receive || 'Запросить',
      deposit: lang?.deposit || 'Пополнить',
      active: lang?.active || 'Активен',
      history: lang?.history || 'История',
      system: lang?.system || 'Система',
      cancel: lang?.cancel || 'Отменить',
      closeaccount: lang?.closeaccountButton || 'Закрыть счёт',
      bankaccount: lang?.bankaccount || 'Счёт'
    };
  }, [lang]);

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading && !currentAccount) setLoading(true);
    try {
      const overview = await AncialAPI.getWalletOverview();
      const loadedAccounts = overview.accounts || [];

      const found = loadedAccounts.find(a => a.id === accountId);
      if (found) {
        setCurrentAccount(found);
        setError(null);
        localStorage.setItem(`wallet_account_cache_${accountId}`, JSON.stringify(found));
      } else {
        if (!currentAccount) setError(lang?.account_not_found_or_restricted || 'Счёт не найден или доступ ограничен');
      }
    } catch (err: unknown) {
      if (!currentAccount) setError(err instanceof Error ? err.message : (lang?.error_loading_account || 'Ошибка загрузки счёта'));
    } finally {
      setLoading(false);
    }
  }, [accountId, currentAccount]);

  const loadTransactions = useCallback(async () => {
    try {
      const response = await AncialAPI.getTransactions({
        account_id: accountId,
        sort: activeFilter
      });
      const fetchedTrans = response.transactions || [];
      setTransactions(fetchedTrans);
      localStorage.setItem(`wallet_account_trans_cache_${accountId}`, JSON.stringify(fetchedTrans));
    } catch (err: unknown) {
      console.error('Failed to load account transactions:', err);
    }
  }, [accountId, activeFilter]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      setError('Auth required');
      return;
    }

    const cachedAccount = localStorage.getItem(`wallet_account_cache_${accountId}`);
    const cachedTrans = localStorage.getItem(`wallet_account_trans_cache_${accountId}`);
    let hasCache = false;

    if (cachedAccount) {
      try {
        const parsedAccount = JSON.parse(cachedAccount);
        if (parsedAccount && parsedAccount.id) {
          setCurrentAccount(parsedAccount);
          hasCache = true;
          setLoading(false);
        }
      } catch (e) {
        console.error('Failed to parse cached account:', e);
      }
    }

    if (cachedTrans) {
      try {
        const parsedTrans = JSON.parse(cachedTrans);
        if (Array.isArray(parsedTrans)) {
          setTransactions(parsedTrans);
        }
      } catch (e) {
        console.error('Failed to parse cached account transactions:', e);
      }
    }

    loadData(!hasCache);
    loadTransactions();
  }, [authLoading, isAuthenticated, accountId]);

  // Load QR code when receive modal opens
  useEffect(() => {
    if (isReceiveModalOpen) {
      const loadQR = async () => {
        setReceiveLoading(true);
        setReceiveError(null);
        try {
          const res = await AncialAPI.generateQRCode(accountId);
          setReceiveQrUrl(res.qr_url);
        } catch (err: unknown) {
          setReceiveError(err instanceof Error ? err.message : (lang?.failed_to_generate_qr || 'Не удалось сгенерировать QR-код'));
        } finally {
          setReceiveLoading(false);
        }
      };
      loadQR();
    } else {
      setReceiveQrUrl(null);
    }
  }, [isReceiveModalOpen, accountId]);

  const handleTopage = (path: string) => {
    router.push(path);
  };


  // Quick Action - Topup submission
  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(topupAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setTopupError(lang?.enter_correct_amount || 'Укажите корректную сумму');
      return;
    }

    setTopupLoading(true);
    setTopupError(null);
    try {
      const res = await AncialAPI.createTopup(parsedAmount, accountId);
      if (res && res.payment_url) {
        window.location.href = res.payment_url;
      } else {
        setTopupError(lang?.failed_to_create_topup_invoice || 'Не удалось создать счет для пополнения');
      }
    } catch (err: unknown) {
      setTopupError(err instanceof Error ? err.message : (lang?.error_creating_topup || 'Ошибка при создании пополнения'));
    } finally {
      setTopupLoading(false);
    }
  };

  // Quick Action - Close Account submission
  const handleCloseAccount = async () => {
    setCloseLoading(true);
    setCloseError(null);
    try {
      await AncialAPI.deleteAccount(accountId);
      setIsCloseConfirmModalOpen(false);
      // Redirect back to wallet dashboard
      router.push('/wallet');
    } catch (err: unknown) {
      setCloseError(err instanceof Error ? err.message : (lang?.failed_to_close_account || 'Не удалось закрыть счёт'));
    } finally {
      setCloseLoading(false);
    }
  };

  const ownedAccountIds = new Set([accountId]);


  if (loading && !currentAccount) {
    return (
      <div className="flex flex-col w-full items-center justify-start min-h-screen pb-3 lg:pb-6 gap-3 bg-gradient-to-b from-black to-black via-black text-white">
        <div className="w-full max-w-screen-2xl h-14 flex items-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-[99]">
          <span className="w-fit text-3xl font-extralight flex items-center gap-1.5 cursor-pointer">
            <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path d="M 29.449219 4.9863281 A 1.50015 1.50015 0 0 0 28.423828 5.4550781 L 11.423828 22.955078 A 1.50015 1.50015 0 0 0 11.423828 25.044922 L 28.423828 42.544922 A 1.50015 1.50015 0 1 0 30.576172 40.455078 L 14.591797 24 L 30.576172 7.5449219 A 1.50015 1.50015 0 0 0 29.449219 4.9863281 z" />
            </svg>
            {strings.bankaccount}
          </span>
        </div>

        <div className="flex max-w-screen-2xl flex-col lg:flex-row gap-3 w-full duration-300">
          <div className="flex flex-col gap-3 w-full lg:w-fit duration-300 shrink-0">
            <div className="px-6 lg:-mx-3 -my-3 py-3 flex flex-nowrap gap-3 justify-center items-center w-full overflow-x-auto viewport duration-300">
              <div className="shrink-0 p-3 flex flex-col border border-zinc-600/30 bg-zinc-800/70 rounded-3xl shadow-lg duration-300 w-48 lg:w-64 h-24 lg:h-32 animate-pulse">
                <div className="w-24 lg:w-32 h-6 lg:h-8 bg-zinc-700/60 rounded-xl mb-2" />
                <div className="w-16 lg:w-24 h-4 bg-zinc-700/60 rounded-lg" />
                <div className="flex-grow" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-4 bg-zinc-700/60 rounded-full" />
                  <div className="flex-grow" />
                  <div className="w-12 h-4 bg-zinc-700/60 rounded-full" />
                </div>
              </div>
            </div>

            <div className="sticky flex flex-col gap-3 w-full duration-300 shrink-0 lg:pt-0" style={{ zIndex: 98, top: '56px' }}>
              <div className="px-3 lg:px-0 flex flex-nowrap justify-start items-center gap-3 overflow-x-auto viewport w-full duration-300">
                <div className="h-9 w-32 bg-zinc-800/70 border border-zinc-600/30 rounded-3xl animate-pulse shrink-0" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full duration-300 flex-grow">
            <div className="flex gap-3 items-center w-full duration-300 px-3 lg:px-0">
              <span className="text-xl lg:text-3xl font-bold text-white flex-grow shrink-0 duration-300">{strings.history}</span>
            </div>

            <div className="flex flex-col items-center justify-center w-full border border-zinc-600/30 bg-zinc-800/50 lg:bg-zinc-800/70 rounded-3xl overflow-hidden duration-300 p-3 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between w-full animate-pulse py-1">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-zinc-700/60 rounded-full shrink-0" />
                    <div className="flex flex-col gap-1.5">
                      <div className="h-4 w-32 bg-zinc-700/60 rounded" />
                      <div className="h-3 w-20 bg-zinc-700/60 rounded" />
                    </div>
                  </div>
                  <div className="h-5 w-16 bg-zinc-700/60 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentAccount) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-black text-zinc-300 gap-3">
        <span className="text-xl font-bold text-red-500">{error || (lang?.error_loading_account || 'Ошибка загрузки счёта')}</span>
        <button onClick={() => router.push('/wallet')} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full transition duration-300">
          {lang?.back_to_wallet || 'Назад в кошелёк'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full items-center justify-start min-h-screen pb-3 lg:pb-6 gap-3 bg-gradient-to-b from-black to-black via-black text-white">

      <div className="w-full max-w-screen-2xl h-14 flex items-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-[99]">
        <span
          onClick={() => handleTopage('/wallet')}
          className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer"
        >
          <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path d="M 29.449219 4.9863281 A 1.50015 1.50015 0 0 0 28.423828 5.4550781 L 11.423828 22.955078 A 1.50015 1.50015 0 0 0 11.423828 25.044922 L 28.423828 42.544922 A 1.50015 1.50015 0 1 0 30.576172 40.455078 L 14.591797 24 L 30.576172 7.5449219 A 1.50015 1.50015 0 0 0 29.449219 4.9863281 z" />
          </svg>
          {strings.bankaccount}
        </span>
      </div>

      <div className="flex max-w-screen-2xl flex-col lg:flex-row gap-3 w-full duration-300">
        <div className="flex flex-col gap-3 w-full lg:w-fit duration-300 shrink-0">
          <div className="px-6 lg:-mx-3 -my-3 py-3 flex flex-nowrap gap-3 justify-center items-center w-full overflow-x-auto viewport duration-300">
            <div className="shrink-0 p-3 flex flex-col border border-zinc-600/30 bg-zinc-800/70 rounded-3xl shadow-lg duration-300 w-48 lg:w-64 h-24 lg:h-32">
              <span className="lg:font-black text-white text-xl lg:text-3xl">
                {currentAccount.balance}{' '}
                <svg className="w-6 h-6 lg:w-8 lg:h-8 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <use href="/icons.svg#IC-anci"></use>
                </svg>
              </span>
              <span className="text-zinc-200 text-sm lg:text-lg">{currentAccount.name}</span>
              <div className="flex-grow"></div>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 text-white bg-zinc-800/80 border border-zinc-600/30 rounded-full text-xs">{currentAccount.id}</span>
                <div className="flex-grow"></div>
                <span className="px-1.5 py-0.5 bg-lime-500/25 text-lime-500 border border-zinc-600/30 rounded-full text-xs">{strings.active}</span>
              </div>
            </div>
          </div>

          <div className="sticky flex flex-col gap-3 w-full duration-300 shrink-0 lg:pt-0" style={{ zIndex: 98, top: '56px' }}>
            <div className="px-3 lg:px-0 flex flex-nowrap justify-start items-center gap-3 overflow-x-auto viewport w-full duration-300">
              <button onClick={() => setIsTopupModalOpen(true)} className="hidden shrink-0 items-center gap-3 text-zinc-300 bg-zinc-800/70 hover:bg-zinc-800 hover:text-white shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95 backdrop-blur-lg">
                <svg className="fill-white w-5 h-5 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-topup"></use></svg> {strings.deposit}
              </button>
              <button onClick={() => handleTopage(`/wallet/form?form=sendtouser&sender_id=${accountId}`)} className="hidden shrink-0 items-center gap-3 text-zinc-300 bg-zinc-800/70 hover:bg-zinc-800 hover:text-white shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95 backdrop-blur-lg">
                <svg className="fill-white w-5 h-5 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-send"></use></svg> {strings.send}
              </button>
              <button onClick={() => setIsReceiveModalOpen(true)} className="hidden shrink-0 items-center gap-3 text-zinc-300 bg-zinc-800/70 hover:bg-zinc-800 hover:text-white shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95 backdrop-blur-lg">
                <svg className="fill-white w-5 h-5 inline rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-send"></use></svg> {strings.receive}
              </button>
              <button onClick={() => setIsCloseConfirmModalOpen(true)} className="shrink-0 flex items-center gap-3 text-red-500 bg-red-500/25 hover:bg-red-700/40 shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95 backdrop-blur-lg border border-zinc-600/30">
                <svg className="fill-red-500 w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-times"></use></svg>
                {strings.closeaccount}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full duration-300 flex-grow">
          <div className="flex gap-3 items-center w-full duration-300 px-3 lg:px-0">
            <span className="text-xl lg:text-3xl font-bold text-white flex-grow shrink-0 duration-300">{strings.history}</span>
          </div>

          <div className="flex flex-col items-center justify-center w-full border border-zinc-600/30 bg-zinc-800/50 lg:bg-zinc-800/70 rounded-3xl overflow-hidden duration-300">
            {transactions.length > 0 ? (
              <div className="w-full">
                {transactions.map((trans, index) => (
                  <TransactionItem
                    key={trans.id}
                    trans={trans}
                    onClick={(t) => {
                      setSelectedTransaction(t);
                      setIsTransactionDetailsModalOpen(true);
                    }}
                    ownedIds={ownedAccountIds}
                    systemLabel={strings.system}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center w-full flex flex-col gap-0.5 justify-center items-center pb-3">
                <Image src="/img/status/nothingfound.webp" width={224} height={224} className="h-56 w-auto" alt="Empty" />
                <span className="text-base text-zinc-100 w-full text-center font-black">{lang?.too_empty || 'Слишком пусто...'}</span>
                <span className="text-sm text-zinc-300 w-full text-center font-medium">{lang?.maybe_filters_broken || 'Может фильтры сломались или ты ничего не переводил...'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Пополнение (Deposit) */}
      <Modal isOpen={isTopupModalOpen} onClose={() => setIsTopupModalOpen(false)} title={lang?.deposit || "Пополнение"} width="sm">
        <form onSubmit={handleTopupSubmit} className="flex flex-col gap-3 text-zinc-100 text-left">

          <div className="flex flex-col w-full text-left">
            <span className="text-zinc-400 pl-4 z-20">{lang?.topup_amount_rub || 'Сумма пополнения (₽)'}</span>
            <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
              <input
                type="number"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                placeholder={lang?.t_amm || "Сумма"}
                className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-4 text-white text-base"
                required
                min="10"
              />
            </div>
          </div>

          {topupError && <span className="text-red-500 text-sm text-center font-medium">{topupError}</span>}

          <button
            type="submit"
            disabled={topupLoading}
            className={`border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-3 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-full w-full shadow ${topupLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            {topupLoading ? (lang?.wait_loading || 'Подождите...') : (lang?.deposit || 'Пополнить')}
          </button>
        </form>
      </Modal>

      {/* MODAL 2: Получить (Request / Receive) */}
      <Modal isOpen={isReceiveModalOpen} onClose={() => setIsReceiveModalOpen(false)} title={lang?.request_transfer || "Запросить перевод"} width="sm">
        <div className="flex flex-col gap-3 text-zinc-100">
          <div className="flex items-center gap-3 w-full mt-1">
            <div className="flex items-center justify-center p-3 bg-white rounded-3xl flex-col shadow border border-zinc-600/30 min-h-30 min-w-30">
              {receiveLoading ? (
                <div className="w-8 h-8 rounded-full animate-spin border-4 border-solid border-zinc-400 border-t-transparent" />
              ) : receiveQrUrl ? (
                <Image
                  src={receiveQrUrl}
                  width={96}
                  height={96}
                  unoptimized
                  loader={({ src }) => src}
                  className="w-24 h-24"
                  alt="Account QR Code"
                />
              ) : (
                <span className="text-xs text-zinc-500 text-center px-2">{lang?.qr_unavailable || 'QR недоступен'}</span>
              )}
            </div>
            {user && (
              <div className="flex flex-col flex-grow min-w-0">
                {user.username && <span className="font-semibold text-white">@{user.username}</span>}
                {user.phone && <span className="text-zinc-300 truncate">{user.phone}</span>}
                {user.email && <span className="text-zinc-400 truncate">{user.email}</span>}
              </div>
            )}
          </div>

          {receiveError && (
            <div className="rounded-3xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {receiveError}
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL 3: Закрытие счёта (Close account confirmation) */}
      <Modal isOpen={isCloseConfirmModalOpen} onClose={() => setIsCloseConfirmModalOpen(false)} title={lang?.close_account_title || "Закрытие счета"} width="sm">
        <div className="flex flex-col gap-3 text-zinc-100 text-left">
          <span className="text-zinc-300 text-base leading-relaxed">
            {lang?.are_you_sure_close_account || 'Вы действительно хотите закрыть этот счёт? Все средства должны быть выведены до закрытия счёта. Данное действие необратимо.'}
          </span>

          {closeError && <span className="text-red-500 text-sm font-medium text-center">{closeError}</span>}

          <div className="flex gap-3">
            <button
              onClick={handleCloseAccount}
              disabled={closeLoading}
              className="flex-1 flex items-center justify-center gap-3 px-4 py-3 text-base duration-300 active:scale-95 bg-red-600 hover:bg-red-500 text-zinc-100 rounded-3xl shadow cursor-pointer font-bold disabled:opacity-50"
            >
              {closeLoading ? (lang?.closing || 'Закрытие...') : (lang?.yes_close || 'Да, закрыть')}
            </button>
            <button
              onClick={() => setIsCloseConfirmModalOpen(false)}
              className="flex-1 flex items-center justify-center gap-3 px-4 py-3 text-base duration-300 active:scale-95 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-3xl cursor-pointer font-semibold border border-zinc-700"
            >
              {lang?.cancel || 'Отмена'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: Transaction Details (Детали операции) */}
      <TransactionDetailsModal
        transaction={selectedTransaction}
        isOpen={isTransactionDetailsModalOpen}
        onClose={() => setIsTransactionDetailsModalOpen(false)}
        ownedIds={ownedAccountIds}
        systemLabel={strings.system}
      />

      <div className="lg:hidden h-20" />
    </div>
  );
}
