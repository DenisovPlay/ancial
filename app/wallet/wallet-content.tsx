'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';

import { useAuth } from '../context/AuthContext';
import { AncialAPI, type WalletOverview, type WalletAccount, type WalletGateway, type WalletTopupOrder, type WalletTransaction } from '../lib/api-v2';
import Modal from '../components/modal';
import WalletLogo from './wallet-logo';
import { TransactionItem, TransactionDetailsModal } from './components/transaction-item';


const animationStyles = `
  .checkmark-circle {
      stroke-dasharray: 166;
      stroke-dashoffset: 166;
      animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
  }
  .checkmark-check {
      stroke-dasharray: 48;
      stroke-dashoffset: 48;
      animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards;
  }
  .crossmark-circle {
      stroke-dasharray: 166;
      stroke-dashoffset: 166;
      animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
  }
  .crossmark-cross {
      stroke-dasharray: 56;
      stroke-dashoffset: 56;
      animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards;
  }
  @keyframes stroke {
      100% {
          stroke-dashoffset: 0;
      }
  }
  .checkmark, .crossmark {
      animation: scaleIn 0.3s ease-in-out;
  }
  @keyframes scaleIn {
      0% {
          transform: scale(0);
      }
      100% {
          transform: scale(1);
      }
  }
`;

function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function buildPayUrl(orderHash: string) {
  const configuredBase =
    process.env.NEXT_PUBLIC_PAY_BASE?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://ancial.ru/';

  return `${trimTrailingSlash(configuredBase)}/pay/${orderHash}`;
}

