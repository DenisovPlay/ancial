'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo, Suspense } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { AncialAPI, type WalletMerchantDetails, type WalletMerchantOrder } from '../../../lib/api-v2';
import { cache } from '../../../lib/cache.ts';

function AboutContentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, isAuthenticated, isLoading: authLoading } = useAuth();

  const merchantId = useMemo(() => {
    const id = searchParams.get('id');
    return id ? parseInt(id, 10) : 0;
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Merchant details
  const [merchant, setMerchant] = useState<WalletMerchantDetails | null>(null);
  const [totalPayments, setTotalPayments] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [orders, setOrders] = useState<WalletMerchantOrder[]>([]);

  // Settings form states
  const [img, setImg] = useState('');
  const [description, setDescription] = useState('');
  const [sUrl, setSUrl] = useState('');
  const [eUrl, setEUrl] = useState('');
  const [cUrl, setCUrl] = useState('');
  const [feePaid, setFeePaid] = useState<'buyer' | 'merchant'>('buyer');

  // Saving states
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const strings = useMemo(() => {
    return {
      save: lang?.save || 'Сохранить'
    };
  }, [lang]);

  const loadData = async (showLoading = false) => {
    if (!merchantId) {
      setError(lang?.invalid_merchant_id || 'Некорректный идентификатор мерчанта');
      setLoading(false);
      return;
    }
    if (showLoading && !merchant) setLoading(true);
    try {
      const res = await AncialAPI.getMerchantInfo(merchantId);
      if (res && res.merchant) {
        setMerchant(res.merchant);
        setTotalPayments(res.stats.total_payments || 0);
        setTotalEarned(res.stats.total_earned || 0);
        setOrders(res.orders || []);

        // Populate form
        setImg(res.merchant.img || '');
        setDescription(res.merchant.description || '');
        setSUrl(res.merchant.s_url || '');
        setEUrl(res.merchant.e_url || '');
        setCUrl(res.merchant.c_url || '');
        setFeePaid(res.merchant.fee_paid || 'buyer');
        setError(null);

        cache.set(`wallet_merchant_detail_cache_${merchantId}`, res, { category: 'wallet', subcategory: 'merchant_details' });
      } else {
        if (!merchant) setError(lang?.merchant_not_found || 'Мерчант не найден');
      }
    } catch (err: any) {
      if (!merchant) setError(err.message || (lang?.error_loading_merchant_settings || 'Ошибка загрузки настроек мерчанта'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push(`/login?backurl=/wallet/merchant/about?id=${merchantId}`);
      return;
    }

    const cacheKey = `wallet_merchant_detail_cache_${merchantId}`;
    const parsed = cache.get<any>(cacheKey, { category: 'wallet', subcategory: 'merchant_details' });
    let hasCache = false;
    if (parsed) {
      if (parsed.merchant) {
        setMerchant(parsed.merchant);
        if (parsed.stats) {
          setTotalPayments(parsed.stats.total_payments || 0);
          setTotalEarned(parsed.stats.total_earned || 0);
        }
        if (parsed.orders) setOrders(parsed.orders);
        setImg(parsed.merchant.img || '');
        setDescription(parsed.merchant.description || '');
        setSUrl(parsed.merchant.s_url || '');
        setEUrl(parsed.merchant.e_url || '');
        setCUrl(parsed.merchant.c_url || '');
        setFeePaid(parsed.merchant.fee_paid || 'buyer');
        hasCache = true;
        setLoading(false);
      }
    }

    loadData(!hasCache);
  }, [authLoading, isAuthenticated, merchantId]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await AncialAPI.updateMerchant(merchantId, {
        img,
        description,
        s_url: sUrl,
        e_url: eUrl,
        c_url: cUrl,
        fee_paid: feePaid
      });

      if (res && res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        // Refresh local details
        if (merchant) {
          setMerchant({
            ...merchant,
            img,
            description,
            s_url: sUrl,
            e_url: eUrl,
            c_url: cUrl,
            fee_paid: feePaid
          });
        }
      } else {
        setSaveError(res.message || (lang?.failed_to_update_settings || 'Не удалось обновить настройки'));
      }
    } catch (err: any) {
      setSaveError(err.message || (lang?.error_updating_settings || 'Ошибка обновления настроек'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleWithdrawClick = () => {
    alert(lang?.withdrawals_in_development || 'Вывод средств находится в разработке. Обратитесь в техподдержку.');
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="border border-zinc-700/30 bg-green-500/25 text-green-500 px-2 py-0.5 text-xs rounded-full w-fit">
            {lang?.status_paid || 'Оплачен'}
          </span>
        );
      case 'created':
        return (
          <span className="border border-zinc-700/30 bg-amber-500/25 text-amber-500 px-2 py-0.5 text-xs rounded-full w-fit">
            {lang?.status_created || 'Создан'}
          </span>
        );
      case 'pending':
        return (
          <span className="border border-zinc-700/30 bg-amber-500/25 text-amber-500 px-2 py-0.5 text-xs rounded-full w-fit">
            {lang?.status_pending || 'Ожидание'}
          </span>
        );
      case 'finished':
        return (
          <span className="border border-zinc-700/30 bg-zinc-500/25 text-zinc-500 px-2 py-0.5 text-xs rounded-full w-fit">
            {lang?.status_finished || 'Выплачен'}
          </span>
        );
      case 'cancelled':
        return (
          <span className="border border-zinc-700/30 bg-red-500/25 text-red-500 px-2 py-0.5 text-xs rounded-full w-fit">
            {lang?.status_cancelled || 'Отменен'}
          </span>
        );
      case 'failed':
        return (
          <span className="border border-zinc-700/30 bg-red-500/25 text-red-500 px-2 py-0.5 text-xs rounded-full w-fit">
            {lang?.status_failed || 'Ошибка'}
          </span>
        );
      case 'refunded':
        return (
          <span className="border border-zinc-700/30 bg-blue-500/25 text-blue-500 px-2 py-0.5 text-xs rounded-full w-fit">
            {lang?.status_refunded || 'Возвращён'}
          </span>
        );
      default:
        return (
          <span className="border border-zinc-700/30 bg-zinc-500/25 text-zinc-500 px-2 py-0.5 text-xs rounded-full w-fit">
            {lang?.status_unknown || 'Неизвестен'}
          </span>
        );
    }
  };

  if (loading && !merchant) {
    return (
      <div className="p-3 lg:px-0 flex flex-col items-center gap-6 bg-black min-h-screen text-zinc-100">
        <div className="flex items-center gap-3 max-w-screen-2xl w-full pt-3">
          <div className="h-8 w-32 bg-zinc-800/70 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 w-full max-w-screen-2xl">
          <div className="lg:col-span-2 bg-zinc-900/20 border border-zinc-600/30 rounded-3xl p-4 h-48 animate-pulse" />
          <div className="bg-zinc-900/20 border border-zinc-600/30 rounded-3xl p-4 h-48 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !merchant) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-black text-zinc-350 gap-3 px-4">
        <span className="text-xl font-bold text-red-500">{error || (lang?.error_loading_merchant || 'Ошибка загрузки мерчанта')}</span>
        <button onClick={() => router.push('/wallet/merchant')} className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full transition duration-300">
          {lang?.back_to_merchants || 'Назад к мерчантам'}
        </button>
      </div>
    );
  }

  const callbackStatus = merchant.c_url ? (lang?.callback_connected || 'Callback подключён') : '';

  return (
    <div className="p-3 lg:px-0 flex flex-col items-center gap-6 bg-black min-h-screen text-zinc-100 pb-16">

      {/* Header bar */}
      <div className="flex items-center gap-3 max-w-screen-2xl w-full pt-3">
        <span
          onClick={() => router.push('/wallet/merchant')}
          className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer text-zinc-100"
        >
          <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path d="M 29.449219 4.9863281 A 1.50015 1.50015 0 0 0 28.423828 5.4550781 L 11.423828 22.955078 A 1.50015 1.50015 0 0 0 11.423828 25.044922 L 28.423828 42.544922 A 1.50015 1.50015 0 1 0 30.576172 40.455078 L 14.591797 24 L 30.576172 7.5449219 A 1.50015 1.50015 0 0 0 29.449219 4.9863281 z" />
          </svg>
          <span style={{ marginTop: '0.1rem' }} className="shrink-0 text-3xl font-bold bg-gradient-to-br from-lime-500 to-emerald-500 text-transparent bg-clip-text cutetext">
            {lang?.merchant || 'Мерчант'}
          </span>
        </span>
        <div className="flex-grow" />
      </div>

      <div className="flex gap-3 items-center w-full duration-300 max-w-screen-2xl">
        <span className="text-xl lg:text-3xl font-bold text-white flex-grow shrink-0 text-left">{merchant.name}</span>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 w-full max-w-screen-2xl">
        <div className="relative flex flex-col gap-3 justify-center w-full p-4 border border-zinc-700/30 bg-zinc-900/20 rounded-3xl text-left">
          <div className="flex items-center gap-3">
            <img src={merchant.img || '/includes/img/noavatar.png'} className="rounded-2xl h-14 w-14 object-cover" alt="Merchant Avatar" />
            <div className="flex flex-col grow truncate">
              <span className="text-lg font-bold text-white truncate">{merchant.name}</span>
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                <span>ID: {merchant.id}</span>
                {callbackStatus && (
                  <>
                    <div className="rounded-full h-1 w-1 bg-zinc-500" />
                    <span className="truncate">{callbackStatus}</span>
                  </>
                )}
              </div>
            </div>
            <div className="shrink-0 flex items-start h-full">
              {merchant.status === 1 ? (
                <span className="border border-zinc-700/30 bg-green-500/25 text-green-500 px-1.5 py-0.5 text-xs rounded-full w-fit">
                  {lang?.active || 'Активен'}
                </span>
              ) : (
                <span className="border border-zinc-700/30 bg-red-500/25 text-red-500 px-1.5 py-0.5 text-xs rounded-full w-fit">
                  {lang?.inactive || 'Неактивен'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/20 border border-zinc-600/30 shadow rounded-3xl p-4 duration-300 w-full text-left">
          <div className="text-3xl font-bold text-white">{totalPayments}</div>
          <span className="text-zinc-400 text-sm">{lang?.total_payments || 'Всего платежей'}</span>
        </div>

        <div className="bg-zinc-900/20 border border-zinc-600/30 shadow rounded-3xl p-4 duration-300 w-full flex items-center gap-3 text-left">
          <div className="flex flex-grow flex-col">
            <div className="text-3xl font-bold text-white">{totalEarned} ₽</div>
            <span className="text-zinc-400 text-sm">{lang?.available_for_withdrawal || 'Доступно для вывода'}</span>
          </div>
          <button
            onClick={handleWithdrawClick}
            className="border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-2 duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-full shadow font-semibold"
          >
            {lang?.withdraw || 'Вывести'}
          </button>
        </div>
      </div>

      {/* Main Settings Form + Orders Table split layout */}
      <div className="w-full max-w-screen-2xl grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left Side: Settings Form */}
        <div className="flex flex-col gap-3 w-full">
          <div className="flex gap-3 items-center w-full duration-300">
            <span className="text-xl lg:text-3xl font-bold text-white flex-grow shrink-0 text-left">{lang?.settings || 'Настройки'}</span>
          </div>

          <form onSubmit={handleSaveSettings} className="flex flex-col gap-3 w-full text-left bg-zinc-900/20 border border-zinc-800 p-5 rounded-3xl">
            {/* Input: Image */}
            <div className="flex flex-col w-full text-left">
              <span className="text-zinc-400 pl-4 z-20">{lang?.image_label || 'Изображение'}</span>
              <div className="flex bg-zinc-850 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                <input
                  type="text"
                  value={img}
                  onChange={(e) => setImg(e.target.value)}
                  placeholder={lang?.avatar_url_placeholder || "URL аватара"}
                  className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-4 text-white text-sm"
                />
              </div>
            </div>

            {/* Input: Description */}
            <div className="flex flex-col w-full text-left">
              <span className="text-zinc-400 pl-4 z-20">{lang?.description_label || 'Описание'}</span>
              <div className="flex bg-zinc-850 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={lang?.merchant_description_placeholder || "Описание мерчанта"}
                  className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-4 text-white text-sm"
                />
              </div>
            </div>

            {/* Input: Success URL */}
            <div className="flex flex-col w-full text-left">
              <span className="text-zinc-400 pl-4 z-20">{lang?.success_url || 'URL успешной оплаты'}</span>
              <div className="flex bg-zinc-850 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                <input
                  type="text"
                  value={sUrl}
                  onChange={(e) => setSUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-4 text-white text-sm"
                />
              </div>
            </div>

            {/* Input: Error URL */}
            <div className="flex flex-col w-full text-left">
              <span className="text-zinc-400 pl-4 z-20">{lang?.error_url || 'URL неуспешной оплаты'}</span>
              <div className="flex bg-zinc-850 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                <input
                  type="text"
                  value={eUrl}
                  onChange={(e) => setEUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-4 text-white text-sm"
                />
              </div>
            </div>

            {/* Input: Callback URL */}
            <div className="flex flex-col w-full text-left">
              <span className="text-zinc-400 pl-4 z-20">CallBack URL</span>
              <div className="flex bg-zinc-850 rounded-full w-full p-1 h-12 -mt-3 z-10 border border-zinc-600/30">
                <input
                  type="text"
                  value={cUrl}
                  onChange={(e) => setCUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-4 text-white text-sm"
                />
              </div>
            </div>

            {/* Fee Paid Switcher */}
            <div className="cursor-pointer flex items-center justify-center gap-3 pt-2 text-sm">
              <span className="text-zinc-400">{lang?.fee_paid_by || 'Комиссию платит:'}</span>
              <div className="flex-grow" />
              <span className={feePaid === 'buyer' ? 'text-white font-bold' : 'text-zinc-500'}>{lang?.buyer || 'Покупатель'}</span>

              <div className="flex items-center h-5">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feePaid === 'merchant'}
                    onChange={(e) => setFeePaid(e.target.checked ? 'merchant' : 'buyer')}
                    className="sr-only peer"
                  />
                  <div className="group peer bg-zinc-800 rounded-full duration-300 w-10 h-6 after:duration-300 after:bg-purple-500 peer-checked:after:bg-green-500 after:rounded-full after:absolute after:h-6 after:w-6 after:top-0 after:left-0 after:flex after:justify-center after:items-center peer-checked:after:translate-x-4 peer-hover:after:scale-105" />
                </label>
              </div>

              <span className={feePaid === 'merchant' ? 'text-white font-bold' : 'text-zinc-500'}>{lang?.merchant || 'Мерчант'}</span>
            </div>

            {saveSuccess && (
              <span className="text-green-500 text-sm font-bold text-center animate-pulse">
                {lang?.settings_saved_successfully || 'Настройки успешно сохранены!'}
              </span>
            )}
            {saveError && (
              <span className="text-red-500 text-sm font-semibold text-center">
                {saveError}
              </span>
            )}

            <button
              type="submit"
              disabled={saveLoading}
              className="border border-zinc-600/30 cursor-pointer mt-2 flex items-center justify-center gap-3 px-4 py-3 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-full w-full shadow disabled:opacity-50 font-bold"
            >
              {saveLoading ? (lang?.saving || 'Сохранение...') : strings.save}
            </button>
          </form>
        </div>

        {/* Right Side: Orders list table */}
        <div className="flex flex-col gap-3 w-full">
          <div className="flex gap-3 items-center w-full duration-300">
            <span className="text-xl lg:text-3xl font-bold text-white flex-grow shrink-0 text-left">{lang?.operations || 'Операции'}</span>
          </div>

          <div className="flex flex-col justify-center w-full duration-300 shrink-0">
            <div className="flex flex-col items-center justify-center w-full border border-zinc-700/30 bg-zinc-800/70 rounded-3xl overflow-hidden duration-300 max-h-[500px] overflow-y-auto">

              {orders.length > 0 ? (
                <div className="w-full divide-y divide-zinc-750">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="w-full flex items-center gap-3 p-4 hover:bg-zinc-850 duration-300 text-left"
                    >
                      <div className="flex flex-col grow truncate">
                        <span className="font-bold text-white text-sm md:text-base truncate">
                          [#{order.id}] {order.order_hash}
                        </span>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-zinc-400 text-xs mt-1">
                          <span>
                            {lang?.amount || 'Сумма:'} <span className="text-zinc-200 font-medium">{order.amount} ₽</span>
                          </span>
                          <div className="rounded-full h-1 w-1 bg-zinc-650" />
                          <span className="truncate">
                            {lang?.label || 'Лейбл:'} <span className="text-zinc-200 font-medium">{order.label || '—'}</span>
                          </span>
                          {order.description && (
                            <>
                              <div className="rounded-full h-1 w-1 bg-zinc-650" />
                              <span className="truncate">
                                {lang?.description_table || 'Описание:'} <span className="text-zinc-200 font-medium">{order.description}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center">{getOrderStatusBadge(order.status)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center w-full py-16 text-zinc-450">
                  {lang?.no_operations_for_merchant || 'Нет зарегистрированных операций по этому мерчанту.'}
                </div>
              )}

            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

export default function AboutContent() {
  return (
    <Suspense fallback={
      <div className="w-screen h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 rounded-full animate-spin border-4 border-solid border-purple-500 border-t-transparent" />
      </div>
    }>
      <AboutContentInner />
    </Suspense>
  );
}
