'use client';

import type { FormEvent } from 'react';
import Modal from '../../components/modal';
import type { WalletAccount } from '../../lib/api-v2';

/** Друг для перевода STF (socialAction('friends'), status=1 — подтверждённый). */
interface StfFriend {
  id?: number | string;
  username?: string;
  name?: string;
  fname?: string;
  lname?: string;
  img?: string;
  status?: number | string;
}

interface SuccessDetails {
  receiver: string;
  sender: string;
  comment: string;
  amount: number;
  fees: number;
  feePercent: number;
  total: number;
}

interface SendMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  lang: Record<string, string> | null;
  accounts: WalletAccount[];
  friendsList: StfFriend[];
  friendsLoading: boolean;
  friendsError: string | null;
  sendStep: 'select' | 'sda' | 'stf' | 'sdb' | 'success' | 'error';
  setSendStep: (step: 'select' | 'sda' | 'stf' | 'sdb' | 'success' | 'error') => void;
  sendSenderId: number;
  setSendSenderId: (id: number) => void;
  sendLoading: boolean;
  sendError: string | null;
  setSendError: (v: string | null) => void;
  successDetails: SuccessDetails | null;
  sdaToAccountId: number;
  setSdaToAccountId: (id: number) => void;
  sdaAmount: string;
  setSdaAmount: (v: string) => void;
  stfFriendUsername: string;
  setStfFriendUsername: (v: string) => void;
  stfAmount: string;
  setStfAmount: (v: string) => void;
  stfComment: string;
  setStfComment: (v: string) => void;
  sdbDetailType: 'email' | 'phone' | 'login';
  setSdbDetailType: (t: 'email' | 'phone' | 'login') => void;
  sdbEmail: string;
  setSdbEmail: (v: string) => void;
  sdbPhone: string;
  setSdbPhone: (v: string) => void;
  sdbLogin: string;
  setSdbLogin: (v: string) => void;
  sdbAmount: string;
  setSdbAmount: (v: string) => void;
  sdbComment: string;
  setSdbComment: (v: string) => void;
  getCommissionInfo: (amountStr: string) => { fees: number; total: number; feePercent: number };
  handleSdaSubmit: (e: FormEvent) => void;
  handleStfSubmit: (e: FormEvent) => void;
  handleSdbSubmit: (e: FormEvent) => void;
}
/**
 * Модалка «Перевести» — вынесена из wallet-content без изменения разметки.
 * Владельцем состояния остаётся WalletContent: компонент получает стейты и
 * обработчики шагов через пропсы (lifting state up), поведение идентично.
 */
