'use client';

import Modal from '../../components/modal';
import type { FormEvent, MouseEvent } from 'react';
import type { WalletAccount } from '../../lib/api-v2';

interface ProductsAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Record<string, string> | null;
  accounts: WalletAccount[];
  productsView: 'list' | 'confirm_delete' | 'create';
  setProductsView: (v: 'list' | 'confirm_delete' | 'create') => void;
  createAccountTitle: string;
  setCreateAccountTitle: (v: string) => void;
  createAccountError: string | null;
  createAccountLoading: boolean;
  accountToDelete: WalletAccount | null;
  deleteAccountError: string | null;
  deleteAccountLoading: boolean;
  handleTopage: (path: string) => void;
  handleCreateAccount: (e: FormEvent) => void;
  handleDeleteAccountClick: (e: MouseEvent, acc: WalletAccount) => void;
  handleConfirmDeleteAccount: () => void;
}

/**
 * Модалка «Мои продукты» (список счетов / создание / закрытие) — вынесена из
 * wallet-content дословно; состояние остаётся в WalletContent.
 */
export function ProductsAccountsModal({
  isOpen,
  onClose,
  lang,
  accounts,
  productsView,
  setProductsView,
  createAccountTitle,
  setCreateAccountTitle,
  createAccountError,
  createAccountLoading,
  accountToDelete,
  deleteAccountError,
  deleteAccountLoading,
  handleTopage,
  handleCreateAccount,
  handleDeleteAccountClick,
  handleConfirmDeleteAccount,
}: ProductsAccountsModalProps) {
  return (
    <>

      {/* 1. MODAL: Products/Accounts (Мои счета) */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        width="sm"
        showHeader={true}
        title={productsView === 'list' ? (lang?.my_prod || 'Мои продукты') : productsView === 'create' ? (lang?.t_account || 'Новый счёт') : (lang?.closeaccount || 'Закрыть счёт')}
        bodyClassName="max-h-96 p-0"
      >
        <div className="backdrop-filter backdrop-blur-lg">
          {productsView === 'list' && (
            <div className="flex flex-col gap-3">
              {accounts.map((acc) => (
                <div key={acc.id} className="border border-zinc-600/30 shadow relative flex rounded-3xl p-2 flex-grow text-zinc-100 bg-zinc-900 hover:bg-zinc-700 duration-300 cursor-pointer justify-center">
                  <div className="flex flex-col flex-grow">
                    <span className="text-lg">{acc.name} <span className="text-sm">({acc.id})</span></span>
                    <span className="text-2xl font-extrabold">
                      {acc.balance}{' '}
                      <svg className="w-6 h-6 lg:w-8 lg:h-8 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                        <use href="/icons.svg#IC-anci"></use>
                      </svg>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteAccountClick(e, acc)}
                    className="flex items-center px-1.5 duration-300 rounded-3xl cursor-pointer"
                  >
                    <svg className="fill-white w-8 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                      <path d="M 39.486328 6.9785156 A 1.50015 1.50015 0 0 0 38.439453 7.4394531 L 24 21.878906 L 9.5605469 7.4394531 A 1.50015 1.50015 0 0 0 8.484375 6.984375 A 1.50015 1.50015 0 0 0 7.4394531 9.5605469 L 21.878906 24 L 7.4394531 38.439453 A 1.50015 1.50015 0 1 0 9.5605469 40.560547 L 24 26.121094 L 38.439453 40.560547 A 1.50015 1.50015 0 1 0 40.560547 38.439453 L 26.121094 24 L 40.560547 9.5605469 A 1.50015 1.50015 0 0 0 39.486328 6.9785156 z"></path>
                    </svg>
                  </button>
                </div>
              ))}
              <div className="flex gap-3 sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setProductsView('create')}
                  className="shadow border border-zinc-600/30 active:scale-95 shadow relative flex rounded-3xl p-2 flex-grow text-zinc-100 bg-zinc-900/20 hover:bg-zinc-700 backdrop-blur-md backdrop-saturate-200 duration-300 cursor-pointer justify-center"
                >
                  <div className="flex flex-col flex-grow text-left">
                    <span className="text-lg lg:text-2xl font-extrabold">{lang?.t_account || 'Товарный счёт'}</span>
                    <span className="text-xs lg:text-lg">{lang?.t_account_desc || 'Откройте новый счёт'}</span>
                  </div>
                  <div className="flex items-center px-1.5 duration-300">
                    <svg className="fill-white w-10 h-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                      <path d="M 23.976562 4.9785156 A 1.50015 1.50015 0 0 0 22.5 6.5 L 22.5 22.5 L 6.5 22.5 A 1.50015 1.50015 0 1 0 6.5 25.5 L 22.5 25.5 L 22.5 41.5 A 1.50015 1.50015 0 1 0 25.5 41.5 L 25.5 25.5 L 41.5 25.5 A 1.50015 1.50015 0 1 0 41.5 22.5 L 25.5 22.5 L 25.5 6.5 A 1.50015 1.50015 0 0 0 23.976562 4.9785156 z"></path>
                    </svg>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { onClose(); handleTopage('/wallet/merchant'); }}
                  className="shadow border border-zinc-600/30 active:scale-95 shadow relative flex rounded-3xl p-2 flex-grow text-zinc-100 bg-zinc-900/20 hover:bg-zinc-700 backdrop-blur-md backdrop-saturate-200 duration-300 cursor-pointer justify-center"
                >
                  <div className="flex flex-col flex-grow text-left">
                    <span className="text-lg lg:text-2xl font-extrabold">{lang?.merchant || 'Мерчант'}</span>
                    <span className="text-xs lg:text-lg">{lang?.merchant_desc || 'Подключение сайтов'}</span>
                  </div>
                  <div className="flex items-center px-1.5 duration-300">
                    <svg className="fill-white w-10 h-10" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                      <path d="M 23.976562 4.9785156 A 1.50015 1.50015 0 0 0 22.5 6.5 L 22.5 22.5 L 6.5 22.5 A 1.50015 1.50015 0 1 0 6.5 25.5 L 22.5 25.5 L 22.5 41.5 A 1.50015 1.50015 0 1 0 25.5 41.5 L 25.5 25.5 L 41.5 25.5 A 1.50015 1.50015 0 1 0 41.5 22.5 L 25.5 22.5 L 25.5 6.5 A 1.50015 1.50015 0 0 0 23.976562 4.9785156 z"></path>
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          )}

          {productsView === 'confirm_delete' && accountToDelete && (
            <div className="flex flex-col gap-3 text-zinc-100">
              <p className="text-base text-zinc-300">
                {lang?.want_to_close_account || 'Вы хотите закрыть счет'} <span className="font-bold text-white">{accountToDelete.name}</span> <span className="font-mono text-zinc-400">({accountToDelete.id})</span>?
              </p>
              <p className="text-xs text-zinc-400">
                {lang?.closed_accounts_notice || 'Закрытые счета нельзя будет восстановить. Убедитесь, что на счете отсутствуют средства, иначе они будут списаны безвозвратно.'}
              </p>
              {deleteAccountError && (
                <p className="text-red-500 text-sm font-semibold">{deleteAccountError}</p>
              )}
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={handleConfirmDeleteAccount}
                  disabled={deleteAccountLoading}
                  className="flex-1 flex items-center justify-center gap-3 px-4 py-3 text-base duration-300 active:scale-95 bg-red-600 hover:bg-red-500 disabled:bg-red-800/50 disabled:text-zinc-400 text-zinc-100 rounded-3xl cursor-pointer font-bold"
                >
                  {deleteAccountLoading ? (
                    <div className="w-5 h-5 rounded-full animate-spin border-2 border-solid border-white border-t-transparent" />
                  ) : (
                    lang?.closeaccount || 'Закрыть счёт'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setProductsView('list')}
                  disabled={deleteAccountLoading}
                  className="flex-1 flex items-center justify-center gap-3 px-4 py-3 text-base duration-300 active:scale-95 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-3xl cursor-pointer font-semibold border border-zinc-700"
                >
                  {lang?.cancel || 'Отмена'}
                </button>
              </div>
            </div>
          )}

          {productsView === 'create' && (
            <form onSubmit={handleCreateAccount} className="flex flex-col gap-3 text-zinc-100">
              <p className="text-sm text-zinc-400">
                {lang?.account_desc || 'Счёт позволит вам отправлять переводы внутри системы, а также принимать пополнения и оплачивать услуги.'}
              </p>
              <div className="flex flex-col w-full text-left">
                <span className="text-zinc-400 pl-4 z-20 -mt-1.5">{lang?.accountname || 'Название счёта'}</span>
                <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                  <input
                    type="text"
                    value={createAccountTitle}
                    onChange={(e) => setCreateAccountTitle(e.target.value)}
                    placeholder={lang?.eg_personal_account || "Например: Личный счёт"}
                    maxLength={50}
                    className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600 text-white"
                  />
                </div>
              </div>
              {createAccountError && (
                <p className="text-red-500 text-sm font-semibold">{createAccountError}</p>
              )}
              <div className="flex gap-3 mt-2">
                <button
                  type="submit"
                  disabled={createAccountLoading}
                  className="flex-1 flex items-center justify-center gap-3 px-4 py-3 text-base duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 disabled:bg-purple-800/50 disabled:text-zinc-400 text-zinc-100 rounded-3xl shadow cursor-pointer font-bold"
                >
                  {createAccountLoading ? (
                    <div className="w-5 h-5 rounded-full animate-spin border-2 border-solid border-white border-t-transparent" />
                  ) : (
                    lang?.createaccount || 'Создать счёт'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setProductsView('list')}
                  disabled={createAccountLoading}
                  className="flex-1 flex items-center justify-center gap-3 px-4 py-3 text-base duration-300 active:scale-95 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-3xl cursor-pointer font-semibold border border-zinc-700"
                >
                  {lang?.back || 'Назад'}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}
