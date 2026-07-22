'use client';

import React, { useState, useEffect, useRef } from 'react';
import Modal from '../../components/modal';
import { AncialAPI, type WalletAccount } from '../../lib/api-v2';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import AccountName from '../../components/account-name';

export interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientUsername?: string;
  recipientName?: string;
  recipientImg?: string;
}

function RubleIcon({ className = 'w-6 h-6 fill-purple-500' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path d="M 23.449219 5 A 1.50015 1.50015 0 0 0 22.439453 5.4394531 L 13.994141 13.886719 A 1.50015 1.50015 0 0 0 13.886719 13.992188 L 5.4394531 22.439453 A 1.50015 1.50015 0 0 0 5.0039062 23.599609 L 6.0039062 38.599609 A 1.50015 1.50015 0 0 0 7.3671875 39.994141 L 41.367188 42.994141 A 1.50015 1.50015 0 0 0 42.994141 41.367188 L 39.994141 7.3671875 A 1.50015 1.50015 0 0 0 38.599609 6.0039062 L 23.599609 5.0039062 A 1.50015 1.50015 0 0 0 23.449219 5 z M 26.046875 8.171875 L 35.103516 8.7753906 L 29.328125 14.550781 L 26.046875 8.171875 z M 23.107422 9.0136719 L 26.376953 15.371094 L 18.123047 13.998047 L 23.107422 9.0136719 z M 37.289062 10.832031 L 39.332031 34.007812 L 30.767578 17.353516 L 37.289062 10.832031 z M 16.824219 16.824219 L 25.595703 18.283203 L 18.283203 25.595703 L 16.824219 16.824219 z M 13.998047 18.123047 L 15.371094 26.376953 L 9.0136719 23.107422 L 13.998047 18.123047 z M 28.541016 19.580078 L 38.027344 38.027344 L 19.580078 28.541016 L 28.541016 19.580078 z M 8.171875 26.046875 L 14.550781 29.328125 L 8.7773438 35.101562 L 8.171875 26.046875 z M 17.353516 30.767578 L 34.007812 39.333984 L 10.832031 37.289062 L 17.353516 30.767578 z"></path>
    </svg>
  );
}