export function SendMoneyModal({
  isOpen,
  onClose,
  title,
  lang,
  accounts,
  friendsList,
  friendsLoading,
  friendsError,
  sendStep,
  setSendStep,
  sendSenderId,
  setSendSenderId,
  sendLoading,
  sendError,
  setSendError,
  successDetails,
  sdaToAccountId,
  setSdaToAccountId,
  sdaAmount,
  setSdaAmount,
  stfFriendUsername,
  setStfFriendUsername,
  stfAmount,
  setStfAmount,
  stfComment,
  setStfComment,
  sdbDetailType,
  setSdbDetailType,
  sdbEmail,
  setSdbEmail,
  sdbPhone,
  setSdbPhone,
  sdbLogin,
  setSdbLogin,
  sdbAmount,
  setSdbAmount,
  sdbComment,
  setSdbComment,
  getCommissionInfo,
  handleSdaSubmit,
  handleStfSubmit,
  handleSdbSubmit,
}: SendMoneyModalProps) {
  return (
    <>

      {/* 2. MODAL: Send Money (Перевести) */}
      <Modal isOpen={isOpen} onClose={onClose} title={title} width="sm">
        <div className="flex flex-col text-zinc-100">

          {/* Back button visible on sub-steps */}
          {sendStep !== 'select' && sendStep !== 'success' && sendStep !== 'error' && (
            <button
              onClick={() => {
                setSendStep('select');
                setSendError(null);
              }}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white duration-300 mb-4 text-sm font-semibold w-fit duration-300 active:scale-95 cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current rotate-180" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <use href="/icons.svg#IC-chevron-right"></use>
              </svg>
              {lang?.back || 'Назад'}
            </button>
          )}

          {/* STEP: select */}
          {sendStep === 'select' && (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setSendStep('sda');
                  if (accounts.length > 1) {
                    setSdaToAccountId(accounts.find(a => a.id !== sendSenderId)?.id || 0);
                  }
                }}
                className="shadow relative flex rounded-3xl p-3 gap-3 flex-grow text-zinc-100 bg-zinc-800/80 hover:bg-zinc-700/80 active:scale-95 duration-300 cursor-pointer items-center border border-zinc-600/30 text-left"
              >
                <div className="bg-zinc-950/60 rounded-full h-12 w-12 flex items-center justify-center shrink-0 border border-zinc-600/30">
                  <svg className="fill-white w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <path d="M 33.484375 4.984375 A 1.50015 1.50015 0 0 0 32.439453 7.5605469 L 37.878906 13 L 6.5 13 A 1.50015 1.50015 0 1 0 6.5 16 L 37.878906 16 L 32.439453 21.439453 A 1.50015 1.50015 0 1 0 34.560547 23.560547 L 42.560547 15.560547 A 1.50015 1.50015 0 0 0 42.560547 13.439453 L 34.560547 5.4394531 A 1.50015 1.50015 0 0 0 33.484375 4.984375 z M 14.470703 23.986328 A 1.50015 1.50015 0 0 0 13.439453 24.439453 L 5.4394531 32.439453 A 1.50015 1.50015 0 0 0 5.4394531 34.560547 L 13.439453 42.560547 A 1.50015 1.50015 0 1 0 15.560547 40.439453 L 10.121094 35 L 41.5 35 A 1.50015 1.50015 0 1 0 41.5 32 L 10.121094 32 L 15.560547 26.560547 A 1.50015 1.50015 0 0 0 14.470703 23.986328 z"></path>
                  </svg>
                </div>
                <div className="flex flex-col flex-grow">
                  <span className="text-base font-bold text-white">{lang?.betweenownaccounts || 'Между своими счетами'}</span>
                  <span className="text-xs text-zinc-400 mt-0.5">{lang?.betweenownaccounts_desc || 'Перевод средств между собственными кошельками'}</span>
                </div>
              </button>

              <button
                onClick={() => setSendStep('stf')}
                className="shadow relative flex rounded-3xl p-3 gap-3 flex-grow text-zinc-100 bg-zinc-800/80 hover:bg-zinc-700/80 active:scale-95 duration-300 cursor-pointer items-center border border-zinc-600/30 text-left"
              >
                <div className="bg-zinc-950/60 rounded-full h-12 w-12 flex items-center justify-center shrink-0 border border-zinc-600/30">
                  <svg className="fill-white w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <path d="M 24 6 C 22.125 6 20.528815 6.7571334 19.503906 7.9101562 C 18.478997 9.0631791 18 10.541667 18 12 C 18 13.458333 18.478997 14.936821 19.503906 16.089844 C 20.528815 17.242867 22.125 18 24 18 C 25.875 18 27.471185 17.242867 28.496094 16.089844 C 29.521003 14.936821 30 13.458333 30 12 C 30 10.541667 29.521003 9.0631791 28.496094 7.9101562 C 27.471185 6.7571334 25.875 6 24 6 z M 11 8 C 9.4583337 8 8.1121484 8.6321335 7.2539062 9.5976562 C 6.3956641 10.563179 6 11.791667 6 13 C 6 14.208333 6.3956642 15.436821 7.2539062 16.402344 C 8.1121484 17.367867 9.4583337 18 11 18 C 12.541666 18 13.887852 17.367867 14.746094 16.402344 C 15.604336 15.436821 16 14.208333 16 13 C 16 11.791667 15.604336 10.563179 14.746094 9.5976562 C 13.887852 8.6321335 12.541666 8 11 8 z M 37 8 C 35.458334 8 34.112148 8.6321335 33.253906 9.5976562 C 32.395664 10.563179 32 11.791667 32 13 C 32 14.208333 32.395664 15.436821 33.253906 16.402344 C 34.112148 17.367867 35.458334 18 37 18 C 38.541666 18 39.887852 17.367867 40.746094 16.402344 C 41.604336 15.436821 42 14.208333 42 13 C 42 11.791667 41.604336 10.563179 40.746094 9.5976562 C 39.887852 8.6321335 38.541666 8 37 8 z M 24 9 C 25.124999 9 25.778816 9.3678665 26.253906 9.9023438 C 26.728997 10.436821 27 11.208333 27 12 C 27 12.791667 26.728997 13.563179 26.253906 14.097656 C 25.778816 14.632133 25.124999 15 24 15 C 22.875001 15 22.221184 14.632133 21.746094 14.097656 C 21.271003 13.563179 21 12.791667 21 12 C 21 11.208333 21.271003 10.436821 21.746094 9.9023438 C 22.221184 9.3678665 22.875001 9 24 9 z M 11 11 C 11.791666 11 12.195482 11.242867 12.503906 11.589844 C 12.81233 11.936821 13 12.458333 13 13 C 13 13.541667 12.81233 14.063179 12.503906 14.410156 C 12.195482 14.757133 11.791666 15 11 15 C 10.208334 15 9.8045176 14.757133 9.4960938 14.410156 C 9.1876697 14.063179 9 13.541667 9 13 C 9 12.458333 9.1876698 11.936821 9.4960938 11.589844 C 9.8045176 11.242867 10.208334 11 11 11 z M 37 11 C 37.791666 11 38.195482 11.242867 38.503906 11.589844 C 38.81233 11.936821 39 12.458333 39 13 C 39 13.541667 38.81233 14.063179 38.503906 14.410156 C 38.195482 14.757133 37.791666 15 37 15 C 36.208334 15 35.804518 14.757133 35.496094 14.410156 C 35.18767 14.063179 35 13.541667 35 13 C 35 12.458333 35.18767 11.936821 35.496094 11.589844 C 35.804518 11.242867 36.208334 11 37 11 z M 7.5 20 C 5.57 20 4 21.57 4 23.5 L 4 30 C 4 34.41 7.59 38 12 38 C 12.71 38 13.400547 37.910469 14.060547 37.730469 C 13.640547 36.830469 13.330156 35.869375 13.160156 34.859375 C 12.790156 34.949375 12.4 35 12 35 C 9.24 35 7 32.76 7 30 L 7 23.5 C 7 23.22 7.22 23 7.5 23 L 13.029297 23 C 13.129297 21.86 13.569766 20.83 14.259766 20 L 7.5 20 z M 18.5 20 C 16.585045 20 15 21.585045 15 23.5 L 15 33 C 15 37.952719 19.047281 42 24 42 C 28.952719 42 33 37.952719 33 33 L 33 23.5 C 33 21.585045 31.414955 20 29.5 20 L 18.5 20 z M 33.740234 20 C 34.430234 20.83 34.870703 21.86 34.970703 23 L 40.5 23 C 40.78 23 41 23.22 41 23.5 L 41 30 C 41 32.76 38.76 35 36 35 C 35.6 35 35.209844 34.949375 34.839844 34.859375 C 34.669844 35.869375 34.359453 36.830469 33.939453 37.730469 C 34.599453 37.910469 35.29 38 36 38 C 40.41 38 44 34.41 44 30 L 44 23.5 C 44 21.57 42.43 20 40.5 20 L 33.740234 20 z M 18.5 23 L 29.5 23 C 29.795045 23 30 23.204955 30 23.5 L 30 33 C 30 36.331281 27.331281 39 24 39 C 20.668719 39 18 36.331281 18 33 L 18 23.5 C 18 23.204955 18.204955 23 18.5 23 z"></path>
                  </svg>
                </div>
                <div className="flex flex-col flex-grow">
                  <span className="text-base font-bold text-white">{lang?.transfertofriend || 'Перевод другу'}</span>
                  <span className="text-xs text-zinc-400 mt-0.5">{lang?.transfertofriend_desc || 'Быстрый перевод контактам из списка друзей'}</span>
                </div>
              </button>

              <button
                onClick={() => setSendStep('sdb')}
                className="shadow relative flex rounded-3xl p-3 gap-3 flex-grow text-zinc-100 bg-zinc-800/80 hover:bg-zinc-700/80 active:scale-95 duration-300 cursor-pointer items-center border border-zinc-600/30 text-left"
              >
                <div className="bg-zinc-950/60 rounded-full h-12 w-12 flex items-center justify-center shrink-0 border border-zinc-600/30">
                  <svg className="fill-white w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <path d="M 15 4 A 4 4 0 0 0 15 12 A 4 4 0 0 0 15 4 z M 34 10 A 4 4 0 0 0 34 18 A 4 4 0 0 0 34 10 z M 14.5 14 C 11.480226 14 9 16.480226 9 19.5 L 9 31 A 1.50015 1.50015 0 0 0 10 32.433594 L 10 42.5 A 1.50015 1.50015 0 1 0 13 42.5 L 13 34 L 17 34 L 17 42.5 A 1.50015 1.50015 0 1 0 20 42.5 L 20 32.433594 A 1.50015 1.50015 0 0 0 21 31 L 21 19.5 C 21 16.480226 18.519774 14 15.5 14 L 14.5 14 z M 32.5 20 C 30.032499 20 28 22.032499 28 24.5 L 28 32.5 A 1.50015 1.50015 0 0 0 30 33.933594 L 30 35 L 30 42.5 A 1.50015 1.50015 0 1 0 33 42.5 L 33 35 L 35 35 L 35 42.5 A 1.50015 1.50015 0 1 0 38 42.5 L 38 35 L 38 33.933594 A 1.50015 1.50015 0 0 0 40 32.5 L 40 24.5 C 40 22.032499 37.967501 20 35.5 20 L 32.5 20 z"></path>
                  </svg>
                </div>
                <div className="flex flex-col flex-grow">
                  <span className="text-base font-bold text-white">{lang?.transferbydetails || 'Перевод по реквизитам'}</span>
                  <span className="text-xs text-zinc-400 mt-0.5">{lang?.transferbydetails_desc || 'Перевод по никнейму, почте или номеру телефона'}</span>
                </div>
              </button>
            </div>
          )}

          {/* STEP: sda */}
          {sendStep === 'sda' && (
            <form onSubmit={handleSdaSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col w-full text-left">
                <span className="text-zinc-400 pl-4 z-20 -mt-1.5">{lang?.fromaccount || 'Счёт списания'}</span>
                <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                  <select
                    value={sendSenderId}
                    onChange={(e) => setSendSenderId(Number(e.target.value))}
                    className="rounded-full bg-zinc-800/60 w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.balance} <svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg>) — ID: {acc.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col w-full text-left">
                <span className="text-zinc-400 pl-4 z-20 -mt-1.5">{lang?.toaccount || 'Счёт зачисления'}</span>
                <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                  <select
                    value={sdaToAccountId}
                    onChange={(e) => setSdaToAccountId(Number(e.target.value))}
                    className="rounded-full bg-zinc-800/60 w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
                  >
                    <option value={0} disabled>{lang?.selectaccount || 'Выберите счёт...'}</option>
                    {accounts.filter(a => a.id !== sendSenderId).map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.balance} <svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg>) — ID: {acc.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col w-full text-left">
                <span className="text-zinc-400 pl-4 z-20 -mt-1.5">{lang?.transferamount || 'Сумма перевода'} (<svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg>)</span>
                <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                  <input
                    type="number"
                    value={sdaAmount}
                    onChange={(e) => setSdaAmount(e.target.value)}
                    placeholder="0"
                    min="1"
                    className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
                  />
                </div>
              </div>

              {parseFloat(sdaAmount) > 0 && (
                <div className="bg-zinc-800/35 border border-zinc-800 rounded-3xl p-3 text-sm text-zinc-400 flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>{lang?.amounttosend || 'Сумма к отправке:'}</span>
                    <span className="text-zinc-200">{sdaAmount} <svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg></span>
                  </div>
                  <div className="flex justify-between">
                    <span>{lang?.commission || 'Комиссия:'}</span>
                    <span className="text-zinc-200">{getCommissionInfo(sdaAmount).fees} <svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg></span>
                  </div>
                  <div className="flex justify-between font-semibold text-white border-t border-zinc-800 pt-1 mt-1">
                    <span>{lang?.receiverwillget || 'Получатель получит:'}</span>
                    <span>{getCommissionInfo(sdaAmount).total} <svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg></span>
                  </div>
                </div>
              )}

              {sendError && (
                <p className="text-red-500 text-sm font-semibold">{sendError}</p>
              )}

              <button
                type="submit"
                disabled={sendLoading || !sendSenderId || !sdaToAccountId || sendSenderId === sdaToAccountId || !sdaAmount || parseFloat(sdaAmount) <= 0}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-100 rounded-3xl shadow cursor-pointer font-bold mt-2"
              >
                {sendLoading ? (
                  <div className="w-6 h-6 rounded-full animate-spin border-2 border-solid border-white border-t-transparent" />
                ) : (
                  lang?.send || 'Перевести'
                )}
              </button>
            </form>
          )}

          {/* STEP: stf */}
          {sendStep === 'stf' && (
            <form onSubmit={handleStfSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col w-full text-left">
                <span className="text-zinc-400 pl-4 z-20 -mt-1.5">{lang?.fromaccount || 'Счёт списания'}</span>
                <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                  <select
                    value={sendSenderId}
                    onChange={(e) => setSendSenderId(Number(e.target.value))}
                    className="rounded-full bg-zinc-800/60 w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.balance} <svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg>) — ID: {acc.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col w-full text-left">
                <span className="text-zinc-400 pl-4 z-20 -mt-1.5">{lang?.friendreceiver || 'Друг получатель'}</span>
                {friendsLoading ? (
                  <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30 items-center pl-3 text-zinc-400 text-sm">{lang?.loadingfriends || 'Загрузка друзей...'}</div>
                ) : friendsError ? (
                  <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-red-500/35 items-center pl-3 text-red-400 text-sm">{friendsError}</div>
                ) : friendsList.length === 0 ? (
                  <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30 items-center pl-3 text-zinc-400 text-sm">{lang?.nofriends || 'У вас нет подтвержденных друзей'}</div>
                ) : (
                  <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                    <select
                      value={stfFriendUsername}
                      onChange={(e) => setStfFriendUsername(e.target.value)}
                      className="rounded-full bg-zinc-800/60 w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
                    >
                      {friendsList.map(friend => (
                        <option key={friend.id} value={friend.username}>
                          {friend.name} (@{friend.username})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex flex-col w-full text-left">
                <span className="text-zinc-400 pl-4 z-20 -mt-1.5">{lang?.transferamount || 'Сумма перевода'} (<svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg>)</span>
                <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                  <input
                    type="number"
                    value={stfAmount}
                    onChange={(e) => setStfAmount(e.target.value)}
                    placeholder="0"
                    min="1"
                    className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col w-full text-left">
                <span className="text-zinc-300 pl-4 z-20">{lang?.comment || 'Комментарий'}</span>
                <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                  <input
                    type="text"
                    value={stfComment}
                    onChange={(e) => setStfComment(e.target.value)}
                    placeholder={`${lang?.for_example || 'Например:'} ${lang?.transfertofriend || 'Перевод другу @'}${stfFriendUsername || ''}`}
                    className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
                  />
                </div>
              </div>

              {parseFloat(stfAmount) > 0 && (
                <div className="bg-zinc-800/35 border border-zinc-800 rounded-3xl p-3 text-sm text-zinc-400 flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>{lang?.amounttosend || 'Сумма к отправке:'}</span>
                    <span className="text-zinc-200">{stfAmount} <svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg></span>
                  </div>
                  <div className="flex justify-between">
                    <span>{lang?.commission || 'Комиссия:'}</span>
                    <span className="text-zinc-200">{getCommissionInfo(stfAmount).fees} <svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg></span>
                  </div>
                  <div className="flex justify-between font-semibold text-white border-t border-zinc-800 pt-1 mt-1">
                    <span>{lang?.receiverwillget || 'Получатель получит:'}</span>
                    <span>{getCommissionInfo(stfAmount).total} <svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg></span>
                  </div>
                </div>
              )}

              {sendError && (
                <p className="text-red-500 text-sm font-semibold">{sendError}</p>
              )}

              <button
                type="submit"
                disabled={sendLoading || !sendSenderId || !stfFriendUsername || !stfAmount || parseFloat(stfAmount) <= 0}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-100 rounded-3xl shadow cursor-pointer font-bold mt-2"
              >
                {sendLoading ? (
                  <div className="w-6 h-6 rounded-full animate-spin border-2 border-solid border-white border-t-transparent" />
                ) : (
                  lang?.send || 'Перевести'
                )}
              </button>
            </form>
          )}
          {/* STEP: sdb */}
          {sendStep === 'sdb' && (
            <form onSubmit={handleSdbSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col w-full text-left">
                <span className="text-zinc-400 pl-4 z-20 -mt-1.5">{lang?.fromaccount || 'Счёт списания'}</span>
                <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                  <select
                    value={sendSenderId}
                    onChange={(e) => setSendSenderId(Number(e.target.value))}
                    className="rounded-full bg-zinc-800/60 w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.balance} <svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg>) — ID: {acc.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tabs for details type selection */}
              <div className="flex border border-zinc-800 p-0.5 rounded-3xl bg-zinc-950/40">
                <button
                  type="button"
                  onClick={() => {
                    setSdbDetailType('email');
                    setSendError(null);
                  }}
                  className={`cursor-pointer active:scale-95 duration-300 flex-1 py-2 text-center text-sm font-semibold rounded-full duration-300 ${sdbDetailType === 'email' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  {lang?.email || 'Email'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSdbDetailType('phone');
                    setSendError(null);
                  }}
                  className={`cursor-pointer active:scale-95 duration-300 flex-1 py-2 text-center text-sm font-semibold rounded-full duration-300 ${sdbDetailType === 'phone' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  {lang?.phone || 'Телефон'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSdbDetailType('login');
                    setSendError(null);
                  }}
                  className={`cursor-pointer active:scale-95 duration-300 flex-1 py-2 text-center text-sm font-semibold rounded-full duration-300 ${sdbDetailType === 'login' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  {lang?.nickname || 'Никнейм'}
                </button>
              </div>

              {sdbDetailType === 'email' && (
                <div className="flex flex-col w-full text-left">
                  <span className="text-zinc-400 pl-4 z-20 -mt-1.5">{lang?.emailaddress || 'Электронная почта (Email)'}</span>
                  <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                    <input
                      type="email"
                      value={sdbEmail}
                      onChange={(e) => setSdbEmail(e.target.value)}
                      placeholder="example@mail.com"
                      required
                      className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
                    />
                  </div>
                </div>
              )}

              {sdbDetailType === 'phone' && (
                <div className="flex flex-col w-full text-left">
                  <span className="text-zinc-400 pl-4 z-20 -mt-1.5">{lang?.phonenumber || 'Номер телефона'}</span>
                  <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                    <input
                      type="tel"
                      value={sdbPhone}
                      onChange={(e) => setSdbPhone(e.target.value)}
                      placeholder="+7 (999) 123-45-67"
                      required
                      className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
                    />
                  </div>
                </div>
              )}

              {sdbDetailType === 'login' && (
                <div className="flex flex-col w-full text-left">
                  <span className="text-zinc-400 pl-4 z-20 -mt-1.5">{lang?.nickname_format || 'Никнейм пользователя'}</span>
                  <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                    <input
                      type="text"
                      value={sdbLogin}
                      onChange={(e) => setSdbLogin(e.target.value)}
                      placeholder="username"
                      required
                      className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col w-full text-left">
                <span className="text-zinc-400 pl-4 z-20 -mt-1.5">{lang?.transferamount || 'Сумма перевода'} (<svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg>)</span>
                <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                  <input
                    type="number"
                    value={sdbAmount}
                    onChange={(e) => setSdbAmount(e.target.value)}
                    placeholder="0"
                    min="1"
                    className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col w-full text-left">
                <span className="text-zinc-300 pl-4 z-20">{lang?.comment || 'Комментарий'}</span>
                <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                  <input
                    type="text"
                    value={sdbComment}
                    onChange={(e) => setSdbComment(e.target.value)}
                    placeholder={lang?.for_example_transfer || "Например: За перевод"}
                    className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
                  />
                </div>
              </div>

              {parseFloat(sdbAmount) > 0 && (
                <div className="bg-zinc-800/35 border border-zinc-800 rounded-3xl p-3 text-sm text-zinc-400 flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>{lang?.amounttosend || 'Сумма к отправке:'}</span>
                    <span className="text-zinc-200">{sdbAmount} <svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg></span>
                  </div>
                  <div className="flex justify-between">
                    <span>{lang?.commission || 'Комиссия:'}</span>
                    <span className="text-zinc-200">{getCommissionInfo(sdbAmount).fees} <svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg></span>
                  </div>
                  <div className="flex justify-between font-semibold text-white border-t border-zinc-800 pt-1 mt-1">
                    <span>{lang?.receiverwillget || 'Получатель получит:'}</span>
                    <span>{getCommissionInfo(sdbAmount).total} <svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg></span>
                  </div>
                </div>
              )}

              {sendError && (
                <p className="text-red-500 text-sm font-semibold">{sendError}</p>
              )}

              <button
                type="submit"
                disabled={sendLoading || !sendSenderId || !sdbAmount || parseFloat(sdbAmount) <= 0 || (sdbDetailType === 'email' && !sdbEmail) || (sdbDetailType === 'phone' && !sdbPhone) || (sdbDetailType === 'login' && !sdbLogin)}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-100 rounded-3xl shadow cursor-pointer font-bold mt-2"
              >
                {sendLoading ? (
                  <div className="w-6 h-6 rounded-full animate-spin border-2 border-solid border-white border-t-transparent" />
                ) : (
                  lang?.send || 'Перевести'
                )}
              </button>
            </form>
          )}

          {/* STEP: success */}
          {sendStep === 'success' && successDetails && (
            <div className="flex flex-col items-center justify-center gap-3 text-center pb-2">
              <div className="relative">
                <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" style={{ width: '120px', height: '120px' }}>
                  <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" stroke="#84CC16" strokeWidth="2" />
                  <path className="checkmark-check" fill="none" stroke="#84CC16" strokeWidth="3" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                </svg>
              </div>

              <div className="flex flex-col items-center gap-1.5 w-full">
                <span className="text-zinc-300 text-base">{lang?.transfercomplete || 'Перевод выполнен получателю:'}</span>
                <span className="text-xl font-bold text-white">{successDetails.receiver}</span>
              </div>

              <div className="bg-zinc-800/60 rounded-3xl p-4 w-full text-sm space-y-2.5 text-left border border-zinc-600/30 mt-1">
                <div className="flex justify-between items-center border-b border-zinc-700 pb-2">
                  <span className="text-zinc-400">{lang?.amount || 'Сумма перевода:'}</span>
                  <span className="text-lg font-bold text-zinc-100">{successDetails.amount} <svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg></span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-700 pb-2">
                  <span className="text-zinc-400">{lang?.commission || 'Комиссия'} ({successDetails.feePercent}%):</span>
                  <span className="text-zinc-300 font-semibold">{successDetails.fees} <svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg></span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-700 pb-2">
                  <span className="text-zinc-400">{lang?.receiverwillget || 'Зачислено получателю:'}</span>
                  <span className="text-lg font-bold text-green-500">{successDetails.total} <svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg></span>
                </div>
                <div className="flex flex-col gap-1 border-b border-zinc-700 pb-2">
                  <span className="text-zinc-400 text-xs">{lang?.comment || 'Комментарий:'}</span>
                  <span className="text-zinc-100">{successDetails.comment}</span>
                </div>
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-zinc-400">{lang?.fromaccount || 'Счёт списания:'}</span>
                  <span className="text-zinc-400 text-xs">№{successDetails.sender}</span>
                </div>
              </div>

              <button
                onClick={() => onClose()}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-3xl shadow cursor-pointer font-bold mt-3"
              >
                {lang?.close || 'Закрыть'}
              </button>
            </div>
          )}

          {/* STEP: error */}
          {sendStep === 'error' && (
            <div className="flex flex-col items-center justify-center gap-3 text-center pb-2">
              <div className="relative">
                <svg className="crossmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" style={{ width: '120px', height: '120px' }}>
                  <circle className="crossmark-circle" cx="26" cy="26" r="25" fill="none" stroke="#EF4444" strokeWidth="2" />
                  <path className="crossmark-cross" fill="none" stroke="#EF4444" strokeWidth="3" d="M16 16 l20 20 M36 16 l-20 20" />
                </svg>
              </div>

              <div className="flex flex-col items-center gap-1.5 w-full">
                <span className="text-zinc-300 text-base">{lang?.transfererror || 'Ошибка перевода'}</span>
              </div>

              <div className="bg-zinc-800/80 rounded-3xl p-4 w-full text-left border border-zinc-600/30 mt-1 flex gap-3">
                <svg className="w-6 h-6 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1 flex flex-col">
                  <span className="text-zinc-400 text-xs">{lang?.reason || 'Причина ошибки:'}</span>
                  <span className="text-zinc-100 font-semibold text-base mt-0.5">{sendError || (lang?.unknown_error || 'Неизвестная ошибка')}</span>
                </div>
              </div>

              <button
                onClick={() => setSendStep('select')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-3xl shadow cursor-pointer font-bold mt-3"
              >
                {lang?.tryagain || 'Попробовать снова'}
              </button>
            </div>
          )}

        </div>
      </Modal>
    </>
  );
}