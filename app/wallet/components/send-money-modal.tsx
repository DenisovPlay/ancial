'use client';

import type { FormEvent } from 'react';
import Modal from '../../components/modal';
import type { WalletAccount } from '../../lib/api-v2';
import Icon from '../../components/svg-icon';

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
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        width="sm"
        onBack={
          sendStep !== 'select' && sendStep !== 'success' && sendStep !== 'error'
            ? () => {
                setSendStep('select');
                setSendError(null);
              }
            : undefined
        }
        backLabel={lang?.back || 'Назад'}
      >
        <div className="flex flex-col text-zinc-100">

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
                  <Icon name="IC-transfer-own" className="fill-white w-6 h-6" />
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
                  <Icon name="IC-friends" className="fill-white w-6 h-6" />
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
                  <Icon name="IC-transfer-details" className="fill-white w-6 h-6" />
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
                <span className="text-zinc-400 pl-4 z-20">{lang?.fromaccount || 'Счёт списания'}</span>
                <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                  <select
                    value={sendSenderId}
                    onChange={(e) => setSendSenderId(Number(e.target.value))}
                    className="rounded-full bg-zinc-800/60 w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.balance} <Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" />) — ID: {acc.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col w-full text-left -mt-3">
                <span className="text-zinc-400 pl-4 z-20">{lang?.toaccount || 'Счёт зачисления'}</span>
                <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                  <select
                    value={sdaToAccountId}
                    onChange={(e) => setSdaToAccountId(Number(e.target.value))}
                    className="rounded-full bg-zinc-800/60 w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
                  >
                    <option value={0} disabled>{lang?.selectaccount || 'Выберите счёт...'}</option>
                    {accounts.filter(a => a.id !== sendSenderId).map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.balance} <Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" />) — ID: {acc.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col w-full text-left -mt-3">
                <span className="text-zinc-400 pl-4 z-20">{lang?.transferamount || 'Сумма перевода'} (<Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" />)</span>
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
                    <span className="text-zinc-200">{sdaAmount} <Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" /></span>
                  </div>
                  <div className="flex justify-between">
                    <span>{lang?.commission || 'Комиссия:'}</span>
                    <span className="text-zinc-200">{getCommissionInfo(sdaAmount).fees} <Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" /></span>
                  </div>
                  <div className="flex justify-between font-semibold text-white border-t border-zinc-800 pt-1 mt-1">
                    <span>{lang?.receiverwillget || 'Получатель получит:'}</span>
                    <span>{getCommissionInfo(sdaAmount).total} <Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" /></span>
                  </div>
                </div>
              )}

              {sendError && (
                <p className="text-red-500 text-sm font-semibold">{sendError}</p>
              )}

              <button
                type="submit"
                disabled={sendLoading || !sendSenderId || !sdaToAccountId || sendSenderId === sdaToAccountId || !sdaAmount || parseFloat(sdaAmount) <= 0}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-100 rounded-3xl shadow cursor-pointer font-bold"
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
                <span className="text-zinc-400 pl-4 z-20">{lang?.fromaccount || 'Счёт списания'}</span>
                <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                  <select
                    value={sendSenderId}
                    onChange={(e) => setSendSenderId(Number(e.target.value))}
                    className="rounded-full bg-zinc-800/60 w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.balance} <Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" />) — ID: {acc.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col w-full text-left -mt-3">
                <span className="text-zinc-400 pl-4 z-20">{lang?.friendreceiver || 'Друг получатель'}</span>
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

              <div className="flex flex-col w-full text-left -mt-3">
                <span className="text-zinc-400 pl-4 z-20">{lang?.transferamount || 'Сумма перевода'} (<Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" />)</span>
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

              <div className="flex flex-col w-full text-left -mt-3">
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
                    <span className="text-zinc-200">{stfAmount} <Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" /></span>
                  </div>
                  <div className="flex justify-between">
                    <span>{lang?.commission || 'Комиссия:'}</span>
                    <span className="text-zinc-200">{getCommissionInfo(stfAmount).fees} <Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" /></span>
                  </div>
                  <div className="flex justify-between font-semibold text-white border-t border-zinc-800 pt-1 mt-1">
                    <span>{lang?.receiverwillget || 'Получатель получит:'}</span>
                    <span>{getCommissionInfo(stfAmount).total} <Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" /></span>
                  </div>
                </div>
              )}

              {sendError && (
                <p className="text-red-500 text-sm font-semibold">{sendError}</p>
              )}

              <button
                type="submit"
                disabled={sendLoading || !sendSenderId || !stfFriendUsername || !stfAmount || parseFloat(stfAmount) <= 0}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-100 rounded-3xl shadow cursor-pointer font-bold"
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
                <span className="text-zinc-400 pl-4 z-20">{lang?.fromaccount || 'Счёт списания'}</span>
                <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                  <select
                    value={sendSenderId}
                    onChange={(e) => setSendSenderId(Number(e.target.value))}
                    className="rounded-full bg-zinc-800/60 w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.balance} <Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" />) — ID: {acc.id}
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
                <div className="flex flex-col w-full text-left -mt-3">
                  <span className="text-zinc-400 pl-4 z-20">{lang?.emailaddress || 'Электронная почта (Email)'}</span>
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
                <div className="flex flex-col w-full text-left -mt-3">
                  <span className="text-zinc-400 pl-4 z-20">{lang?.phonenumber || 'Номер телефона'}</span>
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
                <div className="flex flex-col w-full text-left -mt-3">
                  <span className="text-zinc-400 pl-4 z-20">{lang?.nickname_format || 'Никнейм пользователя'}</span>
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

              <div className="flex flex-col w-full text-left -mt-3">
                <span className="text-zinc-400 pl-4 z-20">{lang?.transferamount || 'Сумма перевода'} (<Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" />)</span>
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

              <div className="flex flex-col w-full text-left -mt-3">
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
                    <span className="text-zinc-200">{sdbAmount} <Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" /></span>
                  </div>
                  <div className="flex justify-between">
                    <span>{lang?.commission || 'Комиссия:'}</span>
                    <span className="text-zinc-200">{getCommissionInfo(sdbAmount).fees} <Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" /></span>
                  </div>
                  <div className="flex justify-between font-semibold text-white border-t border-zinc-800 pt-1 mt-1">
                    <span>{lang?.receiverwillget || 'Получатель получит:'}</span>
                    <span>{getCommissionInfo(sdbAmount).total} <Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" /></span>
                  </div>
                </div>
              )}

              {sendError && (
                <p className="text-red-500 text-sm font-semibold">{sendError}</p>
              )}

              <button
                type="submit"
                disabled={sendLoading || !sendSenderId || !sdbAmount || parseFloat(sdbAmount) <= 0 || (sdbDetailType === 'email' && !sdbEmail) || (sdbDetailType === 'phone' && !sdbPhone) || (sdbDetailType === 'login' && !sdbLogin)}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-100 rounded-3xl shadow cursor-pointer font-bold"
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
                  <span className="text-lg font-bold text-zinc-100">{successDetails.amount} <Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" /></span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-700 pb-2">
                  <span className="text-zinc-400">{lang?.commission || 'Комиссия'} ({successDetails.feePercent}%):</span>
                  <span className="text-zinc-300 font-semibold">{successDetails.fees} <Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" /></span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-700 pb-2">
                  <span className="text-zinc-400">{lang?.receiverwillget || 'Зачислено получателю:'}</span>
                  <span className="text-lg font-bold text-green-500">{successDetails.total} <Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" /></span>
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
                <Icon name="IC-warning-triangle" className="w-6 h-6 text-red-500 shrink-0 mt-0.5" fill="currentColor" />
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