export function DonateModal({
  isOpen,
  onClose,
  recipientUsername,
  recipientName,
  recipientImg,
}: DonateModalProps) {
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const [step, setStep] = useState<'donate' | 'select' | 'success' | 'failed'>('donate');
  const [amount, setAmount] = useState<string>('');
  const [comment, setComment] = useState<string>('');

  const [recipientUser, setRecipientUser] = useState<{
    id: number;
    username: string;
    img?: string;
    name?: string;
  } | null>(null);

  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<number | null>(null);

  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [recipientError, setRecipientError] = useState<string | null>(null);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ transactionId: number; amount: number } | null>(null);

  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    // Only reset state when transitioning from closed to open
    if (!wasOpen && isOpen) {
      setStep('donate');
      setAmount('');
      setComment('');
      setSubmitError(null);
      setRecipientError(null);
      setSuccessInfo(null);

      if (recipientUsername) {
        setRecipientUser({
          id: 0,
          username: recipientUsername,
          img: recipientImg || '/includes/img/noavatar.png',
          name: recipientName,
        });
      } else {
        setRecipientUser(null);
      }

      const loadData = async () => {
        setLoadingAccounts(true);
        try {
          const overview = await AncialAPI.getWalletOverview();
          if (overview && Array.isArray(overview.accounts)) {
            setAccounts(overview.accounts);
            if (overview.accounts.length > 0) {
              setSelectedSenderId(overview.accounts[0].id);
            }
          }
        } catch (err) {
          console.error('Failed to load wallet accounts for donate modal:', err);
        } finally {
          setLoadingAccounts(false);
        }

        if (recipientUsername) {
          try {
            const profile = await AncialAPI.getProfile<any>(recipientUsername);
            if (profile && profile.id) {
              setRecipientUser({
                id: profile.id,
                username: profile.username || recipientUsername,
                img: profile.img || recipientImg || '/includes/img/noavatar.png',
                name: profile.name || recipientName,
              });
            }
          } catch (err) {
            // Keep fallback
          }
        }
      };

      loadData();
    }
  }, [isOpen, recipientUsername, recipientName, recipientImg]);

  const selectAmount = (val: number) => {
    setAmount(String(val));
  };

  const handleNextToSelect = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0 || num > 150000) {
      showNote({
        content: lang?.donate_amount_error || 'Укажите корректную сумму пожертвования (от 1 до 150 000 ₽)',
        type: 'warning',
        time: 5
      });
      return;
    }
    setStep('select');
  };

  const handleExecuteTransfer = async () => {
    if (!selectedSenderId) {
      showNote({
        content: lang?.select_account_error || 'Пожалуйста, выберите счет для отправки',
        type: 'warning',
        time: 5
      });
      return;
    }

    setSubmitLoading(true);
    setSubmitError(null);

    const transferComment = comment.trim() || `${lang?.donation_for || 'Пожертвование для @'}${recipientUser?.username || recipientUsername}`;
    const transferAmount = parseFloat(amount);

    try {
      const res = await AncialAPI.sendMoney({
        sender_id: selectedSenderId,
        amount: transferAmount,
        comment: transferComment,
        receiver_login: recipientUser?.username || recipientUsername,
      });

      if (res && res.transaction_id) {
        setSuccessInfo({
          transactionId: res.transaction_id,
          amount: res.amount,
        });
        setStep('success');
      } else {
        setSubmitError(lang?.donation_failed || 'Не удалось выполнить пожертвование');
        setStep('failed');
      }
    } catch (err: any) {
      setSubmitError(err.message || (lang?.donation_error || 'Ошибка выполнения пожертвования'));
      setStep('failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lang?.donation || "Пожертвование"}
      width="sm"
      bodyClassName="!pb-0"
    >
      <div className="flex flex-col items-center gap-3 text-zinc-100">
        {/* STEP 1: DONATE PRESETS & AMOUNT */}
        {step === 'donate' && (
          <div className="w-full flex flex-col gap-3 text-left pb-3">
            {recipientError ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <span className="text-pink-500 text-6xl font-black">:(</span>
                <span className="text-zinc-300 text-base text-center font-medium">{recipientError}</span>
              </div>
            ) : (
              <>
                {/* Recipient info card */}
                {(recipientUser || recipientUsername) && (
                  <div className="flex items-center gap-3 bg-zinc-800/80 p-3 rounded-3xl border border-zinc-600/30 text-left w-full">
                    <img
                      src={recipientUser?.img || recipientImg || '/includes/img/noavatar.png'}
                      className="w-12 h-12 rounded-2xl object-cover border border-zinc-700"
                      alt="Avatar"
                    />
                    <div className="flex flex-col min-w-0">
                      <AccountName
                        user={recipientUser}
                        name={recipientName}
                        showBadges={false}
                        fallback={`@${recipientUser?.username || recipientUsername}`}
                        className="text-base font-bold text-purple-400 truncate"
                        nameClassName="text-base font-bold text-purple-400 truncate"
                      />
                      <span className="text-zinc-400 text-xs">
                        @{recipientUser?.username || recipientUsername}
                      </span>
                    </div>
                  </div>
                )}

                {/* Grid of presets matching form.php exactly */}
                <div className="w-full grid grid-cols-2 gap-3">
                  {[
                    { value: 10, shadow: 'shadow-sky-500/25' },
                    { value: 50, shadow: 'shadow-lime-500/25' },
                    { value: 500, shadow: 'shadow-orange-500/25' },
                    { value: 1000, shadow: 'shadow-red-500/25' }
                  ].map((preset) => {
                    const isSelected = amount === String(preset.value);
                    return (
                      <div
                        key={preset.value}
                        onClick={() => selectAmount(preset.value)}
                        className="border border-zinc-600/30 rounded-3xl active:scale-95 duration-300 cursor-pointer"
                      >
                        <div
                          className={`flex flex-col rounded-3xl justify-center shadow-2xl ${preset.shadow} p-3 duration-300 ${isSelected
                            ? 'bg-zinc-700 border-zinc-500 text-white'
                            : 'bg-zinc-800/80 hover:bg-zinc-900 border-zinc-600'
                            }`}
                        >
                          <span className="flex items-center gap-1.5 text-3xl font-bold">
                            {preset.value}
                            <RubleIcon className="w-7 h-7 fill-purple-500" />
                          </span>
                          <span className="text-sm font-medium">{preset.value} ₽</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Divider matching form.php */}
                <div className="flex items-center justify-center gap-3 w-full my-1">
                  <div className="w-full flex-grow rounded-3xl bg-zinc-700/80 h-1" />
                  <span className="font-bold text-zinc-300 text-center lowercase">{lang?.or || 'или'}</span>
                  <div className="w-full flex-grow rounded-3xl bg-zinc-700/80 h-1" />
                </div>

                {/* Custom amount input matching form.php exactly */}
                <div className="text-zinc-100 rounded-3xl shadow w-full">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleNextToSelect();
                    }}
                    className="flex items-center bg-zinc-800 border border-zinc-600/30 rounded-3xl w-full p-1 h-12"
                  >
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={lang?.amount_placeholder || "Сумма"}
                      type="number"
                      min="1"
                      max="150000"
                      autoComplete="off"
                      className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-3 placeholder-zinc-500 text-white text-base"
                    />
                    <RubleIcon className="w-6 h-6 fill-purple-500 mr-3 shrink-0" />
                  </form>
                </div>

                {/* Send button matching form.php */}
                <button
                  type="button"
                  disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > 150000}
                  onClick={handleNextToSelect}
                  className="cursor-pointer sticky bottom-0 flex items-center justify-center gap-3 px-4 py-2 text-lg duration-300 disabled:bg-zinc-700 disabled:cursor-not-allowed active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-3xl border border-zinc-600/30 shadow w-full font-normal mt-1"
                >
                  {lang?.send || 'Отправить'}
                </button>
              </>
            )}
          </div>
        )}

        {/* STEP 2: SELECT SENDER ACCOUNT & CONFIRM (EXACT PHP MATCH) */}
        {step === 'select' && (
          <div className="w-full flex flex-col gap-3 text-left relative max-h-128 overflow-y-auto">
            {/* Top Amount Banner matching form.php */}
            <div className="fixed top-16 inset-x-0 z-[30] px-3 bg-gradient-to-b from-zinc-900">
              <div className="rounded-3xl border border-zinc-600/30 bg-zinc-800 flex items-center justify-center p-3">
                <span className="flex items-center gap-1.5 text-4xl font-bold">
                  {amount}
                  <RubleIcon className="w-8 h-8 fill-purple-500" />
                </span>
              </div>
            </div>

            {/* Account List matching form.php exactly with iOS touch scrolling fixes */}
            <div
              className="flex flex-col gap-3 pt-19 pb-35"
              style={{ WebkitOverflowScrolling: 'touch' }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {loadingAccounts ? (
                <div className="flex flex-col gap-3">
                  <div className="h-16 bg-zinc-800/80 border border-zinc-600/30 rounded-3xl animate-pulse" />
                  <div className="h-16 bg-zinc-800/80 border border-zinc-600/30 rounded-3xl animate-pulse" />
                </div>
              ) : accounts.length > 0 ? (
                accounts.map((acc) => {
                  const isSelected = selectedSenderId === acc.id;
                  return (
                    <div
                      key={acc.id}
                      onClick={() => setSelectedSenderId(acc.id)}
                      className={`wallet border border-zinc-600/30 shadow relative flex rounded-3xl p-2.5 flex-grow duration-300 cursor-pointer justify-center active:scale-95 ${isSelected
                        ? 'bg-purple-700/30 text-white'
                        : 'bg-zinc-800/80 hover:bg-zinc-900 text-zinc-300'
                        }`}
                    >
                      <div className="flex flex-col flex-grow">
                        <span className="text-lg">
                          {acc.name} <span className="text-sm text-zinc-400 font-normal">(#{acc.id})</span>
                        </span>
                        <span className="text-2xl font-extrabold flex items-center gap-1 mt-0.5">
                          {acc.balance}
                          <RubleIcon className="w-6 h-6 inline fill-purple-500 shrink-0" />
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-zinc-400 text-sm p-3 bg-zinc-800 rounded-2xl border border-zinc-700 text-center">
                  {lang?.noactiveaccounts || 'У вас нет активных счетов'}
                </div>
              )}
            </div>
            <div className="fixed bottom-0 inset-x-0 p-3 bg-gradient-to-t from-zinc-900">
              <div className="text-zinc-100 shadow w-full">
                <div className="flex bg-zinc-800 border border-zinc-600/30 rounded-3xl w-full p-2 h-16">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={lang?.donation_comment || "Комментарий к пожертвованию"}
                    rows={2}
                    className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white text-sm resize-none placeholder-zinc-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('donate')}
                  className="cursor-pointer px-5 py-2 text-lg rounded-3xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 duration-300 active:scale-95 border border-zinc-600/30"
                >
                  {lang?.back || 'Назад'}
                </button>
                <button
                  type="button"
                  disabled={submitLoading || !selectedSenderId}
                  onClick={handleExecuteTransfer}
                  className="flex-1 cursor-pointer flex items-center justify-center gap-3 px-4 py-2 text-lg duration-300 disabled:bg-zinc-700 disabled:cursor-not-allowed active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-3xl shadow border border-zinc-600/30"
                >
                  {submitLoading ? (lang?.sending || 'Отправка...') : (lang?.send || 'Отправить')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center gap-3 py-4 text-center w-full">
            <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center border border-green-500/40">
              <svg className="w-10 h-10 fill-current" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xl font-bold text-green-400">{lang?.donation_sent || 'Пожертвование отправлено!'}</span>
            <span className="text-zinc-300 text-sm">
              {lang?.you_transfered || 'Вы перевели '} <strong className="text-white">{successInfo?.amount} ₽</strong> {lang?.to_user || ' пользователю '}{' '}
              <strong className="text-purple-400">@{recipientUser?.username || recipientUsername}</strong>.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 px-6 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-3xl duration-300 active:scale-95 border border-zinc-600/30 text-base"
            >
              {lang?.close || 'Закрыть'}
            </button>
          </div>
        )}

        {/* STEP 4: FAILED */}
        {step === 'failed' && (
          <div className="flex flex-col items-center justify-center gap-3 py-4 text-center w-full">
            <span className="text-pink-500 text-6xl font-black">:(</span>
            <span className="text-zinc-300 text-base font-medium">{submitError || (lang?.donation_failed || 'Не удалось отправить пожертвование')}</span>
            <button
              type="button"
              onClick={() => setStep('donate')}
              className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-3xl duration-300 active:scale-95 border border-zinc-600/30 text-base"
            >
              {lang?.tryagain || 'Попробуйте ещё раз'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
