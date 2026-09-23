'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useMemo } from 'react';

import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { AncialAPI, getApiMessage, type SendMoneyParams, type WalletOverview, type WalletAccount, type WalletGateway, type WalletGatewayForm, type WalletTopupOrder, type WalletTransaction } from '../lib/api-v2';

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
import { cache } from '../lib/cache.ts';
import Modal from '../components/modal';
import WalletLogo from './wallet-logo';
import { TransactionItem, TransactionDetailsModal } from './components/transaction-item';
import { SendMoneyModal } from './components/send-money-modal';
import { ProductsAccountsModal } from './components/products-accounts-modal';
import { WithdrawModal } from './components/withdraw-modal';
import AppImage from '../components/app-image';
import Icon from '../components/svg-icon';


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
  return `/pay/${orderHash}`;
}

export default function WalletContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { showNote } = useNotification();

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
  const [createAccountTitle, setCreateAccountTitle] = useState(lang?.walletAccount || 'Счёт');
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
  const [friendsList, setFriendsList] = useState<StfFriend[]>([]);
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
  const [gatewayConfig, setGatewayConfig] = useState<WalletGatewayForm | null>(null);
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
  const fetchWallet = useCallback(async (showLoading = false) => {
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
      cache.set('wallet_overview_cache', overview, { category: 'wallet', subcategory: 'overview' });
    } catch (err) {
      if (accounts.length === 0) {
        setError(getApiMessage(err instanceof Error ? err.message : null, lang, lang?.walletloaderror || 'Ошибка загрузки кошелька'));
      }
    } finally {
      setLoading(false);
    }
  }, [accounts.length, lang?.walletloaderror]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      // Неавторизован — терминальное состояние: снимаем лоадер сразу,
      // начальный useState(true) эквивалентен этому setState.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      setError(lang?.auth_required || 'Требуется авторизация');
      return;
    }

    const parsed = cache.get<WalletOverview>('wallet_overview_cache', { category: 'wallet', subcategory: 'overview' });
    let hasCachedData = false;
    if (parsed) {
      if (Array.isArray(parsed.accounts)) {
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
    }

    fetchWallet(!hasCachedData);
  }, [authLoading, isAuthenticated, fetchWallet, lang?.auth_required]);

  // Reset transfer modal state when opened/closed
  useEffect(() => {
    if (!isSendMoneyModalOpen) {
      // Сброс состояния формы при закрытии модалки — сеттлеры здесь источник правды,
      // альтернативы без каскада нет.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // Сброс состояния при закрытии модалки — сеттлеры здесь источник правды.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProductsView('list');
      setAccountToDelete(null);
      setDeleteAccountError(null);
      setCreateAccountTitle(lang?.walletAccount || 'Счёт');
      setCreateAccountError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- сброс только при закрытии модалки: lang?.walletAccount не должен перезаписывать ввод при смене языка
  }, [isProductsModalOpen]);

  // Open send modal from QR scanner (?action=send&login=...)
  useEffect(() => {
    const action = searchParams.get('action');
    const login = searchParams.get('login');
    if (action === 'send') {
      // URL-параметры → стейт модалки: источник правды здесь, альтернативы без каскада нет.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
  const loadFriends = useCallback(async () => {
    setFriendsLoading(true);
    setFriendsError(null);
    try {
      const res = await AncialAPI.socialAction<{ friends?: StfFriend[] } | StfFriend[]>('friends');
      const friendsArr = Array.isArray(res) ? res : res?.friends;
      if (friendsArr) {
        // Friend status 1 is confirmed friends
        const activeFriends = friendsArr.filter((f) => Number(f.status) === 1);
        setFriendsList(activeFriends);
        if (activeFriends.length > 0 && activeFriends[0].username) {
          setStfFriendUsername(activeFriends[0].username);
        }
      }
    } catch (err) {
      setFriendsError(getApiMessage(err instanceof Error ? err.message : null, lang, lang?.friendsloaderror || 'Не удалось загрузить список друзей'));
    } finally {
      setFriendsLoading(false);
    }
  }, [lang?.friendsloaderror]);

  useEffect(() => {
    if (sendStep === 'stf') {
      // Ленивая загрузка друзей при открытии шага: сеттлеры внутри loadFriends после await.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadFriends();
    }
  }, [sendStep, loadFriends]);

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
    } catch (err) {
      setDeleteAccountError(getApiMessage(err instanceof Error ? err.message : null, lang, lang?.failedtocloseaccount || 'Не удалось закрыть счёт'));
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
      setCreateAccountTitle(lang?.walletAccount || 'Счёт');
      setProductsView('list');
      await fetchWallet();
    } catch (err) {
      setCreateAccountError(getApiMessage(err instanceof Error ? err.message : null, lang, lang?.failedtocreateaccount || 'Не удалось создать счёт'));
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

  const handleSendSubmit = async (payload: SendMoneyParams, amountStr: string) => {
    setSendLoading(true);
    setSendError(null);
    try {
      await AncialAPI.sendMoney(payload);

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
    } catch (err) {
      setSendError(getApiMessage(err instanceof Error ? err.message : null, lang, lang?.transfererror || 'Ошибка перевода средств'));
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

    const payload: SendMoneyParams = {
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
      setTopupError(`${lang?.max_topup_amount || 'Максимальная сумма пополнения за один раз — 15 000 '}<Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" />`);
      return;
    }

    setTopupLoading(true);
    setTopupError(null);

    try {
      const res = await AncialAPI.createTopup(amountVal, topupAccountId);
      setTopupAmount('');
      setIsCreateTopupModalOpen(false);

      if (res.order_hash) {
        router.push(buildPayUrl(res.order_hash));
      } else if (res.payment_url) {
        const relativeUrl = res.payment_url.startsWith('http')
          ? new URL(res.payment_url).pathname + new URL(res.payment_url).search
          : res.payment_url;
        router.push(relativeUrl);
      }

      await fetchWallet();
    } catch (err) {
      setTopupError(getApiMessage(err instanceof Error ? err.message : null, lang, lang?.topupcreateerror || 'Ошибка создания пополнения'));
    } finally {
      setTopupLoading(false);
    }
  };

  // Cancel Topup handler
  const handleCancelTopup = async (orderHash: string) => {
    try {
      await AncialAPI.cancelTopup(orderHash);
      await fetchWallet();
    } catch (err) {
      showNote({
        content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.failedtocanceltopup || 'Не удалось отменить пополнение'),
        type: 'error',
        time: 5
      });
    }
  };

  // Fetch QR Code logic
  const loadQRCode = useCallback(async (accountId: number) => {
    if (!accountId) return;
    setReceiveLoading(true);
    setReceiveError(null);
    setReceiveQrUrl(null);
    try {
      const res = await AncialAPI.generateQRCode(accountId);
      setReceiveQrUrl(res.qr_url);
    } catch (err) {
      setReceiveError(getApiMessage(err instanceof Error ? err.message : null, lang, lang?.failedtogenerateqr || 'Не удалось сгенерировать QR-код'));
    } finally {
      setReceiveLoading(false);
    }
  }, [lang?.failedtogenerateqr]);

  // Trigger QR Code load when selection changes or modal opens
  useEffect(() => {
    if (isUserProfModalOpen && receiveAccountId) {
      // Загрузка QR при открытии модалки: сеттлеры внутри loadQRCode после await.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadQRCode(receiveAccountId);
    }
  }, [isUserProfModalOpen, receiveAccountId, loadQRCode]);

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
          try { fieldsObj = JSON.parse(fieldsObj); } catch { }
        }
        targetGw.withdrawal_fields = fieldsObj;
        setGatewayConfig(targetGw);
      } else {
        setGatewayFormError(lang?.failedtoloadwithdrawform || 'Не удалось загрузить форму вывода');
      }
    } catch (err) {
      setGatewayFormError(getApiMessage(err instanceof Error ? err.message : null, lang, lang?.withdrawformloaderror || 'Ошибка загрузки формы вывода с сервера'));
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
    const wf = gatewayConfig?.withdrawal_fields;
    const serverFields = (wf && typeof wf !== 'string' ? wf.fields : undefined);
    if (Array.isArray(serverFields) && serverFields.length > 0) {
      const parts: string[] = [];
      for (const f of serverFields) {
        const val = dynamicFieldsData[f.key ?? ''] ?? '';
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

      setWithdrawSuccess(getApiMessage(res.message, lang, lang?.withdrawrequestcreated || 'Заявка на вывод средств успешно создана!'));
      fetchWallet(false);
    } catch (err) {
      setWithdrawError(getApiMessage(err instanceof Error ? err.message : null, lang, lang?.withdrawcreateerror || 'Ошибка при создании заявки на вывод'));
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
              <img src="/img/load-placeholders/wallet-intro.webp" alt="Wallet Intro" className="w-full max-h-140 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
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
                <Icon name="IC-send" className="fill-white w-5 h-5 inline" /> {strings.send}
              </button>
              <button onClick={() => setIsUserProfModalOpen(true)} className="border border-zinc-600/30 shrink-0 flex items-center gap-3 text-zinc-300 bg-zinc-900/20 hover:bg-zinc-700 hover:text-white shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95 backdrop-blur-md backdrop-saturate-200">
                <Icon name="IC-send" className="fill-white w-5 h-5 inline rotate-180" /> {strings.receive}
              </button>
              <button onClick={() => setIsCreateTopupModalOpen(true)} className="border border-zinc-600/30 shrink-0 flex items-center gap-3 text-zinc-300 bg-zinc-900/20 hover:bg-zinc-700 hover:text-white shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95 backdrop-blur-md backdrop-saturate-200">
                <Icon name="IC-topup" className="fill-white w-5 h-5 inline" /> {strings.deposit}
              </button>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-3 w-full max-w-screen-2xl duration-300 -mb-3 lg:mb-0">
            <div className="flex flex-nowrap gap-3 items-center w-full overflow-x-auto viewport px-3 lg:-mx-3 -my-3 py-3 duration-300">

              {/* Mobile quick actions (hidden on lg) */}
              <div className="flex flex-col gap-3 h-24 lg:hidden sticky left-0 z-[5]">
                <button onClick={() => handleTopage('/wallet/qr')} className="lg:hidden cursor-pointer border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 shrink-0 flex items-center justify-center text-zinc-300 bg-zinc-900/20 hover:bg-zinc-700 hover:text-white hover:shadow active:scale-95 duration-300 rounded-3xl" style={{ width: 42, height: 42 }}>
                  <Icon name="IC-qr-scanner" className="fill-white w-7 h-7 inline" />
                </button>
                <button onClick={() => { }} className="lg:hidden cursor-pointer border border-zinc-600/30 backdrop-blur-md backdrop-saturate-200 shrink-0 flex items-center justify-center text-zinc-300 bg-zinc-900/20 hover:bg-zinc-700 hover:text-white hover:shadow active:scale-95 duration-300 rounded-3xl" style={{ width: 42, height: 42 }} aria-label="Blockchain explorer">
                  <Icon name="IC-poll" className="fill-white w-7 h-7 inline" />
                </button>
              </div>

              {/* ACCOUNT_ITEMS */}
              {accounts.map((acc) => (
                <div key={acc.id} onClick={() => handleTopage(`/wallet/account/${acc.id}`)} className="shrink-0 p-3 flex flex-col border border-zinc-600/30 hover:bg-zinc-700 bg-zinc-800/70 rounded-3xl shadow-lg hover:scale-105 active:scale-95 duration-300 cursor-pointer w-48 lg:w-64 h-24 lg:h-32">
                  <span className="lg:font-black text-white text-xl lg:text-3xl">
                    {acc.balance}{' '}
                    <Icon name="IC-anci" className="w-6 h-6 lg:w-8 lg:h-8 inline fill-purple-500 -mt-1.5" />
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
              <Icon name="IC-send" className="fill-white w-5 h-5 inline" /> {strings.send}
            </button>
            <button onClick={() => setIsUserProfModalOpen(true)} className="border border-zinc-600/30 shrink-0 flex items-center gap-3 text-zinc-300 bg-zinc-900/20 hover:bg-zinc-700 hover:text-white shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95 backdrop-blur-md backdrop-saturate-200">
              <Icon name="IC-send" className="fill-white w-5 h-5 inline rotate-180" /> {strings.receive}
            </button>
            <button onClick={() => setIsCreateTopupModalOpen(true)} className="border border-zinc-600/30 shrink-0 flex items-center gap-3 text-zinc-300 bg-zinc-900/20 hover:bg-zinc-700 hover:text-white shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95 backdrop-blur-md backdrop-saturate-200">
              <Icon name="IC-topup" className="fill-white w-5 h-5 inline" /> {strings.deposit}
            </button>
          </div>

          {/* SERVICES */}
          <div className="flex flex-col justify-center gap-3 w-full max-w-screen-2xl duration-300 shrink-0">
            <div className="flex gap-3 items-center w-full duration-300">
              <span className="text-2xl lg:text-3xl font-bold text-white flex-grow shrink-0 px-3 lg:px-0 duration-300">{strings.payments}</span>
              <div className="hidden lg:flex flex-nowrap items-center gap-3 overflow-x-auto viewport px-3 lg:px-0 duration-300">
                <button className="shrink-0 flex items-center gap-3 text-zinc-300 bg-zinc-900/20 border border-zinc-600/30 hover:bg-zinc-700 hover:text-white shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95">
                  <Icon name="IC-chevron-right" className="fill-white w-5 h-5 inline" /> {strings.all}
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
                      <AppImage width={64} height={64} alt={gateway.name} src={gateway.image} className="h-full w-full object-contain" />
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
                    <Icon name="IC-chevron-right" className="fill-white w-5 h-5 inline" /> {strings.all}
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
                    <div key={order.id} className="hover:bg-zinc-700/50 relative group shrink-0 flex items-center gap-3 justify-between active:rounded-3xl active:scale-95 duration-300 w-full">
                      <Link href={buildPayUrl(order.order_hash)} className="pl-3 py-3 flex items-center gap-3 flex-grow min-w-0 cursor-pointer">
                        <div className={`border border-zinc-600/30 shadow-2xl h-10 w-10 lg:h-12 lg:w-12 p-1.5 ${statuscolor[1]} rounded-3xl shrink-0 duration-300 flex items-center justify-center`}>
                          <Icon name="IC-topup" className={`h-6 w-6 lg:w-8 lg:h-8 inline ${statuscolor[0]}`} />
                        </div>
                        <div className="flex flex-col justify-center min-w-0">
                          <span className="text-sm lg:text-base text-zinc-100 truncate">[#{order.id}] {lang?.topup_of_account || 'Пополнение счёта №'}{order.label}</span>
                          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCancelTopup(order.order_hash); }} className="shrink-0 text-sm mt-1.5 w-fit flex items-center gap-1.5 text-red-500 bg-red-500/25 hover:bg-red-700/40 shadow rounded-3xl cursor-pointer py-0.5 px-1 duration-300 active:scale-95 backdrop-blur-lg border border-zinc-600/30">
                            <span>{strings.cancel}</span>
                          </button>
                        </div>
                      </Link>
                      <Link href={buildPayUrl(order.order_hash)} className="flex flex-col items-end shrink-0 py-3 pr-3 cursor-pointer">
                        <span className="font-semibold text-zinc-300">{order.amount}<Icon name="IC-anci" className="w-4 h-4 inline fill-purple-500 -mt-1.5" /></span>
                        <span className="text-zinc-400 text-xs lg:text-sm max-w-20 md:max-w-64 text-right">{order.created_at}</span>
                      </Link>
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
                  <Icon name="IC-chevron-right" className="fill-white w-5 h-5 inline" /> <span>{lang?.all || 'Все'}</span>
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

      {/* 1. MODAL: Products/Accounts (Мои счета) — состояние в WalletContent */}
      <ProductsAccountsModal
        isOpen={isProductsModalOpen}
        onClose={() => setIsProductsModalOpen(false)}
        lang={lang}
        accounts={accounts}
        productsView={productsView}
        setProductsView={setProductsView}
        createAccountTitle={createAccountTitle}
        setCreateAccountTitle={setCreateAccountTitle}
        createAccountError={createAccountError}
        createAccountLoading={createAccountLoading}
        accountToDelete={accountToDelete}
        deleteAccountError={deleteAccountError}
        deleteAccountLoading={deleteAccountLoading}
        handleTopage={handleTopage}
        handleCreateAccount={handleCreateAccount}
        handleDeleteAccountClick={handleDeleteAccountClick}
        handleConfirmDeleteAccount={handleConfirmDeleteAccount}
      />
      {/* 2. MODAL: Send Money (Перевести) — состояние и обработчики в WalletContent */}
      <SendMoneyModal
        isOpen={isSendMoneyModalOpen}
        onClose={() => setIsSendMoneyModalOpen(false)}
        title={strings.send}
        lang={lang}
        accounts={accounts}
        friendsList={friendsList}
        friendsLoading={friendsLoading}
        friendsError={friendsError}
        sendStep={sendStep}
        setSendStep={setSendStep}
        sendSenderId={sendSenderId}
        setSendSenderId={setSendSenderId}
        sendLoading={sendLoading}
        sendError={sendError}
        setSendError={setSendError}
        successDetails={successDetails}
        sdaToAccountId={sdaToAccountId}
        setSdaToAccountId={setSdaToAccountId}
        sdaAmount={sdaAmount}
        setSdaAmount={setSdaAmount}
        stfFriendUsername={stfFriendUsername}
        setStfFriendUsername={setStfFriendUsername}
        stfAmount={stfAmount}
        setStfAmount={setStfAmount}
        stfComment={stfComment}
        setStfComment={setStfComment}
        sdbDetailType={sdbDetailType}
        setSdbDetailType={setSdbDetailType}
        sdbEmail={sdbEmail}
        setSdbEmail={setSdbEmail}
        sdbPhone={sdbPhone}
        setSdbPhone={setSdbPhone}
        sdbLogin={sdbLogin}
        setSdbLogin={setSdbLogin}
        sdbAmount={sdbAmount}
        setSdbAmount={setSdbAmount}
        sdbComment={sdbComment}
        setSdbComment={setSdbComment}
        getCommissionInfo={getCommissionInfo}
        handleSdaSubmit={handleSdaSubmit}
        handleStfSubmit={handleStfSubmit}
        handleSdbSubmit={handleSdbSubmit}
      />
      {/* 3. MODAL: Top Up (Пополнить) */}
      <Modal isOpen={isCreateTopupModalOpen} onClose={() => setIsCreateTopupModalOpen(false)} title={lang?.deposit || 'Пополнить'} width="sm">
        <form onSubmit={handleCreateTopup} className="flex flex-col gap-0.5 text-zinc-100">
          <div className="p-3 mb-2.5 border border-zinc-600/30 bg-amber-500/25 text-amber-500 rounded-3xl shadow flex flex-col w-full text-left">
            <span className="font-bold text-base">{lang?.attention || 'Внимание!'}</span>
            <span className="text-sm">{lang?.testing_mode || 'Функция находится на этапе тестирования. Если вы произвели платёж, но баланс не изменился, пожалуйста, свяжитесь с поддержкой.'}</span>
            <span className="text-xs">{lang?.contacts_hint || 'Контакты находятся в Настройки -> О Zypo -> Контакты'}</span>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col w-full text-left">
              <span className="text-zinc-400 pl-4 z-20">{lang?.whichaccount || 'На какой счёт'}</span>
              <div className="flex bg-zinc-800/90 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                <select
                  value={topupAccountId}
                  onChange={(e) => setTopupAccountId(Number(e.target.value))}
                  className="rounded-full bg-zinc-800/60 w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-white"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {lang?.walletAccount || 'Счёт'} №{acc.id} ({acc.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col w-full text-left -mt-3">
              <span className="text-zinc-400 pl-4 z-20">{lang?.t_ama || 'Сумма'}</span>
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
          <span className="text-xs text-zinc-300 pt-3 text-left">{lang?.payment_notice || 'Платёж будет выполнен через Zypo Merchant. Совершая платёж, Вы принимаете условия Zypo Payments и Wallet.'}</span>
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
                <AppImage width={96} height={96} src={receiveQrUrl} alt="Wallet QR" className="w-24 h-24" />
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

      {/* 5. MODAL: Withdrawal (Вывод средств) — состояние в WalletContent */}
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        lang={lang}
        accounts={accounts}
        gatewayConfig={gatewayConfig}
        selectedGateway={selectedGateway}
        withdrawAccountId={withdrawAccountId}
        setWithdrawAccountId={setWithdrawAccountId}
        withdrawAmount={withdrawAmount}
        setWithdrawAmount={setWithdrawAmount}
        withdrawDetails={withdrawDetails}
        setWithdrawDetails={setWithdrawDetails}
        withdrawLoading={withdrawLoading}
        withdrawError={withdrawError}
        withdrawSuccess={withdrawSuccess}
        gatewayFormError={gatewayFormError}
        gatewayFormLoading={gatewayFormLoading}
        dynamicFieldsData={dynamicFieldsData}
        setDynamicFieldsData={setDynamicFieldsData}
        handleWithdrawSubmit={handleWithdrawSubmit}
      />
    </>
  );
}
