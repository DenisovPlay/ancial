'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AncialAPI, type WalletAccount } from '../../lib/api-v2';

function FormContentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, isAuthenticated, isLoading: authLoading, user } = useAuth();

  // Wizard state
  const [step, setStep] = useState<'donate' | 'sendtouser' | 'confirmsend' | 'select' | 'success' | 'failed'>('sendtouser');
  const [embeded, setEmbeded] = useState(false);

  // General fields
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [transferType, setTransferType] = useState<'donate' | 'transfer'>('transfer');

  // Recipient details
  const [recipientType, setRecipientType] = useState<'username' | 'email' | 'phone' | 'account'>('username');
  const [recipientValue, setRecipientValue] = useState('');
  const [recipientAccountId, setRecipientAccountId] = useState<number | null>(null);
  const [preferredSenderId, setPreferredSenderId] = useState<number | null>(null);
  const [recipientUser, setRecipientUser] = useState<{
    id: number;
    username: string;
    img?: string;
  } | null>(null);

  // Accounts list (for sender selection)
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<number | null>(null);

  // Lookup states
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Execution states
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Success details
  const [successInfo, setSuccessInfo] = useState<{
    transactionId: number;
    amount: number;
    fees: number;
    total: number;
    sender: number;
    receiver: string;
    receiverIsAccount: boolean;
    comment: string;
  } | null>(null);

  const strings = useMemo(() => {
    return {
      send: lang?.send || 'Перевести',
      deposit: lang?.deposit || 'Пополнить',
      cancel: lang?.cancel || 'Отменить',
      active: lang?.active || 'Активен',
      all: lang?.all || 'Все',
      or: lang?.or || 'или',
      t_amm: lang?.t_amm || 'Сумма',
      recipient: lang?.recipient || 'Получатель'
    };
  }, [lang]);

  // Initial load from URL search params
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push(`/login?backurl=/wallet/form?${searchParams.toString()}`);
      return;
    }

    const formParam = searchParams.get('form');
    const uParam = searchParams.get('u') || searchParams.get('username');
    const emailParam = searchParams.get('email');
    const phoneParam = searchParams.get('phone');
    const receiverIdParam = searchParams.get('receiver_id');
    const receiverNameParam = searchParams.get('receiver_name');
    const senderIdParam = searchParams.get('sender_id');
    const amountParam = searchParams.get('amount');
    const commentParam = searchParams.get('comment');
    const typeParam = searchParams.get('type') as 'donate' | 'transfer';
    const embededParam = searchParams.get('embeded') === '1';
    const resolvedReceiverId = receiverIdParam ? Number(receiverIdParam) : null;
    const resolvedSenderId = senderIdParam ? Number(senderIdParam) : null;

    setEmbeded(embededParam);
    setPreferredSenderId(resolvedSenderId && Number.isFinite(resolvedSenderId) ? resolvedSenderId : null);
    if (resolvedSenderId && Number.isFinite(resolvedSenderId)) {
      setSelectedSenderId(resolvedSenderId);
    }

    const applyDirectReceiver = () => {
      if (!resolvedReceiverId || !Number.isFinite(resolvedReceiverId)) return false;
      setRecipientType('account');
      setRecipientAccountId(resolvedReceiverId);
      setRecipientValue(receiverNameParam?.trim() || `Счёт №${resolvedReceiverId}`);
      setRecipientUser(null);
      return true;
    };

    if (formParam === 'donate') {
      setStep('donate');
      setTransferType('donate');
      if (uParam) {
        setRecipientValue(uParam);
        fetchRecipientProfile(uParam);
      }
    } else if (formParam === 'sendtouser') {
      setStep('sendtouser');
      setTransferType('transfer');
      if (applyDirectReceiver()) {
        if (amountParam) setAmount(amountParam);
        if (commentParam) setComment(commentParam);
      } else if (uParam) {
        setRecipientType('username');
        setRecipientAccountId(null);
        setRecipientValue(uParam);
        fetchRecipientProfile(uParam);
      } else if (emailParam) {
        setRecipientType('email');
        setRecipientAccountId(null);
        setRecipientValue(emailParam);
      } else if (phoneParam) {
        setRecipientType('phone');
        setRecipientAccountId(null);
        setRecipientValue(phoneParam);
      }
    } else if (formParam === 'confirmsend') {
      setStep('confirmsend');
      if (applyDirectReceiver()) {
        if (amountParam) setAmount(amountParam);
        if (commentParam) setComment(commentParam);
      } else if (uParam) {
        setRecipientType('username');
        setRecipientAccountId(null);
        setRecipientValue(uParam);
        fetchRecipientProfile(uParam);
      } else if (emailParam) {
        setRecipientType('email');
        setRecipientAccountId(null);
        setRecipientValue(emailParam);
      } else if (phoneParam) {
        setRecipientType('phone');
        setRecipientAccountId(null);
        setRecipientValue(phoneParam);
      }
      if (amountParam) setAmount(amountParam);
      if (commentParam) setComment(commentParam);
    } else if (formParam === 'select') {
      setStep('select');
      if (applyDirectReceiver()) {
        if (amountParam) setAmount(amountParam);
        if (commentParam) setComment(commentParam);
      } else if (uParam) {
        setRecipientType('username');
        setRecipientAccountId(null);
        setRecipientValue(uParam);
      } else if (emailParam) {
        setRecipientType('email');
        setRecipientAccountId(null);
        setRecipientValue(emailParam);
      } else if (phoneParam) {
        setRecipientType('phone');
        setRecipientAccountId(null);
        setRecipientValue(phoneParam);
      }
      if (amountParam) setAmount(amountParam);
      if (commentParam) setComment(commentParam);
      if (typeParam) setTransferType(typeParam);
      loadAccounts(resolvedSenderId && Number.isFinite(resolvedSenderId) ? resolvedSenderId : undefined);
    } else if (formParam === 'success') {
      setStep('success');
      if (amountParam) setAmount(amountParam);
      if (commentParam) setComment(commentParam);
      if (typeParam) setTransferType(typeParam);
    } else if (formParam === 'failed') {
      setStep('failed');
      setSubmitError(searchParams.get('error') || 'Произошла ошибка при выполнении операции');
    }
  }, [authLoading, isAuthenticated, searchParams]);

  const fetchRecipientProfile = async (login: string) => {
    setLookupLoading(true);
    setLookupError(null);
    try {
      const res = await AncialAPI.getProfile<any>(login);
      if (res && res.id) {
        if (user && res.id === user.id) {
          setLookupError('Вы не можете отправить перевод самому себе');
          setRecipientUser(null);
        } else {
          setRecipientUser({
            id: res.id,
            username: res.username || login,
            img: res.img || '/includes/img/noavatar.png'
          });
        }
      } else {
        setLookupError('Пользователь не найден');
        setRecipientUser(null);
      }
    } catch (err: any) {
      setLookupError('Пользователь не найден');
      setRecipientUser(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const loadAccounts = async (senderIdOverride?: number) => {
    const cached = localStorage.getItem('wallet_overview_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.accounts)) {
          setAccounts(parsed.accounts);
          if (parsed.accounts.length > 0) {
            const preferredId = senderIdOverride ?? selectedSenderId ?? preferredSenderId;
            const matched = preferredId ? parsed.accounts.find((account: any) => account.id === preferredId) : null;
            setSelectedSenderId(matched ? matched.id : parsed.accounts[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to parse cached overview in form:', e);
      }
    }

    try {
      const overview = await AncialAPI.getWalletOverview();
      setAccounts(overview.accounts || []);
      if (overview.accounts && overview.accounts.length > 0) {
        const preferredId = senderIdOverride ?? selectedSenderId ?? preferredSenderId;
        const matched = preferredId ? overview.accounts.find((account) => account.id === preferredId) : null;
        setSelectedSenderId(matched ? matched.id : overview.accounts[0].id);
      }
      localStorage.setItem('wallet_overview_cache', JSON.stringify(overview));
    } catch (err: any) {
      console.error('Failed to load user accounts:', err);
    }
  };

  const selectAmountPreset = (val: number) => {
    setAmount(String(val));
  };

  // Step 1 -> Step 2 (Lookup verification if username input)
  const handleDonateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      alert('Укажите корректную сумму');
      return;
    }
    // Proceed to select sender account
    loadAccounts();
    setStep('select');
  };

  // SendToUser Submit
  const handleSendToUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recipientType !== 'account' && !recipientValue.trim()) {
      alert('Укажите получателя');
      return;
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0 || parsed > 150000) {
      alert('Укажите сумму перевода (от 1 до 150000 ₽)');
      return;
    }

    if (recipientType === 'account') {
      if (!recipientAccountId) {
        alert('Не удалось определить счёт получателя');
        return;
      }
      setStep('confirmsend');
      return;
    }

    if (recipientType === 'username') {
      setLookupLoading(true);
      try {
        const res = await AncialAPI.getProfile<any>(recipientValue.trim());
        if (res && res.id) {
          if (user && res.id === user.id) {
            alert('Вы не можете переводить деньги самому себе');
            setLookupLoading(false);
            return;
          }
          setRecipientUser({
            id: res.id,
            username: res.username || recipientValue.trim(),
            img: res.img || '/includes/img/noavatar.png'
          });
          setStep('confirmsend');
        } else {
          alert('Пользователь с таким логином не найден');
        }
      } catch (err) {
        alert('Пользователь с таким логином не найден');
      } finally {
        setLookupLoading(false);
      }
    } else {
      // Email / Phone (no pre-lookup profile, confirm directly)
      setStep('confirmsend');
    }
  };

  // Confirm -> Select Sender account
  const handleConfirmSubmit = () => {
    loadAccounts();
    setStep('select');
  };

  // Execute transfer call
  const handleExecuteTransfer = async () => {
    if (!selectedSenderId) {
      alert('Выберите счёт списания');
      return;
    }

    setSubmitLoading(true);
    setSubmitError(null);

    const params: any = {
      sender_id: selectedSenderId,
      amount: parseFloat(amount),
      comment: comment.trim() || (
        transferType === 'donate'
          ? `Пожертвование для @${recipientValue}`
          : recipientType === 'account'
            ? `Перевод для ${recipientValue}`
            : `Перевод для @${recipientValue}`
      )
    };

    if (recipientType === 'account' && recipientAccountId) params.receiver_id = recipientAccountId;
    else if (recipientType === 'username') params.receiver_login = recipientValue.trim();
    else if (recipientType === 'email') params.receiver_email = recipientValue.trim();
    else if (recipientType === 'phone') params.receiver_phone = recipientValue.trim();

    try {
      const res = await AncialAPI.sendMoney(params);
      if (res && res.transaction_id) {
        setSuccessInfo({
          transactionId: res.transaction_id,
          amount: res.amount,
          fees: res.fees,
          total: res.amount - res.fees,
          sender: selectedSenderId,
          receiver: recipientType === 'account' ? recipientValue : recipientValue.trim(),
          receiverIsAccount: recipientType === 'account',
          comment: params.comment
        });
        setStep('success');
      } else {
        setSubmitError('Не удалось выполнить перевод');
        setStep('failed');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Ошибка выполнения перевода');
      setStep('failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col w-full items-center justify-start pt-4 pb-6 gap-3 bg-zinc-950 min-h-screen text-zinc-100">
        <div className="w-full max-w-3xl h-14 flex items-center gap-3 px-3 lg:px-0">
          <div className="h-8 w-32 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
        </div>
        <div className="w-full max-w-3xl flex flex-col gap-3 px-3 lg:px-0">
          <div className="w-full h-48 bg-zinc-900/40 border border-zinc-800/60 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col w-full items-center justify-start pb-6 gap-3 bg-zinc-950 min-h-screen text-zinc-100 ${embeded ? 'pt-2' : 'pt-4'}`}>

      {/* Header (hidden if embeded) */}
      {!embeded && (
        <div className="w-full max-w-3xl h-14 flex items-center gap-3 px-3 lg:px-0 sticky top-0 bg-gradient-to-b from-zinc-950 via-zinc-950/90 to-transparent" style={{ zIndex: 99 }}>
          <span onClick={() => router.push('/wallet')} className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer">
            <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path d="M 29.449219 4.9863281 A 1.50015 1.50015 0 0 0 28.423828 5.4550781 L 11.423828 22.955078 A 1.50015 1.50015 0 0 0 11.423828 25.044922 L 28.423828 42.544922 A 1.50015 1.50015 0 1 0 30.576172 40.455078 L 14.591797 24 L 30.576172 7.5449219 A 1.50015 1.50015 0 0 0 29.449219 4.9863281 z" />
            </svg>
            Платёжная форма
          </span>
        </div>
      )}

      {/* STEP 1: DONATE PRESETS */}
      {step === 'donate' && (
        <div className="w-full max-w-3xl flex flex-col gap-5 px-3">
          {lookupError ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <span className="text-pink-500 text-6xl font-black">:(</span>
              <span className="text-zinc-300 text-lg text-center font-medium">{lookupError}</span>
              {!embeded && (
                <button onClick={() => router.push('/wallet')} className="px-6 py-2.5 bg-purple-700 hover:bg-purple-600 rounded-full font-bold active:scale-95 duration-300">
                  В кошелёк
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleDonateSubmit} className="flex flex-col gap-5 w-full">
              {!embeded && <span className="text-xl font-bold text-left">Выберите сумму пожертвования:</span>}

              {/* Recipient User Profile Card */}
              {recipientUser && (
                <div className="flex items-center gap-3 bg-zinc-900/60 p-4 rounded-3xl border border-zinc-800 text-left">
                  <img src={recipientUser.img} className="w-16 h-16 rounded-2xl object-cover border border-zinc-800" alt="Avatar" />
                  <div className="flex flex-col">
                    <span className="text-zinc-400 text-xs uppercase tracking-wider font-bold">Получатель пожертвования:</span>
                    <span className="text-xl font-bold text-purple-400">@{recipientUser.username}</span>
                  </div>
                </div>
              )}

              {/* Amount Presets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[10, 50, 500, 1000].map((preset) => (
                  <div
                    key={preset}
                    onClick={() => selectAmountPreset(preset)}
                    className={`border border-zinc-700/30 rounded-3xl p-4 flex flex-col justify-center items-center cursor-pointer active:scale-95 duration-300 shadow-xl ${amount === String(preset)
                      ? 'bg-purple-700/80 border-purple-500 text-white shadow-purple-900/20'
                      : 'bg-zinc-800/80 hover:bg-zinc-900 text-zinc-300'
                      }`}
                  >
                    <span className="text-2xl font-bold">{preset} ₽</span>
                  </div>
                ))}
              </div>

              {/* Separator */}
              <div className="flex items-center justify-center gap-3 -my-2.5">
                <div className="w-full flex-grow rounded-3xl bg-zinc-850 h-0.5" />
                <span className="font-bold text-zinc-500 text-sm lowercase">{strings.or}</span>
                <div className="w-full flex-grow rounded-3xl bg-zinc-850 h-0.5" />
              </div>

              {/* Input for Amount with rounded-full container */}
              <div className="flex flex-col w-full text-left">
                <span className="text-zinc-400 pl-4 z-20">Сумма (₽)</span>
                <div className="flex bg-zinc-850 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-750">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Введите сумму"
                    className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-4 text-white text-base"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!amount || parseFloat(amount) <= 0}
                className="border border-zinc-700/40 cursor-pointer flex items-center justify-center gap-3 px-4 py-3 text-lg duration-300 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-full shadow"
              >
                Продолжить
              </button>
            </form>
          )}
        </div>
      )}

      {/* STEP 2: SEND TO USER */}
      {step === 'sendtouser' && (
        <div className="w-full max-w-3xl flex flex-col gap-3 px-3">
          <form onSubmit={handleSendToUserSubmit} className="flex flex-col gap-3 w-full">
            {!embeded && <span className="text-xl font-bold text-left">Перевод пользователю:</span>}

            {/* Recipient Selector (Login, Email, Phone) */}
            {recipientType !== 'account' ? (
              <>
                <div className="flex gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-2xl">
                  {(['username', 'email', 'phone'] as const).map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => {
                        setRecipientType(type);
                        setRecipientAccountId(null);
                        setRecipientValue('');
                      }}
                      className={`flex-1 py-2 text-sm font-semibold rounded-xl duration-300 active:scale-95 capitalize ${recipientType === type ? 'bg-purple-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                      {type === 'username' ? 'Логин' : type === 'email' ? 'Email' : 'Телефон'}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col w-full text-left">
                  <span className="text-zinc-400 pl-4 z-20">
                    {recipientType === 'username' ? 'Логин получателя' : recipientType === 'email' ? 'Email получателя' : 'Телефон получателя'}
                  </span>
                  <div className="flex bg-zinc-850 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-750">
                    <input
                      type={recipientType === 'email' ? 'email' : recipientType === 'phone' ? 'tel' : 'text'}
                      value={recipientValue}
                      onChange={(e) => setRecipientValue(e.target.value)}
                      placeholder={recipientType === 'username' ? 'Логин' : recipientType === 'email' ? 'Email' : 'Телефон'}
                      className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-4 text-white text-base"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Счёт получателя</span>
                <span className="text-lg font-bold text-white">{recipientValue}</span>
                {recipientAccountId && (
                  <span className="w-fit rounded-full border border-zinc-700 bg-zinc-950/70 px-3 py-1 text-xs text-zinc-400">
                    ID счёта: {recipientAccountId}
                  </span>
                )}
              </div>
            )}

            {/* Amount Input */}
            <div className="flex flex-col w-full text-left">
              <span className="text-zinc-400 pl-4 z-20">Сумма перевода (₽)</span>
              <div className="flex bg-zinc-850 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-750">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Сумма"
                  className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-4 text-white text-base"
                  required
                  min="1"
                  max="150000"
                />
              </div>
            </div>

            {/* Comment Area */}
            <div className="flex flex-col w-full text-left">
              <span className="text-zinc-400 pl-4 z-20">Комментарий (опционально)</span>
              <div className="flex bg-zinc-850 rounded-3xl w-full p-2 h-24 -mt-3 z-10 border border-zinc-750">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Комментарий"
                  rows={3}
                  className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white text-base resize-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={lookupLoading}
              className="border border-zinc-700/40 cursor-pointer flex items-center justify-center gap-3 px-4 py-3 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-full shadow"
            >
              {lookupLoading ? 'Проверка...' : 'Продолжить'}
            </button>
          </form>
        </div>
      )}

      {/* STEP 3: CONFIRM SEND */}
      {step === 'confirmsend' && (
        <div className="w-full max-w-3xl flex flex-col gap-3 px-3 text-left">
          {!embeded && <span className="text-xl font-bold">Подтверждение перевода</span>}

          <div className="bg-zinc-900/60 rounded-3xl p-5 space-y-4 border border-zinc-800">

            {/* If resolved profile */}
            {recipientUser ? (
              <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
                <img src={recipientUser.img} className="w-16 h-16 rounded-2xl object-cover border border-zinc-800" alt="Avatar" />
                <div className="flex flex-col">
                  <span className="text-zinc-400 text-xs">Получатель:</span>
                  <span className="text-xl font-bold">@{recipientUser.username}</span>
                </div>
              </div>
            ) : recipientType === 'account' ? (
              <div className="flex flex-col border-b border-zinc-800 pb-3 gap-1">
                <span className="text-zinc-400 text-xs">Получатель:</span>
                <span className="text-lg font-bold truncate">{recipientValue}</span>
                {recipientAccountId && (
                  <span className="text-xs text-zinc-500">Счёт №{recipientAccountId}</span>
                )}
              </div>
            ) : (
              <div className="flex flex-col border-b border-zinc-800 pb-3 gap-1">
                <span className="text-zinc-400 text-xs">Получатель:</span>
                <span className="text-lg font-bold truncate">
                  {recipientType === 'email' ? `Email: ${recipientValue}` : `Телефон: ${recipientValue}`}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="text-zinc-400 text-sm">Сумма перевода:</span>
              <span className="text-2xl font-black text-purple-400">{amount} ₽</span>
            </div>

            {comment && (
              <div className="flex flex-col gap-1">
                <span className="text-zinc-400 text-sm">Комментарий:</span>
                <span className="text-zinc-100 text-sm bg-black/45 p-3 rounded-2xl border border-zinc-600/30">{comment}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleConfirmSubmit}
            className="border border-zinc-700/40 cursor-pointer flex items-center justify-center gap-3 px-4 py-3 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-full shadow"
          >
            Продолжить
          </button>
        </div>
      )}

      {/* STEP 4: SELECT SENDER ACCOUNT */}
      {step === 'select' && (
        <div className="w-full max-w-3xl flex flex-col gap-3 px-3 text-left">

          <div className="bg-zinc-900/60 rounded-3xl p-5 flex items-center justify-center border border-zinc-800">
            <span className="text-3xl font-black text-purple-400">{amount} ₽</span>
          </div>

          <span className="text-lg font-bold px-2">Выберите счёт списания:</span>

          <div className="flex flex-col gap-3 w-full max-h-80 overflow-y-auto">
            {accounts.map((acc) => {
              const isSelected = selectedSenderId === acc.id;
              return (
                <div
                  key={acc.id}
                  onClick={() => setSelectedSenderId(acc.id)}
                  className={`border rounded-3xl p-4 flex flex-col cursor-pointer duration-300 active:scale-98 shadow-md ${isSelected
                    ? 'bg-purple-700/30 border-purple-500 text-white'
                    : 'bg-zinc-850 hover:bg-zinc-800 border-zinc-750 text-zinc-300'
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold">{acc.name} <span className="text-xs text-zinc-400">(#{acc.id})</span></span>
                    <span className="text-xl font-extrabold text-white">{acc.balance} ₽</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleExecuteTransfer}
            disabled={submitLoading || !selectedSenderId}
            className="border border-zinc-700/40 cursor-pointer flex items-center justify-center gap-3 px-4 py-3 text-lg duration-300 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-full shadow font-bold"
          >
            {submitLoading ? 'Выполнение перевода...' : 'Отправить перевод'}
          </button>
        </div>
      )}

      {/* STEP 5: SUCCESS OUTCOME */}
      {step === 'success' && (
        <div className="w-full max-w-3xl flex flex-col items-center gap-5 px-3">

          {/* Animated checkmark */}
          <div className="relative pt-6">
            <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" style={{ width: 120, height: 120 }}>
              <circle cx="26" cy="26" r="25" fill="none" stroke="#10B981" strokeWidth="2" style={{ strokeDasharray: 166, strokeDashoffset: 0 }} />
              <path fill="none" stroke="#10B981" strokeWidth="3" d="M14.1 27.2l7.1 7.2 16.7-16.8" style={{ strokeDasharray: 48, strokeDashoffset: 0 }} />
            </svg>
          </div>

          <span className="text-2xl font-black text-green-500">Успешный перевод</span>

          {successInfo && (
            <div className="bg-zinc-900/60 rounded-3xl p-5 w-full text-sm space-y-2.5 border border-zinc-800 text-left">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">ID Операции:</span>
                <span className="font-mono text-zinc-200">#{successInfo.transactionId}</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Сумма:</span>
                <span className="font-bold text-white text-base">{successInfo.amount} ₽</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Комиссия:</span>
                <span className="text-zinc-300">{successInfo.fees} ₽</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Счёт списания:</span>
                <span className="text-zinc-300">Счёт №{successInfo.sender}</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Получатель:</span>
                <span className="text-zinc-300">{successInfo.receiverIsAccount ? successInfo.receiver : `@${successInfo.receiver}`}</span>
              </div>
              {successInfo.comment && (
                <div className="flex flex-col gap-1 border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400 text-xs">Комментарий:</span>
                  <span className="text-zinc-200">{successInfo.comment}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 w-full">
            {successInfo && (
              <button
                onClick={() => window.open(`https://ancial.ru/api/wallet/generate_receipt.php?id=${successInfo.transactionId}`, '_blank')}
                className="flex-1 flex items-center justify-center gap-3 px-4 py-3 text-base duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-3xl shadow cursor-pointer font-bold"
              >
                Чек
              </button>
            )}
            <button
              onClick={() => router.push('/wallet')}
              className="flex-1 flex items-center justify-center gap-3 px-4 py-3 text-base duration-300 active:scale-95 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-3xl cursor-pointer font-semibold border border-zinc-750"
            >
              В кошелёк
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: FAILED OUTCOME */}
      {step === 'failed' && (
        <div className="w-full max-w-3xl flex flex-col items-center gap-5 px-3">

          {/* Crossmark */}
          <div className="relative pt-6">
            <svg className="crossmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" style={{ width: 120, height: 120 }}>
              <circle cx="26" cy="26" r="25" fill="none" stroke="#EF4444" strokeWidth="2" />
              <path fill="none" stroke="#EF4444" strokeWidth="3" d="M16 16l20 20M36 16L16 36" />
            </svg>
          </div>

          <span className="text-2xl font-black text-red-500">Ошибка перевода</span>
          <span className="text-zinc-300 text-center font-medium leading-relaxed max-w-md">
            {submitError || 'Не удалось завершить операцию. Попробуйте еще раз.'}
          </span>

          <div className="flex gap-3 w-full mt-4">
            <button
              onClick={() => setStep('sendtouser')}
              className="flex-1 flex items-center justify-center gap-3 px-4 py-3 text-base duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-3xl shadow cursor-pointer font-bold"
            >
              Попробовать снова
            </button>
            <button
              onClick={() => router.push('/wallet')}
              className="flex-1 flex items-center justify-center gap-3 px-4 py-3 text-base duration-300 active:scale-95 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-3xl cursor-pointer font-semibold border border-zinc-750"
            >
              В кошелёк
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default function FormContent() {
  return (
    <Suspense fallback={
      <div className="w-screen h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 rounded-full animate-spin border-4 border-solid border-purple-500 border-t-transparent" />
      </div>
    }>
      <FormContentInner />
    </Suspense>
  );
}