export default function WalletContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, isAuthenticated, isLoading: authLoading, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [gateways, setGateways] = useState<WalletGateway[]>([]);
  const [topupOrders, setTopupOrders] = useState<WalletTopupOrder[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  // Modals state
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [isSendMoneyModalOpen, setIsSendMoneyModalOpen] = useState(false);
  const [isCreateTopupModalOpen, setIsCreateTopupModalOpen] = useState(false);
  const [isUserProfModalOpen, setIsUserProfModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isTransactionDetailsModalOpen, setIsTransactionDetailsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null);

  // Products modal sub-views
  const [productsView, setProductsView] = useState<'list' | 'confirm_delete' | 'create'>('list');
  const [accountToDelete, setAccountToDelete] = useState<WalletAccount | null>(null);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  // Form states - Create Account
  const [createAccountTitle, setCreateAccountTitle] = useState(lang?.account || 'Счёт');
  const [createAccountLoading, setCreateAccountLoading] = useState(false);
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);

  // Form states - Send Money Multi-step
  const [sendStep, setSendStep] = useState<'select' | 'sda' | 'stf' | 'sdb' | 'success' | 'error'>('select');
  const [sendSenderId, setSendSenderId] = useState<number>(0);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // SDA (Send to Different Account) State
  const [sdaToAccountId, setSdaToAccountId] = useState<number>(0);
  const [sdaAmount, setSdaAmount] = useState('');

  // STF (Send to Friend) State
  const [stfFriendUsername, setStfFriendUsername] = useState('');
  const [stfAmount, setStfAmount] = useState('');
  const [stfComment, setStfComment] = useState('');
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState<string | null>(null);

  // SDB (Send by Details) State
  const [sdbDetailType, setSdbDetailType] = useState<'email' | 'phone' | 'login'>('email');
  const [sdbEmail, setSdbEmail] = useState('');
  const [sdbPhone, setSdbPhone] = useState('');
  const [sdbLogin, setSdbLogin] = useState('');
  const [sdbAmount, setSdbAmount] = useState('');
  const [sdbComment, setSdbComment] = useState('');

  // Success details populated on success
  const [successDetails, setSuccessDetails] = useState<{
    receiver: string;
    sender: string;
    comment: string;
    amount: number;
    fees: number;
    feePercent: number;
    total: number;
  } | null>(null);

  // Form states - Create Topup
  const [topupAccountId, setTopupAccountId] = useState<number>(0);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupError, setTopupError] = useState<string | null>(null);

  // Form states - Request / Receive Money (User Profile)
  const [receiveAccountId, setReceiveAccountId] = useState<number>(0);
  const [receiveQrUrl, setReceiveQrUrl] = useState<string | null>(null);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);

  // Selected payment gateway for withdrawal warning
  const [selectedGateway, setSelectedGateway] = useState<WalletGateway | null>(null);
  const [withdrawAccountId, setWithdrawAccountId] = useState<number>(0);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDetails, setWithdrawDetails] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  // Dynamic gateway form states from server (/wallet/GetGateWayForm.php)
  const [gatewayFormLoading, setGatewayFormLoading] = useState(false);
  const [gatewayFormError, setGatewayFormError] = useState<string | null>(null);
  const [gatewayConfig, setGatewayConfig] = useState<any | null>(null);
  const [dynamicFieldsData, setDynamicFieldsData] = useState<Record<string, string>>({});

  const strings = useMemo(() => {
    return {
      withdraw: lang?.withdraw || 'Вывести',
      send: lang?.send || 'Перевести',
      receive: lang?.receive || 'Запросить',
      deposit: lang?.deposit || 'Пополнить',
      active: lang?.active || 'Активен',
      payments: lang?.payments || 'Платежи',
      all: lang?.all || 'Все',
      history: lang?.history || 'История',
      system: lang?.system || 'Система',
      cancel: lang?.cancel || 'Отменить'
    };
  }, [lang]);

  const hasAccounts = accounts.length > 0;
  const ownedAccountIds = useMemo(() => new Set(accounts.map((account) => account.id)), [accounts]);

  // General data fetcher
  const fetchWallet = async (showLoading = false) => {
    if (showLoading && accounts.length === 0) setLoading(true);
    try {
      const overview = await AncialAPI.getWalletOverview();
      const loadedAccounts = overview.accounts || [];
      setAccounts(loadedAccounts);
      setGateways(overview.gateways || []);
      setTopupOrders(overview.topupOrders || []);
      setTransactions(overview.transactions || []);

      // Pre-select accounts
      if (loadedAccounts.length > 0) {
        setSendSenderId((prev) => (prev && loadedAccounts.some(a => a.id === prev) ? prev : loadedAccounts[0].id));
        setTopupAccountId((prev) => (prev && loadedAccounts.some(a => a.id === prev) ? prev : loadedAccounts[0].id));
        setReceiveAccountId((prev) => (prev && loadedAccounts.some(a => a.id === prev) ? prev : loadedAccounts[0].id));
      }
      setError(null);
      localStorage.setItem('wallet_overview_cache', JSON.stringify(overview));
    } catch (err: any) {
      if (accounts.length === 0) {
        setError(err.message || (lang?.walletloaderror || 'Ошибка загрузки кошелька'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setLoading(false);
      setError('Auth required');
      return;
    }

    const cached = localStorage.getItem('wallet_overview_cache');
    let hasCachedData = false;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.accounts)) {
          const loadedAccounts = parsed.accounts || [];
          setAccounts(loadedAccounts);
          setGateways(parsed.gateways || []);
          setTopupOrders(parsed.topupOrders || []);
          setTransactions(parsed.transactions || []);

          if (loadedAccounts.length > 0) {
            setSendSenderId(loadedAccounts[0].id);
            setTopupAccountId(loadedAccounts[0].id);
            setReceiveAccountId(loadedAccounts[0].id);
          }
          hasCachedData = true;
          setLoading(false);
        }
      } catch (e) {
        console.error('Failed to parse wallet cache', e);
      }
    }

    fetchWallet(!hasCachedData);
  }, [authLoading, isAuthenticated]);

  // Reset transfer modal state when opened/closed
  useEffect(() => {
    if (!isSendMoneyModalOpen) {
      setSendStep('select');
      setSdaAmount('');
      setStfAmount('');
      setStfComment('');
      setStfFriendUsername('');
      setSdbEmail('');
      setSdbPhone('');
      setSdbLogin('');
      setSdbAmount('');
      setSdbComment('');
      setSendError(null);
      setSuccessDetails(null);
    }
  }, [isSendMoneyModalOpen]);

  // Reset products modal state when opened/closed
  useEffect(() => {
    if (!isProductsModalOpen) {
      setProductsView('list');
      setAccountToDelete(null);
      setDeleteAccountError(null);
      setCreateAccountTitle(lang?.account || 'Счёт');
      setCreateAccountError(null);
    }
  }, [isProductsModalOpen]);

  // Open send modal from QR scanner (?action=send&login=...)
  useEffect(() => {
    const action = searchParams.get('action');
    const login = searchParams.get('login');
    if (action === 'send') {
      setSendStep('sdb');
      setSdbDetailType('login');
      if (login) setSdbLogin(login);
      setIsSendMoneyModalOpen(true);
      // Clean URL without navigating away
      const cleanUrl = window.location.pathname;
      window.history.replaceState(null, '', cleanUrl);
    }
  }, [searchParams]);

  // Load friends list for STF step
  const loadFriends = async () => {
    setFriendsLoading(true);
    setFriendsError(null);
    try {
      const res: any = await AncialAPI.socialAction('friends');
      if (res && res.friends) {
        // Friend status 1 is confirmed friends
        const activeFriends = res.friends.filter((f: any) => f.status === 1);
        setFriendsList(activeFriends);
        if (activeFriends.length > 0) {
          setStfFriendUsername(activeFriends[0].username);
        }
      }
    } catch (err: any) {
      setFriendsError(err.message || (lang?.friendsloaderror || 'Не удалось загрузить список друзей'));
    } finally {
      setFriendsLoading(false);
    }
  };

  useEffect(() => {
    if (sendStep === 'stf') {
      loadFriends();
    }
  }, [sendStep]);

  // Handle Account Deletion
  const handleDeleteAccountClick = (e: React.MouseEvent, acc: WalletAccount) => {
    e.stopPropagation();
    setAccountToDelete(acc);
    setProductsView('confirm_delete');
  };

  const handleConfirmDeleteAccount = async () => {
    if (!accountToDelete) return;
    setDeleteAccountLoading(true);
    setDeleteAccountError(null);
    try {
      await AncialAPI.deleteAccount(accountToDelete.id);
      setAccountToDelete(null);
      setProductsView('list');
      await fetchWallet();
    } catch (err: any) {
      setDeleteAccountError(err.message || (lang?.failedtocloseaccount || 'Не удалось закрыть счёт'));
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  // Create Account handler
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createAccountTitle.trim()) {
      setCreateAccountError(lang?.enteraccountname || 'Введите название счёта');
      return;
    }
    setCreateAccountLoading(true);
    setCreateAccountError(null);
    try {
      await AncialAPI.createAccount(createAccountTitle);
      setCreateAccountTitle(lang?.account || 'Счёт');
      setProductsView('list');
      await fetchWallet();
    } catch (err: any) {
      setCreateAccountError(err.message || (lang?.failedtocreateaccount || 'Не удалось создать счёт'));
    } finally {
      setCreateAccountLoading(false);
    }
  };

  // Commission Calculations
  const getCommissionInfo = (amountStr: string) => {
    const amountVal = parseFloat(amountStr);
    if (isNaN(amountVal) || amountVal <= 0) {
      return { fees: 0, total: 0, feePercent: 0 };
    }
    const feePercent = amountVal >= 100000 ? 0.1 : (amountVal >= 1000 ? 1 : 0);
    const fees = amountVal >= 1000 ? Math.round(amountVal * (amountVal >= 100000 ? 0.001 : 0.01)) : 0;
    const total = amountVal - fees;
    return { fees, total, feePercent };
  };

  const handleSendSubmit = async (payload: any, amountStr: string) => {
    setSendLoading(true);
    setSendError(null);
    try {
      const res = await AncialAPI.sendMoney(payload);

      const { fees, total, feePercent } = getCommissionInfo(amountStr);
      setSuccessDetails({
        receiver: payload.receiver_id
          ? `${lang?.account_num || 'Счёт №'}${payload.receiver_id}`
          : `@${payload.receiver_login || payload.receiver_email || payload.receiver_phone}`,
        sender: String(payload.sender_id),
        comment: payload.comment || (lang?.nocomment || 'Без комментария'),
        amount: parseFloat(amountStr),
        fees,
        feePercent,
        total
      });
      setSendStep('success');
      await fetchWallet();
    } catch (err: any) {
      setSendError(err.message || (lang?.transfererror || 'Ошибка перевода средств'));
      setSendStep('error');
    } finally {
      setSendLoading(false);
    }
  };

  // Submit handlers for specific transfer types
  const handleSdaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendSenderId || !sdaToAccountId || sendSenderId === sdaToAccountId) {
      setSendError(lang?.selectcorrectreceiver || 'Выберите корректный счёт получателя');
      return;
    }
    const amt = parseFloat(sdaAmount);
    if (isNaN(amt) || amt <= 0) {
      setSendError(lang?.enteramount || 'Укажите корректную сумму');
      return;
    }
    const payload = {
      sender_id: sendSenderId,
      amount: amt,
      comment: lang?.transferbetweenaccounts || 'Перевод между счетами',
      receiver_id: sdaToAccountId
    };
    handleSendSubmit(payload, sdaAmount);
  };

  const handleStfSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stfFriendUsername) {
      setSendError(lang?.selectfriend || 'Выберите друга');
      return;
    }
    const amt = parseFloat(stfAmount);
    if (isNaN(amt) || amt <= 0) {
      setSendError(lang?.enteramount || 'Укажите корректную сумму');
      return;
    }
    const payload = {
      sender_id: sendSenderId,
      amount: amt,
      comment: stfComment.trim() || `${lang?.transfertofriend || 'Перевод другу @'}${stfFriendUsername}`,
      receiver_login: stfFriendUsername
    };
    handleSendSubmit(payload, stfAmount);
  };

  const handleSdbSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(sdbAmount);
    if (isNaN(amt) || amt <= 0) {
      setSendError(lang?.enteramount || 'Укажите корректную сумму');
      return;
    }

    const payload: any = {
      sender_id: sendSenderId,
      amount: amt,
      comment: sdbComment.trim() || (lang?.transferbydetails || 'Перевод по реквизитам')
    };

    if (sdbDetailType === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sdbEmail.trim())) {
        setSendError(lang?.invalidemail || 'Некорректный формат email');
        return;
      }
      payload.receiver_email = sdbEmail.trim();
    } else if (sdbDetailType === 'phone') {
      if (sdbPhone.trim().length < 10) {
        setSendError(lang?.invalidphone || 'Укажите корректный телефон (от 10 символов)');
        return;
      }
      payload.receiver_phone = sdbPhone.trim();
    } else {
      if (sdbLogin.trim().length < 3) {
        setSendError(lang?.invalidnickname || 'Укажите корректный никнейм (от 3 символов)');
        return;
      }
      payload.receiver_login = sdbLogin.trim();
    }

    handleSendSubmit(payload, sdbAmount);
  };

  // Create Topup handler
  const handleCreateTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupAccountId) {
      setTopupError(lang?.selecttopupaccount || 'Выберите счёт для пополнения');
      return;
    }
    const amountVal = parseFloat(topupAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setTopupError(lang?.enteramount || 'Укажите корректную сумму');
      return;
    }
    if (amountVal > 15000) {
      setTopupError(`${lang?.max_topup_amount || 'Максимальная сумма пополнения за один раз — 15 000 '}<svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg>`);
      return;
    }

    setTopupLoading(true);
    setTopupError(null);

    try {
      const res = await AncialAPI.createTopup(amountVal, topupAccountId);
      setTopupAmount('');
      setIsCreateTopupModalOpen(false);

      if (res.order_hash) {
        window.location.href = buildPayUrl(res.order_hash);
      } else if (res.payment_url) {
        window.location.href = res.payment_url;
      }

      await fetchWallet();
    } catch (err: any) {
      setTopupError(err.message || (lang?.topupcreateerror || 'Ошибка создания пополнения'));
    } finally {
      setTopupLoading(false);
    }
  };

  // Cancel Topup handler
  const handleCancelTopup = async (orderHash: string) => {
    try {
      await AncialAPI.cancelTopup(orderHash);
      await fetchWallet();
    } catch (err: any) {
      alert(err.message || (lang?.failedtocanceltopup || 'Не удалось отменить пополнение'));
    }
  };

  // Fetch QR Code logic
  const loadQRCode = async (accountId: number) => {
    if (!accountId) return;
    setReceiveLoading(true);
    setReceiveError(null);
    setReceiveQrUrl(null);
    try {
      const res = await AncialAPI.generateQRCode(accountId);
      setReceiveQrUrl(res.qr_url);
    } catch (err: any) {
      setReceiveError(err.message || (lang?.failedtogenerateqr || 'Не удалось сгенерировать QR-код'));
    } finally {
      setReceiveLoading(false);
    }
  };

  // Trigger QR Code load when selection changes or modal opens
  useEffect(() => {
    if (isUserProfModalOpen && receiveAccountId) {
      loadQRCode(receiveAccountId);
    }
  }, [isUserProfModalOpen, receiveAccountId]);

  // Open withdrawal dialog for clicked gateway
  const handleGatewayClick = async (gw: WalletGateway) => {
    setSelectedGateway(gw);
    setWithdrawAmount('');
    setWithdrawDetails('');
    setWithdrawError(null);
    setWithdrawSuccess(null);
    setGatewayConfig(null);
    setGatewayFormError(null);
    setDynamicFieldsData({});
    if (accounts.length > 0) {
      setWithdrawAccountId(accounts[0].id);
    }
    setIsWithdrawModalOpen(true);
    setGatewayFormLoading(true);

    try {
      const res = await AncialAPI.getGatewayForm(gw.id);
      const targetGw = res?.gateway;
      if (targetGw) {
        let fieldsObj = targetGw.withdrawal_fields;
        if (typeof fieldsObj === 'string') {
          try { fieldsObj = JSON.parse(fieldsObj); } catch (e) { }
        }
        targetGw.withdrawal_fields = fieldsObj;
        setGatewayConfig(targetGw);
      } else {
        setGatewayFormError(lang?.failedtoloadwithdrawform || 'Не удалось загрузить форму вывода');
      }
    } catch (err: any) {
      setGatewayFormError(err.message || (lang?.withdrawformloaderror || 'Ошибка загрузки формы вывода с сервера'));
    } finally {
      setGatewayFormLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGateway) return;
    const numAmount = parseFloat(withdrawAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setWithdrawError(lang?.enterwithdrawamount || 'Укажите корректную сумму вывода');
      return;
    }

    let finalDetails = withdrawDetails.trim();
    const serverFields = gatewayConfig?.withdrawal_fields?.fields;
    if (Array.isArray(serverFields) && serverFields.length > 0) {
      const parts: string[] = [];
      for (const f of serverFields) {
        const val = dynamicFieldsData[f.key] || '';
        if (f.required && !val.trim()) {
          setWithdrawError(`${lang?.fillfield || 'Заполните поле '}"${f.label || f.key}"`);
          return;
        }
        parts.push(`${f.key || f.label}: ${val}`);
      }
      finalDetails = parts.join('; ');
    }

    if (!finalDetails) {
      setWithdrawError(lang?.enterreceiverdetails || 'Укажите реквизиты получателя');
      return;
    }
    const selectedAcc = accounts.find(a => a.id === withdrawAccountId);
    if (selectedAcc && selectedAcc.balance < numAmount) {
      setWithdrawError(lang?.insufficientfunds || 'Недостаточно средств на выбранном счёте');
      return;
    }

    setWithdrawLoading(true);
    setWithdrawError(null);
    setWithdrawSuccess(null);

    try {
      const res = await AncialAPI.createWithdrawal({
        account_id: withdrawAccountId,
        gateway_id: selectedGateway.id,
        amount: numAmount,
        details: finalDetails
      });

      setWithdrawSuccess(res.message || (lang?.withdrawrequestcreated || 'Заявка на вывод средств успешно создана!'));
      fetchWallet(false);
    } catch (err: any) {
      setWithdrawError(err.message || (lang?.withdrawcreateerror || 'Ошибка при создании заявки на вывод'));
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleTopage = (path: string) => {
    router.push(path);
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="flex flex-col w-full items-center justify-start min-h-screen pb-3 lg:pb-6 gap-3 bg-gradient-to-b from-lime-800/50 lg:from-black to-black via-black text-white">
        <div className="w-full max-w-screen-2xl h-14 flex items-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-[99]">
          <WalletLogo className="shrink-0 h-6 sm:h-8" />
          <div className="flex flex-grow" />
          <div className="hidden lg:flex items-center gap-3">
            <div className="w-28 h-9 rounded-3xl bg-zinc-800/70 border border-zinc-600/30 animate-pulse" />
            <div className="w-28 h-9 rounded-3xl bg-zinc-800/70 border border-zinc-600/30 animate-pulse" />
            <div className="w-28 h-9 rounded-3xl bg-zinc-800/70 border border-zinc-600/30 animate-pulse" />
          </div>
        </div>

        {/* Accounts skeleton */}
        <div className="flex flex-col justify-center gap-3 w-full max-w-screen-2xl duration-300 -mb-3 lg:mb-0">
          <div className="flex flex-nowrap gap-3 items-center w-full overflow-x-auto viewport px-3 lg:-mx-3 -my-3 py-3 duration-300">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shrink-0 p-3 flex flex-col border border-zinc-600/30 bg-zinc-800/70 rounded-3xl w-48 lg:w-64 h-24 lg:h-32 animate-pulse">
                <div className="w-24 lg:w-32 h-6 lg:h-8 bg-zinc-700/60 rounded-xl mb-2" />
                <div className="w-16 lg:w-24 h-4 bg-zinc-700/60 rounded-lg" />
                <div className="flex-grow" />
                <div className="flex items-center justify-between">
                  <div className="w-8 h-4 bg-zinc-700/60 rounded-full" />
                  <div className="w-12 h-4 bg-zinc-700/60 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gateways skeleton */}
        <div className="flex flex-col justify-center gap-3 w-full max-w-screen-2xl shrink-0">
          <div className="h-8 w-32 bg-zinc-800/70 rounded-xl animate-pulse mx-3 lg:mx-0" />
          <div className="flex flex-nowrap gap-3 items-center w-full overflow-x-auto viewport px-3 lg:-mx-3 -my-3 py-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border border-zinc-600/30 shrink-0 p-1.5 flex items-center gap-1.5 bg-zinc-800/70 rounded-3xl w-48 animate-pulse">
                <div className="h-14 w-14 lg:h-16 lg:w-16 rounded-3xl bg-zinc-700/60 shrink-0" />
                <div className="flex flex-col gap-2 flex-grow">
                  <div className="h-4 w-20 bg-zinc-700/60 rounded" />
                  <div className="h-3 w-16 bg-zinc-700/60 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* History skeleton */}
        <div className="flex flex-col justify-center gap-3 w-full max-w-screen-2xl shrink-0">
          <div className="h-8 w-32 bg-zinc-800/70 rounded-xl animate-pulse mx-3 lg:mx-0" />
          <div className="flex flex-col w-full border border-zinc-600/30 bg-zinc-800/50 rounded-3xl overflow-hidden p-3 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between w-full animate-pulse py-1">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 lg:h-12 lg:w-12 bg-zinc-700/60 rounded-full shrink-0" />
                  <div className="flex flex-col gap-1.5">
                    <div className="h-4 w-32 lg:w-48 bg-zinc-700/60 rounded" />
                    <div className="h-3 w-20 bg-zinc-700/60 rounded" />
                  </div>
                </div>
                <div className="h-5 w-16 bg-zinc-700/60 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isNoAccountsError = error?.includes('У вас нет активных счетов') || error?.includes(lang?.noactiveaccounts || 'У вас нет активных счетов');
  if (error && !isNoAccountsError) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-black text-white p-4">
        <p className="text-xl text-red-500 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-purple-600 rounded-3xl active:scale-95 duration-300">
          {lang?.retry || 'Повторить'}
        </button>
      </div>
    );
  }

  const getTransactionKind = (transaction: WalletTransaction): 'internal' | 'in' | 'out' => {
    if (transaction.is_internal) return 'internal';

    const senderOwned = ownedAccountIds.has(transaction.sender);
    const receiverOwned = ownedAccountIds.has(transaction.receiver);

    if (senderOwned && receiverOwned) return 'internal';
    if (receiverOwned) return 'in';
    if (senderOwned) return 'out';

    if (transaction.direction === 'in' || transaction.direction === 'out') return transaction.direction;
    if (transaction.type === 1) return 'in';
    return 'out';
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />

      {!hasAccounts ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-black text-white">
          <div className="flex-grow max-w-md flex flex-col items-start justify-end p-3 pb-0 w-full">
            <WalletLogo className="shrink-0 h-10 mb-3 hover:opacity-80 duration-300 cursor-pointer active:scale-95" />
            <div className="flex-grow"></div>
            <span className="text-3xl font-bold">{lang?.startnow || 'Начните сейчас!'}</span>
            <span className="text-xl text-zinc-300 mt-2">{lang?.openfreeaccount || 'Откройте бесплатный счёт, переводите и получайте средства по всему миру.'}</span>
            <div className="w-full mt-4 flex justify-center absolute bottom-0 right-0">
              <img src="/img/backgrounds/wallet-intro.webp" alt="Wallet Intro" className="w-full max-h-140 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 w-full max-w-md fixed bottom-20 lg:bottom-3 px-3">
            <button onClick={() => setIsProductsModalOpen(true)} className="flex items-center justify-center gap-3 px-4 py-2 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-3xl w-full shadow cursor-pointer border border-zinc-600/30">
              {lang?.opennewaccount || 'Открыть новый счёт'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col w-full items-center justify-start min-h-screen pb-3 lg:pb-6 gap-3 bg-gradient-to-b from-lime-800/50 lg:from-black to-black via-black text-white">

          <div className="w-full max-w-screen-2xl h-14 flex items-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-[99]">
            <WalletLogo className="shrink-0 h-6 sm:h-8 hover:opacity-80 duration-300 cursor-pointer active:scale-95" />
            <div className="flex flex-grow"></div>
            <div className="flex-nowrap items-center gap-3 overflow-x-auto viewport px-3 lg:px-0 duration-300 hidden lg:flex">
              {/* QUICK_ACTIONS Desktop */}
              <button onClick={() => setIsSendMoneyModalOpen(true)} className="border border-zinc-600/30 shrink-0 flex items-center gap-3 text-zinc-300 bg-zinc-900/20 hover:bg-zinc-700 hover:text-white shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95 backdrop-blur-md backdrop-saturate-200">
                <svg className="fill-white w-5 h-5 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-send"></use></svg> {strings.send}
              </button>
              <button onClick={() => setIsUserProfModalOpen(true)} className="border border-zinc-600/30 shrink-0 flex items-center gap-3 text-zinc-300 bg-zinc-900/20 hover:bg-zinc-700 hover:text-white shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95 backdrop-blur-md backdrop-saturate-200">
                <svg className="fill-white w-5 h-5 inline rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-send"></use></svg> {strings.receive}
              </button>
              <button onClick={() => setIsCreateTopupModalOpen(true)} className="border border-zinc-600/30 shrink-0 flex items-center gap-3 text-zinc-300 bg-zinc-900/20 hover:bg-zinc-700 hover:text-white shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95 backdrop-blur-md backdrop-saturate-200">
                <svg className="fill-white w-5 h-5 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-topup"></use></svg> {strings.deposit}
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-3 w-full max-w-screen-2xl duration-300 -mb-3 lg:mb-0">
            <div className="flex flex-nowrap gap-3 items-center w-full overflow-x-auto viewport px-3 lg:-mx-3 -my-3 py-3 duration-300">

              {/* Mobile quick actions (hidden on lg) */}
              <div className="flex flex-col gap-3 h-24 lg:hidden sticky left-0 z-[5]">
                <button onClick={() => handleTopage('/wallet/qr')} className="lg:hidden cursor-pointer border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 shrink-0 flex items-center justify-center text-zinc-300 bg-zinc-900/20 hover:bg-zinc-700 hover:text-white hover:shadow active:scale-95 duration-300 rounded-3xl" style={{ width: 42, height: 42 }}>
                  <svg className="fill-white w-7 h-7 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-qr-scanner"></use></svg>
                </button>
                <button onClick={() => { }} className="lg:hidden cursor-pointer border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 shrink-0 flex items-center justify-center text-zinc-300 bg-zinc-900/20 hover:bg-zinc-700 hover:text-white hover:shadow active:scale-95 duration-300 rounded-3xl" style={{ width: 42, height: 42 }} aria-label="Blockchain explorer">
                  <svg className="fill-white w-7 h-7 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-poll"></use></svg>
                </button>
              </div>

              {/* ACCOUNT_ITEMS */}
              {accounts.map((acc) => (
                <div key={acc.id} onClick={() => handleTopage(`/wallet/account/${acc.id}`)} className="shrink-0 p-3 flex flex-col border border-zinc-600/30 hover:bg-zinc-700 bg-zinc-800/70 rounded-3xl shadow-lg hover:scale-105 active:scale-95 duration-300 cursor-pointer w-48 lg:w-64 h-24 lg:h-32">
                  <span className="lg:font-black text-white text-xl lg:text-3xl">
                    {acc.balance}{' '}
                    <svg className="w-6 h-6 lg:w-8 lg:h-8 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg>
                  </span>
                  <span className="text-zinc-200 text-sm lg:text-lg">{acc.name}</span>
                  <div className="flex-grow"></div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 text-white bg-zinc-800/80 border border-zinc-600/30 shadow rounded-full text-xs">{acc.id}</span>
                    <div className="flex-grow"></div>
                    <span className="px-1.5 py-0.5 bg-lime-500/25 text-lime-500 border border-zinc-600/30 rounded-full text-xs">{strings.active}</span>
                  </div>
                </div>
              ))}

              {/* CREATE_ACCOUNT */}
              <div onClick={() => setIsProductsModalOpen(true)} className="shrink-0 w-24 lg:w-32 h-24 lg:h-32 flex items-center justify-center cursor-pointer duration-300 active:scale-95 hover:scale-105 border-2 border-dashed border-zinc-500/80 lg:border-zinc-600/80 text-zinc-400/80 lg:text-zinc-500/80 rounded-3xl">
                <span className="font-black text-4xl">+</span>
              </div>
            </div>
          </div>

          {/* QUICK_ACTIONS Mobile */}
          <div className="sticky pt-3 flex flex-nowrap items-center gap-3 overflow-x-auto viewport px-3 w-full max-w-screen-2xl duration-300 lg:hidden shrink-0 z-[99]" style={{ top: '48px' }}>
            <button onClick={() => setIsSendMoneyModalOpen(true)} className="border border-zinc-600/30 shrink-0 flex items-center gap-3 text-zinc-300 bg-zinc-900/20 hover:bg-zinc-700 hover:text-white shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95 backdrop-blur-md backdrop-saturate-200">
              <svg className="fill-white w-5 h-5 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-send"></use></svg> {strings.send}
            </button>
            <button onClick={() => setIsUserProfModalOpen(true)} className="border border-zinc-600/30 shrink-0 flex items-center gap-3 text-zinc-300 bg-zinc-900/20 hover:bg-zinc-700 hover:text-white shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95 backdrop-blur-md backdrop-saturate-200">
              <svg className="fill-white w-5 h-5 inline rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-send"></use></svg> {strings.receive}
            </button>
            <button onClick={() => setIsCreateTopupModalOpen(true)} className="border border-zinc-600/30 shrink-0 flex items-center gap-3 text-zinc-300 bg-zinc-900/20 hover:bg-zinc-700 hover:text-white shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95 backdrop-blur-md backdrop-saturate-200">
              <svg className="fill-white w-5 h-5 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-topup"></use></svg> {strings.deposit}
            </button>
          </div>

          {/* SERVICES */}
          <div className="flex flex-col justify-center gap-3 w-full max-w-screen-2xl duration-300 shrink-0">
            <div className="flex gap-3 items-center w-full duration-300">
              <span className="text-2xl lg:text-3xl font-bold text-white flex-grow shrink-0 px-3 lg:px-0 duration-300">{strings.payments}</span>
              <div className="hidden lg:flex flex-nowrap items-center gap-3 overflow-x-auto viewport px-3 lg:px-0 duration-300">
                <button className="shrink-0 flex items-center gap-3 text-zinc-300 bg-zinc-900/20 border border-zinc-600/30 hover:bg-zinc-700 hover:text-white shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95">
                  <svg className="fill-white w-5 h-5 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 18.484375 2.984375 A 1.50015 1.50015 0 0 0 17.439453 5.5605469 L 35.878906 24 L 17.439453 42.439453 A 1.50015 1.50015 0 1 0 19.560547 44.560547 L 39.060547 25.060547 A 1.50015 1.50015 0 0 0 39.060547 22.939453 L 19.560547 3.4394531 A 1.50015 1.50015 0 0 0 18.484375 2.984375 z"></path></svg> {strings.all}
                </button>
              </div>
            </div>
            <div className="flex flex-nowrap gap-3 items-center w-full overflow-x-auto viewport px-3 lg:-mx-3 -my-3 py-3 duration-300">
              {/* SERVICES_ITEMS */}
              {gateways.map((gateway) => {
                let gtcolor = 'zinc';
                if (gateway.name === 'YooMoney' || gateway.name === 'aaio') gtcolor = 'purple';
                if (gateway.name === 'NicePay' || gateway.name === 'Platima') gtcolor = 'emerald';
                if (gateway.name === 'CryptoCloud') gtcolor = 'blue';
                if (gateway.name === 'CodeePay') gtcolor = 'cyan';

                return (
                  <div key={gateway.id} onClick={() => handleGatewayClick(gateway)} className="border border-zinc-600/30 relative group shrink-0 p-1.5 flex items-center gap-1.5 justify-center bg-zinc-800/70 rounded-3xl shadow-lg hover:scale-105 active:scale-95 duration-300 cursor-pointer w-48">
                    <div className={`shadow-2xl group-hover:shadow-2xl h-14 w-14 lg:h-16 lg:w-16 p-1.5 rounded-3xl shrink-0 duration-300 flex items-center justify-center bg-${gtcolor}-500/25 group-hover:shadow-${gtcolor}-500/25`}>
                      <img alt={gateway.name} src={gateway.image} className="h-full w-full object-contain" />
                    </div>
                    <div className="flex flex-col justify-center flex-grow">
                      <span className="text-sm lg:text-base text-zinc-100">{gateway.name}</span>
                      <span className="text-xs text-zinc-400">{gateway.withdrawal_description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending topups */}
          {topupOrders.length > 0 && (
            <div className="flex flex-col justify-center gap-3 w-full max-w-screen-2xl duration-300 shrink-0">
              <div className="flex gap-3 items-center w-full duration-300">
                <span className="text-2xl lg:text-3xl font-bold text-white flex-grow shrink-0 px-3 lg:px-0 duration-300">{lang?.topups || 'Пополнения'}</span>
                <div className="hidden lg:flex flex-nowrap items-center gap-3 overflow-x-auto viewport px-3 lg:px-0 duration-300">
                  <button className="shrink-0 flex items-center gap-3 text-zinc-300 bg-zinc-900/20 border border-zinc-600/30 hover:bg-zinc-700 hover:text-white shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95">
                    <svg className="fill-white w-5 h-5 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 18.484375 2.984375 A 1.50015 1.50015 0 0 0 17.439453 5.5605469 L 35.878906 24 L 17.439453 42.439453 A 1.50015 1.50015 0 1 0 19.560547 44.560547 L 39.060547 25.060547 A 1.50015 1.50015 0 0 0 39.060547 22.939453 L 19.560547 3.4394531 A 1.50015 1.50015 0 0 0 18.484375 2.984375 z"></path></svg> {strings.all}
                  </button>
                </div>
              </div>
              <div className="flex flex-col bg-zinc-800/50 lg:bg-zinc-800/70 border border-zinc-600/30 rounded-3xl duration-300 overflow-hidden">
                {topupOrders.map((order) => {
                  let statuscolor = ['fill-zinc-300', 'bg-zinc-500/25'];
                  if (order.status === 'created' || order.status === 'pending') statuscolor = ['fill-amber-500', 'bg-amber-500/25'];
                  if (order.status === 'paid' || order.status === 'finished') statuscolor = ['fill-lime-500', 'bg-lime-500/25'];
                  if (order.status === 'canceled') statuscolor = ['fill-red-500', 'bg-red-500/25'];

                  return (
                    <div key={order.id} className="hover:bg-zinc-700/50 relative group shrink-0 flex items-center gap-3 justify-between active:rounded-3xl active:scale-95 duration-300 cursor-pointer w-full">
                      <div className="pl-3 py-3 flex items-center gap-3">
                        <div onClick={() => window.location.href = buildPayUrl(order.order_hash)} className={`border border-zinc-600/30 shadow-2xl h-10 w-10 lg:h-12 lg:w-12 p-1.5 ${statuscolor[1]} rounded-3xl shrink-0 duration-300 flex items-center justify-center`}>
                          <svg className={`h-6 w-6 lg:w-8 lg:h-8 inline ${statuscolor[0]}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                            <path d="M 24 4 C 18.494917 4 14 8.494921 14 14 C 14 19.505079 18.494917 24 24 24 C 29.505083 24 34 19.505079 34 14 C 34 8.494921 29.505083 4 24 4 z M 24 7 C 27.883764 7 31 10.116238 31 14 C 31 17.883762 27.883764 21 24 21 C 20.116236 21 17 17.883762 17 14 C 17 10.116238 20.116236 7 24 7 z M 22.75 10 C 22.273,10,21.862531,10.336688,21.769531,10.804688 L21.269531,13.304688 C21.210531,13.598688,21.286562,13.903766,21.476562,14.134766 C21.666562,14.366766,21.95,14.5,22.25,14.5 L24.25,14.5 C24.664,14.5,25,14.836,25,15.25 C25,15.765,24.481,16,24,16 C23.115,16,22.583922,15.685156,22.544922,15.660156 C22.085922,15.363156,21.472969,15.489313,21.167969,15.945312 C20.861969,16.405313,20.986313,17.026031,21.445312,17.332031 C21.548313,17.400031,22.491,18,24,18 C25.71,18,27,16.818,27,15.25 C27,13.733,25.767,12.5,24.25,12.5 L23.470703,12.5 L23.570312,12 L25.5,12 C26.052,12,26.5,11.552,26.5,11 C26.5,10.448,26.052,10,25.5,10 z M 2.5,13 A 1.50015 1.50015 0 1 0 2.5,16 L5.5,16 C5.7950452,16,6,16.204955,6,16.5 L6,38.5 C6,41.519774,8.4802259,44,11.5,44 L36.5,44 C39.519774,44,42,41.519774,42,38.5 L42,16.5 C42,16.204955,42.204955,16,42.5,16 L45,16 A 1.50015 1.50015 0 1 0 45,13 L42.5,13 C40.585045,13,39,14.585045,39,16.5 L39,38.5 C39,39.898226,37.898226,41,36.5,41 L11.5,41 C10.101774,41,9,39.898226,9,38.5 L9,16.5 C9,14.585045,7.4149548,13,5.5,13 L2.5,13 z M 18.402344,27.980469 A 1.50015 1.50015 0 0 0 17.394531,30.513672 L22.894531,36.513672 A 1.50015 1.50015 0 0 0 25.105469,36.513672 L30.605469,30.513672 A 1.50015 1.50015 0 0 0 29.554688,27.984375 A 1.50015 1.50015 0 0 0 28.394531,28.486328 L24,32.986328 L20.402344,28.486328 A 1.50015 1.50015 0 0 0 18.402344,27.980469 z"></path>
                          </svg>
                        </div>
                        <div className="flex flex-col justify-center">
                          <span onClick={() => window.location.href = buildPayUrl(order.order_hash)} className="text-sm lg:text-base text-zinc-100">[#{order.id}] {lang?.topup_of_account || 'Пополнение счёта №'}{order.label}</span>
                          <button onClick={(e) => { e.stopPropagation(); handleCancelTopup(order.order_hash); }} className="shrink-0 text-sm mt-1.5 w-fit flex items-center gap-1.5 text-red-500 bg-red-500/25 hover:bg-red-700/40 shadow rounded-3xl cursor-pointer py-0.5 px-1 duration-300 active:scale-95 backdrop-blur-lg border border-zinc-600/30">
                            <span>{strings.cancel}</span>
                          </button>
                        </div>
                      </div>
                      <div onClick={() => window.location.href = buildPayUrl(order.order_hash)} className="flex flex-col items-end shrink-0 py-3 pr-3">
                        <span className="font-semibold text-zinc-300">{order.amount}<svg className="w-4 h-4 inline fill-purple-500 -mt-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><use href="/icons.svg#IC-anci"></use></svg></span>
                        <span className="text-zinc-400 text-xs lg:text-sm max-w-20 md:max-w-64 text-right">{order.created_at}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* HISTORY */}
          <div className="flex flex-col justify-center gap-3 w-full max-w-screen-2xl duration-300 shrink-0">
            <div className="flex gap-3 items-center w-full duration-300">
              <span className="text-2xl lg:text-3xl font-bold text-white flex-grow shrink-0 px-3 lg:px-0 duration-300">{strings.history}</span>
              <div className="flex flex-nowrap items-center gap-3 overflow-x-auto viewport px-3 lg:px-0 duration-300">
                <button onClick={() => handleTopage('/wallet/history')} className="shrink-0 flex items-center gap-3 text-zinc-300 bg-zinc-900/20 border border-zinc-600/30 hover:bg-zinc-700 hover:text-white shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95">
                  <svg className="fill-white w-5 h-5 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 18.484375 2.984375 A 1.50015 1.50015 0 0 0 17.439453 5.5605469 L 35.878906 24 L 17.439453 42.439453 A 1.50015 1.50015 0 1 0 19.560547 44.560547 L 39.060547 25.060547 A 1.50015 1.50015 0 0 0 39.060547 22.939453 L 19.560547 3.4394531 A 1.50015 1.50015 0 0 0 18.484375 2.984375 z"></path></svg> <span>{lang?.all || 'Все'}</span>
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center w-full border border-zinc-600/30 bg-zinc-800/50 lg:bg-zinc-800/70 rounded-3xl overflow-hidden duration-300">
              {/* HISTORY_ITEMS */}
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
          </div>
        </div>
      )}

      {/* 1. MODAL: Products/Accounts (Мои счета) */}
      <Modal
        isOpen={isProductsModalOpen}
        onClose={() => setIsProductsModalOpen(false)}
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
                  onClick={() => { setIsProductsModalOpen(false); handleTopage('/wallet/merchant'); }}
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
            <div className="flex flex-col gap-3 px-3 pt-14 text-zinc-100">
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
            <form onSubmit={handleCreateAccount} className="flex flex-col gap-3 px-3 pt-14 text-zinc-100">
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

      {/* 2. MODAL: Send Money (Перевести) */}
      <Modal isOpen={isSendMoneyModalOpen} onClose={() => setIsSendMoneyModalOpen(false)} title={strings.send} width="sm">
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
                  strings.send
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
                  strings.send
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
                  className={`flex-1 py-2 text-center text-sm font-semibold rounded-full duration-300 ${sdbDetailType === 'email' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  {lang?.email || 'Email'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSdbDetailType('phone');
                    setSendError(null);
                  }}
                  className={`flex-1 py-2 text-center text-sm font-semibold rounded-full duration-300 ${sdbDetailType === 'phone' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  {lang?.phone || 'Телефон'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSdbDetailType('login');
                    setSendError(null);
                  }}
                  className={`flex-1 py-2 text-center text-sm font-semibold rounded-full duration-300 ${sdbDetailType === 'login' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
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
                  strings.send
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
                onClick={() => setIsSendMoneyModalOpen(false)}
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


      {/* 3. MODAL: Top Up (Пополнить) */}
      <Modal isOpen={isCreateTopupModalOpen} onClose={() => setIsCreateTopupModalOpen(false)} title={lang?.deposit || 'Пополнить'} width="sm">
        <form onSubmit={handleCreateTopup} className="flex flex-col gap-0.5 text-zinc-100">
          <div className="p-3 mb-2.5 border border-zinc-600/30 bg-amber-500/25 text-amber-500 rounded-3xl shadow flex flex-col w-full text-left">
            <span className="font-bold text-base">{lang?.attention || 'Внимание!'}</span>
            <span className="text-sm">{lang?.testing_mode || 'Функция находится на этапе тестирования. Если вы произвели платёж, но баланс не изменился, пожалуйста, свяжитесь с поддержкой.'}</span>
            <span className="text-xs">{lang?.contacts_hint || 'Контакты находятся в Настройки -> О Ancial -> Контакты'}</span>
          </div>

          <div className="flex flex-col w-full text-left">
            <span className="text-zinc-400 pl-4 z-20 -mt-1.5">{lang?.whichaccount || 'На какой счёт'}</span>
            <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
              <select
                value={topupAccountId}
                onChange={(e) => setTopupAccountId(Number(e.target.value))}
                className="rounded-full bg-zinc-800/60 w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {lang?.account || 'Счёт'} №{acc.id} ({acc.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col w-full text-left mt-3">
            <span className="text-zinc-400 pl-4 z-20 -mt-1.5">{lang?.t_ama || 'Сумма'}</span>
            <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
              <input
                type="number"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                placeholder="0"
                min="0"
                step="1"
                className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600 text-white"
              />
            </div>
          </div>

          {topupError && (
            <p className="text-red-500 text-sm font-semibold mt-2 pl-2">{topupError}</p>
          )}

          <button
            type="submit"
            id="TUP_send_btn"
            disabled={topupLoading || !topupAmount || parseFloat(topupAmount) <= 0}
            className={`mt-2.5 flex items-center justify-center gap-3 px-4 py-2 text-lg duration-300 rounded-3xl w-full shadow border border-zinc-600/30 ${(topupLoading || !topupAmount || parseFloat(topupAmount) <= 0)
              ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed opacity-50'
              : 'bg-purple-700 hover:bg-purple-600 text-zinc-100 active:scale-95 cursor-pointer'
              }`}
          >
            {topupLoading ? (
              <div className="w-6 h-6 rounded-full animate-spin border-2 border-solid border-white border-t-transparent" />
            ) : (
              lang?.topup_btn || 'Пополнить'
            )}
          </button>
          <span className="text-xs text-zinc-300 pt-3 text-left">{lang?.payment_notice || 'Платёж будет выполнен через Ancial Merchant. Совершая платёж, Вы принимаете условия Ancial Payments и Wallet.'}</span>
        </form>
      </Modal>

      {/* 4. MODAL: Request (Запросить QR) */}
      <Modal isOpen={isUserProfModalOpen} onClose={() => setIsUserProfModalOpen(false)} title={lang?.receive_trans || 'Запросить перевод'} width="sm">
        <div className="flex flex-col gap-3 text-zinc-100">
          <div className="flex items-center gap-3 w-full mt-1">
            <div className="flex items-center justify-center p-3 bg-white rounded-3xl flex-col shadow border border-zinc-600/30 min-h-30 min-w-30">
              {receiveLoading ? (
                <div className="w-8 h-8 rounded-full animate-spin border-4 border-solid border-zinc-400 border-t-transparent" />
              ) : receiveQrUrl ? (
                <img src={receiveQrUrl} alt="Wallet QR" className="w-24 h-24" />
              ) : (
                <span className="text-xs text-zinc-500 text-center px-2">{lang?.qr_unavailable || 'QR недоступен'}</span>
              )}
            </div>
            {user && (
              <div className="flex flex-col flex-grow min-w-0">
                <span className="font-semibold text-white">@{user.username}</span>
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

      {/* 6. MODAL: Transaction Details (Детали операции) */}
      <TransactionDetailsModal
        transaction={selectedTransaction}
        isOpen={isTransactionDetailsModalOpen}
        onClose={() => setIsTransactionDetailsModalOpen(false)}
        ownedIds={ownedAccountIds}
        systemLabel={strings.system}
      />

      {/* 5. MODAL: Withdrawal (Вывод средств) */}
      <Modal isOpen={isWithdrawModalOpen} onClose={() => setIsWithdrawModalOpen(false)} title={`${lang?.withdraw || 'Вывод'} ${gatewayConfig?.withdrawal_fields?.title || selectedGateway?.name || (lang?.payment_system || 'платёжную систему')}`} width="sm">
        <div className="flex flex-col gap-3 text-zinc-100">
          {selectedGateway && (
            <div className="flex items-center gap-3 border border-zinc-600/30 p-3 rounded-3xl bg-zinc-900/40">
              <div className="h-12 w-12 p-1 bg-zinc-800 rounded-2xl flex items-center justify-center shrink-0">
                <img alt={selectedGateway.name} src={selectedGateway.image} className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-semibold">{gatewayConfig?.withdrawal_fields?.title || selectedGateway.name}</span>
                <span className="text-xs text-zinc-400">{lang?.commission_system || 'Комиссия системы'}: {gatewayConfig?.fee_percent ?? selectedGateway.fee_percent}%</span>
              </div>
            </div>
          )}

          {gatewayFormLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="w-10 h-10 inline animate-spin fill-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path d="M 24 4 A 1.50015 1.50015 0 1 0 24 7 C 30.255882 7 35.765936 10.406785 38.703125 15.455078 A 1.5005776 1.5005776 0 1 0 41.296875 13.945312 C 37.834064 7.9936061 31.344118 4 24 4 z"></path>
              </svg>
            </div>
          ) : gatewayFormError ? (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-3xl text-center">
              {gatewayFormError}
            </div>
          ) : withdrawSuccess ? (
            <div className="flex flex-col gap-3 items-center text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl font-bold">✓</div>
              <span className="text-emerald-400 font-medium text-lg">{withdrawSuccess}</span>
              <button
                type="button"
                onClick={() => setIsWithdrawModalOpen(false)}
                className="w-full mt-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-3xl duration-300 font-medium"
              >
                {lang?.great || 'Отлично'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleWithdrawSubmit} className="flex flex-col gap-1.5 text-left">
              {/* Select account */}
              <div className="flex flex-col w-full">
                <span className="text-zinc-400 pl-4 z-20 text-xs lg:text-sm">{lang?.debit_account || 'Счёт списания'}</span>
                <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-2 lg:-mt-3 z-10 border border-zinc-600/30">
                  <select
                    value={withdrawAccountId}
                    onChange={(e) => setWithdrawAccountId(Number(e.target.value))}
                    className="rounded-3xl bg-zinc-800/60 w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-zinc-200 text-sm"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {lang?.account_num || 'Счёт №'}{acc.id} ({acc.name}) — {acc.balance} ANCI
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Server dynamic fields */}
              {Array.isArray(gatewayConfig?.withdrawal_fields?.fields) && gatewayConfig.withdrawal_fields.fields.length > 0 ? (
                gatewayConfig.withdrawal_fields.fields.map((f: any) => {
                  const label = f.label || f.key || '';
                  const key = f.key || 'field';
                  const req = !!f.required;
                  const type = (f.type || '').toLowerCase();

                  if (type === 'select') {
                    const options = Array.isArray(f.options) ? f.options : [];
                    return (
                      <div key={key} className="flex flex-col w-full">
                        <span className="text-zinc-400 pl-4 z-20 text-xs lg:text-sm">{label}</span>
                        <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-2 lg:-mt-3 z-10 border border-zinc-600/30">
                          <select
                            required={req}
                            value={dynamicFieldsData[key] || ''}
                            onChange={(e) => setDynamicFieldsData(prev => ({ ...prev, [key]: e.target.value }))}
                            className="rounded-3xl bg-zinc-800/60 w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-zinc-200 text-sm"
                          >
                            <option value="" disabled>{lang?.choose || 'Выберите...'}</option>
                            {options.map((o: any, idx: number) => (
                              <option key={idx} value={o.value ?? ''}>
                                {o.label ?? o.value}
                              </option>
                            ))}
                          </select>
                        </div>
                        {f.hint && <div className="text-xs text-zinc-500 pl-4 mt-1">{f.hint}</div>}
                      </div>
                    );
                  }

                  const inputType = ['text', 'number', 'email', 'tel', 'password'].includes(type) ? type : 'text';
                  return (
                    <div key={key} className="flex flex-col w-full">
                      <span className="text-zinc-400 pl-4 z-20 text-xs lg:text-sm">{label}</span>
                      <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-2 lg:-mt-3 z-10 border border-zinc-600/30">
                        <input
                          autoComplete="off"
                          type={inputType}
                          required={req}
                          placeholder={f.placeholder || ''}
                          value={dynamicFieldsData[key] || ''}
                          onChange={(e) => setDynamicFieldsData(prev => ({ ...prev, [key]: e.target.value }))}
                          className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600 text-white text-sm"
                        />
                      </div>
                      {f.hint && <div className="text-xs text-zinc-500 pl-4 -mt-2 z-20">{f.hint}</div>}
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col w-full">
                  <span className="text-zinc-400 pl-4 z-20 text-xs lg:text-sm">
                    {selectedGateway?.name.toLowerCase().includes('yoomoney')
                      ? (lang?.yoomoney_wallet_phone || 'Номер кошелька YooMoney / телефона')
                      : (lang?.receiver_details_hint || 'Реквизиты получателя (номер карты/счёта)')}
                  </span>
                  <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-2 lg:-mt-3 z-10 border border-zinc-600/30">
                    <input
                      autoComplete="off"
                      type="text"
                      placeholder={selectedGateway?.name.toLowerCase().includes('yoomoney') ? '41001...' : (lang?.details || 'Реквизиты')}
                      value={withdrawDetails}
                      onChange={(e) => setWithdrawDetails(e.target.value)}
                      className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600 text-white text-sm"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Amount */}
              <div className="flex flex-col w-full">
                <span className="text-zinc-400 pl-4 z-20 text-xs lg:text-sm">{lang?.withdraw_amount || 'Сумма вывода'}</span>
                <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-2 lg:-mt-3 z-10 border border-zinc-600/30">
                  <input
                    autoComplete="off"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600 text-white text-sm"
                    required
                  />
                </div>
              </div>

              {/* Calculation info */}
              {withdrawAmount && parseFloat(withdrawAmount) > 0 && selectedGateway && (
                <div className="flex flex-col gap-1 p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-3xl text-xs text-zinc-300">
                  <div className="flex justify-between">
                    <span>{lang?.commission || 'Комиссия'} ({gatewayConfig?.fee_percent ?? selectedGateway.fee_percent}%):</span>
                    <span>{((parseFloat(withdrawAmount) * (gatewayConfig?.fee_percent ?? selectedGateway.fee_percent)) / 100).toFixed(2)} ANCI</span>
                  </div>
                  <div className="flex justify-between font-bold text-white pt-1.5 border-t border-zinc-800 text-sm">
                    <span>{lang?.to_receive || 'К получению:'}</span>
                    <span className="text-emerald-400">
                      {Math.max(0, parseFloat(withdrawAmount) - (parseFloat(withdrawAmount) * (gatewayConfig?.fee_percent ?? selectedGateway.fee_percent)) / 100).toFixed(2)} ANCI
                    </span>
                  </div>
                </div>
              )}

              {withdrawError && (
                <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-3 rounded-3xl text-center">
                  {withdrawError}
                </div>
              )}

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-3xl duration-300 text-sm font-medium"
                >
                  {lang?.cancel || 'Отмена'}
                </button>
                <button
                  type="submit"
                  disabled={withdrawLoading || !withdrawAmount}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-3xl duration-300 text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {withdrawLoading ? (
                    <div className="w-4 h-4 rounded-full animate-spin border-2 border-solid border-white border-t-transparent" />
                  ) : (
                    lang?.withdraw || 'Вывести'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}
