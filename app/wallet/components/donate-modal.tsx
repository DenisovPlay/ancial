'use client';

import React, { useState, useEffect, useRef } from 'react';
import Modal from '../../components/modal';
import { AncialAPI, getApiMessage, type WalletAccount } from '../../lib/api-v2';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import AccountName from '../../components/account-name';
import AppImage from '../../components/app-image';
import Icon from '../../components/svg-icon';

export interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientUsername?: string;
  recipientName?: string;
  recipientImg?: string;
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
        // Открытие модалки: предзаполняем получателя из пропов — сеттлер здесь источник правды.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRecipientUser({
          id: 0,
          username: recipientUsername,
          img: recipientImg || '/img/placeholders/user.png',
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
            const profile = await AncialAPI.getProfile<{ id?: number | string; username?: string; img?: string; name?: string }>(recipientUsername);
            if (profile && profile.id) {
              setRecipientUser({
                id: Number(profile.id),
                username: profile.username || recipientUsername,
                img: profile.img || recipientImg || '/img/placeholders/user.png',
                name: profile.name || recipientName,
              });
            }
          } catch {
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
    } catch (err) {
      setSubmitError(getApiMessage(err instanceof Error ? err.message : null, lang, lang?.donation_error || 'Ошибка выполнения пожертвования'));
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
      onBack={step === 'select' ? () => setStep('donate') : undefined}
      backLabel={lang?.back || 'Назад'}
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
                  <div className="flex items-center gap-3 w-full">
                    <AppImage
                      width={56}
                      height={56}
                      fallbackSrc="/img/placeholders/user.png"
                      src={recipientUser?.img || recipientImg || '/img/placeholders/user.png'}
                      className="w-14 h-14 rounded-full object-cover border border-zinc-700"
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
                            <Icon name="IC-anci" className="w-7 h-7 fill-purple-500" />
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
                    <Icon name="IC-anci" className="w-6 h-6 fill-purple-500 mr-3 shrink-0" />
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
                  <Icon name="IC-anci" className="w-8 h-8 fill-purple-500" />
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
                          <Icon name="IC-anci" className="w-6 h-6 inline fill-purple-500 shrink-0" />
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

              <button
                type="button"
                disabled={submitLoading || !selectedSenderId}
                onClick={handleExecuteTransfer}
                className="w-full cursor-pointer flex items-center justify-center gap-3 px-4 py-2 text-lg duration-300 disabled:bg-zinc-700 disabled:cursor-not-allowed active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-3xl shadow border border-zinc-600/30 mt-3"
              >
                {submitLoading ? (lang?.sending || 'Отправка...') : (lang?.send || 'Отправить')}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center gap-3 py-4 text-center w-full">
            <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center border border-green-500/40">
              <Icon name="IC-check-sm" className="w-10 h-10 fill-current" />
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
