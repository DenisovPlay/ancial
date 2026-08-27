'use client';

import Link from 'next/link';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Inter, Montserrat } from 'next/font/google';
import localFont from 'next/font/local';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { AncialAPI, getApiMessage, type PayOrderDetails, type PayGateway } from '../lib/api-v2';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const nauryzFont = localFont({
  src: '../../public/fonts/NauryzRedKeds.ttf',
  display: 'swap',
});

export default function PayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  const { lang } = useAuth();
  const { showNote } = useNotification();

  const rawOrderParam = params?.order;
  const orderHash = (Array.isArray(rawOrderParam) ? rawOrderParam[0] : rawOrderParam) || searchParams.get('order') || '';

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<PayOrderDetails | null>(null);

  const [redirectingGatewayId, setRedirectingGatewayId] = useState<string | null>(null);
  const [redirectingGatewayName, setRedirectingGatewayName] = useState<string>('');

  const loadOrderDetails = useCallback(async (hash: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await AncialAPI.getPayOrderDetails(hash);
      setDetails(data);
      setError(null);
    } catch (err) {
      setError(getApiMessage(err instanceof Error ? err.message : null, lang, lang?.pay_order_not_found || 'Заказ не найден'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    if (!orderHash) {
      // Нет хэша заказа — терминальное состояние, снимаем лоадер сразу.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      setError(lang?.pay_order_not_found || 'Заказ не найден');
      return;
    }

    loadOrderDetails(orderHash);
  }, [orderHash, loadOrderDetails, lang]);

  useEffect(() => {
    if (!orderHash || !details?.order || details.order.status !== 'pending') {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const res = await AncialAPI.pollPayOrderStatus(orderHash);
        if (res.status && res.status !== 'pending') {
          clearInterval(intervalId);
          await loadOrderDetails(orderHash, true);
        }
      } catch (err) {
        console.error('Error polling pay status:', err);
      }
    }, 10000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- осознанные узкие deps: рестарт поллинга только при смене статуса заказа
  }, [orderHash, details?.order?.status, loadOrderDetails]);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const handleSelectGateway = async (gateway: PayGateway) => {
    if (gateway.is_disabled || redirectingGatewayId) return;

    setRedirectingGatewayId(gateway.id);
    setRedirectingGatewayName(gateway.name);

    try {
      const res = await AncialAPI.redirectPayOrder(orderHash, gateway.id);
      if (res.payment_url) {
        // assign() вместо прямой записи в location.href — то же поведение, но без мутации глобального объекта.
        window.location.assign(res.payment_url);
      } else {
        throw new Error('Payment URL not returned');
      }
    } catch (err) {
      showNote({
        content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.somethingwrong || 'Сервис оплаты временно недоступен'),
        type: 'error',
        time: 5
      });
      setRedirectingGatewayId(null);
      setRedirectingGatewayName('');
    }
  };

  const handleChangeMethod = () => {
    showNote({
      content: lang?.pay_change_method_unavailable || 'Временно недоступно, простите!',
      type: 'warning',
      time: 5
    });
  };

  const getThemeBgClass = (color: string) => {
    switch (color) {
      case 'purple': return 'bg-purple-500/25 shadow-purple-500/25';
      case 'emerald': return 'bg-emerald-500/25 shadow-emerald-500/25';
      case 'blue': return 'bg-blue-500/25 shadow-blue-500/25';
      case 'cyan': return 'bg-cyan-500/25 shadow-cyan-500/25';
      default: return 'bg-zinc-500/25 shadow-zinc-500/25';
    }
  };

  const getFeeBadgeClass = (color: string) => {
    switch (color) {
      case 'emerald': return 'border border-zinc-600/30 bg-emerald-500/25 text-emerald-500 shadow-emerald-500';
      case 'amber': return 'border border-zinc-600/30 bg-amber-500/25 text-amber-500 shadow-amber-500';
      case 'red': return 'border border-zinc-600/30 bg-red-500/25 text-red-500 shadow-red-500';
      default: return 'border border-zinc-600/30 bg-zinc-500/25 text-zinc-300 shadow-zinc-500';
    }
  };

  const backButtonText = lang?.pay_back_to_zypo || lang?.pay_back_to_ancial || 'Вернуться в Zypo';

  if (loading) {
    return (
      <div className={`w-full min-h-screen bg-black flex items-center lg:justify-center flex-col p-3 text-zinc-100 ${inter.className}`}>
        <div className="mb-3 mt-3 w-fit flex items-center gap-1.5 px-3 lg:px-0">
          <div className="h-4 w-36 bg-zinc-800 rounded-full animate-pulse"></div>
        </div>

        <div className="relative bg-zinc-900 border border-zinc-600/30 flex flex-col lg:flex-row items-stretch justify-center rounded-3xl shadow w-full max-w-4xl overflow-hidden p-3 gap-3">
          {/* Left Skeleton Side */}
          <div className="flex flex-col flex-1 w-full justify-between animate-pulse p-1">
            <div>
              <div className="flex items-center justify-between gap-3 -mt-1">
                <div className="h-8 w-20 bg-zinc-800 rounded-2xl"></div>
                <div className="h-9 w-28 bg-zinc-800 rounded-2xl"></div>
              </div>
              <div className="h-6 w-3/4 bg-zinc-800 rounded-xl mt-3"></div>
            </div>

            <div className="flex-grow min-h-[40px]"></div>

            <div className="mt-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700/30 shrink-0"></div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-28 bg-zinc-800 rounded-lg"></div>
                    <div className="h-4 w-20 bg-zinc-800/80 rounded-full"></div>
                  </div>
                  <div className="h-3 w-40 bg-zinc-800/70 rounded-lg"></div>
                </div>
              </div>
              <div className="h-3 w-full bg-zinc-800/50 rounded-lg mt-3"></div>
            </div>
          </div>

          {/* Right Skeleton Side: Payment Gateways */}
          <div className="border-t lg:border-t-0 lg:border-l border-zinc-600/30 flex flex-col flex-1 gap-2 w-full rounded-3xl bg-zinc-800/70 p-3 animate-pulse">
            <div className="h-6 w-44 bg-zinc-800 rounded-xl mb-1"></div>
            <div className="grid grid-cols-2 gap-3 w-full mt-1.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="border border-zinc-600/30 p-1.5 flex items-center gap-2 bg-zinc-800/80 rounded-3xl h-20">
                  <div className="h-14 w-14 bg-zinc-700/60 rounded-3xl shrink-0"></div>
                  <div className="flex flex-col gap-2 flex-grow min-w-0">
                    <div className="h-4 w-24 bg-zinc-700/60 rounded-lg"></div>
                    <div className="h-3 w-16 bg-zinc-700/40 rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Skeleton */}
        <div className="flex items-center justify-center mt-3 gap-6 animate-pulse">
          <div className="h-8 w-24 bg-zinc-800/60 rounded-xl"></div>
          <div className="h-8 w-24 bg-zinc-800/60 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className={`w-full min-h-screen bg-black flex flex-col items-center justify-center p-3 text-zinc-100 ${inter.className}`}>
        <span
          onClick={handleBack}
          className="mb-3 w-fit text-sm font-extralight hover:text-zinc-200 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer text-zinc-300"
        >
          <svg className="w-4 h-4 fill-zinc-300 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path d="M 29.449219 4.9863281 A 1.50015 1.50015 0 0 0 28.423828 5.4550781 L 11.423828 22.955078 A 1.50015 1.50015 0 0 0 11.423828 25.044922 L 28.423828 42.544922 A 1.50015 1.50015 0 1 0 30.576172 40.455078 L 14.591797 24 L 30.576172 7.5449219 A 1.50015 1.50015 0 0 0 29.449219 4.9863281 z" />
          </svg>
          {backButtonText}
        </span>

        <div className="bg-zinc-900 border border-zinc-600/30 flex flex-col items-center justify-center rounded-3xl shadow w-full max-w-3xl p-6 text-center">
          <span className={`text-white font-bold text-2xl ${nauryzFont.className}`}>{lang?.pay_order_not_found || 'Заказ не найден'}</span>
          <span className="text-zinc-400 mt-3">
            {lang?.pay_order_not_found_desc || 'Пожалуйста, проверьте правильность ссылки или обратитесь в поддержку мерчанта.'}
          </span>
        </div>
      </div>
    );
  }

  const { order, merchant, gateways, gateway_pending } = details;

  const getSuccessUrl = () => {
    if (!merchant.s_url) return '#';
    const query = new URLSearchParams({
      order: order.order_hash,
      label: order.label || '',
      description: order.description || '',
      created_at: order.created_at || '',
      paid_at: order.paid_at || ''
    });
    return `${merchant.s_url}${merchant.s_url.includes('?') ? '&' : '?'}${query.toString()}`;
  };

  const getFailedUrl = () => {
    if (!merchant.e_url) return '#';
    const query = new URLSearchParams({
      order: order.order_hash,
      label: order.label || '',
      description: order.description || '',
      created_at: order.created_at || ''
    });
    return `${merchant.e_url}${merchant.e_url.includes('?') ? '&' : '?'}${query.toString()}`;
  };

  return (
    <div className={`w-full min-h-screen bg-black flex items-center lg:justify-center flex-col p-3 text-zinc-100 ${inter.className}`}>
      <span
        onClick={handleBack}
        className="mb-3 mt-3 w-fit text-sm font-extralight hover:text-zinc-200 duration-300 active:scale-95 flex items-center gap-1.5 px-3 lg:px-0 cursor-pointer text-zinc-300"
      >
        <svg className="w-4 h-4 fill-zinc-300 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <path d="M 29.449219 4.9863281 A 1.50015 1.50015 0 0 0 28.423828 5.4550781 L 11.423828 22.955078 A 1.50015 1.50015 0 0 0 11.423828 25.044922 L 28.423828 42.544922 A 1.50015 1.50015 0 1 0 30.576172 40.455078 L 14.591797 24 L 30.576172 7.5449219 A 1.50015 1.50015 0 0 0 29.449219 4.9863281 z" />
        </svg>
        {backButtonText}
      </span>

      <div className="relative bg-zinc-900 border border-zinc-600/30 flex flex-col lg:flex-row items-stretch justify-center rounded-3xl shadow w-full max-w-4xl overflow-hidden">
        {/* Left Side: Order & Merchant Info (flex-1 flex-col justify-between ensures merchant info is pinned to bottom) */}
        <div className="flex flex-col flex-1 w-full lg:max-w-md p-3 justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 -mt-1">
              <span className={`text-3xl font-bold bg-gradient-to-br from-lime-500 to-emerald-500 text-transparent bg-clip-text ${nauryzFont.className}`}>
                PAY
              </span>
              <span className={`bg-gradient-to-br from-purple-500 to-indigo-500 bg-clip-text text-transparent font-bold text-4xl ${nauryzFont.className}`} style={{ filter: 'saturate(4)' }}>
                {order.amount} <span className="text-purple-400">₽</span>
              </span>
            </div>
            <span className="text-white font-bold text-lg mt-1.5 block">{order.description}</span>
          </div>

          <div className="flex-grow min-h-6"></div>

          <div className="mt-1.5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl overflow-hidden bg-zinc-800/50 border border-zinc-600/30 shadow-lg shrink-0">
                <img src={merchant.img} alt={merchant.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-white font-medium">{merchant.name}</span>
                  <span className="border border-zinc-600/30 font-thin text-xs px-1 py-0.5 bg-zinc-800/90 rounded-full shadow text-zinc-300">
                    {lang?.pay_with_us || 'с нами'} {merchant.badge}
                  </span>
                </div>
                <span className="text-zinc-300 text-sm">{merchant.description}</span>
              </div>
            </div>
            <span className="text-xs text-zinc-400 mt-3 block">
              {lang?.pay_disclaimer || 'Ancial Pay и ZeniFlow не связаны с мерчантом и не могут нести ответственность за его действия.'}
            </span>
          </div>
        </div>

        {/* Right Side: Status / Payment Selection */}
        {order.status === 'created' && (
          <div className="border-t lg:border-t-0 lg:border-l border-zinc-600/30 flex flex-col flex-1 gap-1.5 w-full rounded-3xl bg-zinc-800/70 p-3">
            <span className="text-white font-bold text-lg -mt-1">
              {lang?.pay_select_method || 'Выберите способ оплаты:'}
            </span>
            <div className="grid grid-cols-2 gap-3 w-full mt-1.5">
              {gateways.map((gateway) => {
                const themeBg = getThemeBgClass(gateway.theme_color);
                const isRedirecting = redirectingGatewayId === gateway.id;

                if (gateway.is_disabled) {
                  return (
                    <div
                      key={gateway.id}
                      className="border border-zinc-600/30 relative group shrink-0 p-1.5 flex items-center gap-1.5 justify-center bg-zinc-800/70 rounded-3xl shadow-lg cursor-not-allowed opacity-80"
                    >
                      <div className={`shadow-2xl h-14 w-14 lg:h-16 lg:w-16 p-1.5 rounded-3xl shrink-0 flex items-center justify-center ${themeBg}`}>
                        <img alt={gateway.name} src={gateway.image} className="h-full w-full object-contain" />
                      </div>
                      <div className="flex flex-col justify-center flex-grow min-w-0">
                        <span className="text-sm lg:text-base text-zinc-100 truncate">{gateway.description}</span>
                        <span className="text-xs text-zinc-400 truncate">{gateway.name}</span>
                        {merchant.fee_paid === 'user' && (
                          <span className="text-sm text-zinc-300">{gateway.final_amount} ₽</span>
                        )}
                      </div>
                      <div className="bg-zinc-800/90 backdrop-blur-sm rounded-3xl absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-zinc-100 text-center px-1.5 text-xs font-semibold">{gateway.name}</span>
                        <span className="text-zinc-300 text-center px-1.5 text-xs">{gateway.disabled_reason || 'от 250 ₽'}</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={gateway.id}
                    onClick={() => handleSelectGateway(gateway)}
                    className="border border-zinc-600/30 relative group shrink-0 p-1.5 flex items-center gap-1.5 justify-center bg-zinc-800/70 rounded-3xl shadow-lg hover:scale-105 active:scale-95 duration-300 cursor-pointer"
                  >
                    {merchant.fee_paid === 'user' && gateway.fee_text && (
                      <span className={`backdrop-blur-lg shadow-2xl px-1.5 py-0.5 rounded-full text-xs absolute -top-1.5 -right-1.5 duration-300 ${getFeeBadgeClass(gateway.fee_color)}`}>
                        {gateway.fee_text}
                      </span>
                    )}

                    <div className={`shadow-2xl h-14 w-14 lg:h-16 lg:w-16 p-1.5 rounded-3xl shrink-0 duration-300 flex items-center justify-center ${themeBg}`}>
                      {isRedirecting ? (
                        <svg className="w-10 h-10 inline animate-spin fill-purple-500" viewBox="0 0 48 48">
                          <path d="M 24 4 A 1.50015 1.50015 0 1 0 24 7 C 30.255882 7 35.765936 10.406785 38.703125 15.455078 A 1.5005776 1.5005776 0 1 0 41.296875 13.945312 C 37.834064 7.9936061 31.344118 4 24 4 z" />
                        </svg>
                      ) : (
                        <img alt={gateway.name} src={gateway.image} className="h-full w-full object-contain" />
                      )}
                    </div>

                    <div className="flex flex-col justify-center flex-grow min-w-0">
                      <span className="text-sm lg:text-base text-zinc-100 truncate">{gateway.description}</span>
                      <span className="text-xs text-zinc-400 truncate">{gateway.name}</span>
                      {merchant.fee_paid === 'user' && (
                        <span className="text-sm text-zinc-300">{gateway.final_amount} ₽</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {order.status === 'pending' && (
          <div className="relative border-t lg:border-t-0 lg:border-l border-zinc-600/30 flex flex-col flex-1 gap-2.5 w-full rounded-3xl bg-zinc-800/70 p-3">
            <span className={`font-bold text-2xl text-amber-500 ${nauryzFont.className}`}>
              {lang?.pay_pending_title || 'Ожидание оплаты'}
            </span>

            {gateway_pending && (
              <div className="flex items-center justify-center w-full my-2">
                <div className={`animate-pulse h-24 w-24 flex items-center justify-center rounded-full border border-zinc-600/30 ${getThemeBgClass(gateway_pending.theme_color)}`}>
                  <img className="h-16 w-16 object-contain" src={gateway_pending.image} alt={gateway_pending.name} />
                </div>
              </div>
            )}

            <span className="text-zinc-200 text-sm">
              {lang?.pay_pending_auto_update || 'Страница будет автоматически обновлена.'}
            </span>
            <span className="text-zinc-300 text-xs">
              {lang?.pay_pending_notice || 'Обработка может занять до 15 минут, если статус заказа не изменился, а с вашего счёта были списаны деньги - свяжитесь с поддержкой.'}
            </span>

            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              {order.gateway_url ? (
                <a
                  href={order.gateway_url}
                  className="border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-2 text-base lg:text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-3xl w-full shadow text-center"
                >
                  В {gateway_pending?.name || 'платёжную систему'}
                </a>
              ) : (
                <button
                  disabled
                  className="border border-zinc-600/30 opacity-50 bg-zinc-700 text-zinc-400 rounded-3xl w-full py-2 cursor-not-allowed"
                >
                  В платёжную систему
                </button>
              )}

              <button
                onClick={handleChangeMethod}
                className="border border-zinc-600/30 flex items-center justify-center gap-3 px-4 py-2 text-base lg:text-lg duration-300 bg-zinc-700 text-zinc-400 cursor-not-allowed opacity-50 rounded-3xl w-full shadow"
              >
                {lang?.pay_change_method || 'Изменить способ'}
              </button>
            </div>
          </div>
        )}

        {order.status === 'paid' && (
          <div className="relative border-t lg:border-t-0 lg:border-l border-zinc-600/30 flex flex-col flex-1 gap-2 w-full rounded-3xl bg-zinc-800/70 p-3">
            <span className={`font-bold text-2xl text-emerald-500 ${nauryzFont.className}`}>
              {lang?.pay_paid_title || 'Заказ оплачен'}
            </span>
            <span className="text-zinc-100">{lang?.pay_paid_desc || 'Спасибо, платёж успешно обработан.'}</span>
            <span className="text-zinc-200 text-sm">{lang?.pay_paid_subdesc || 'Вы можете закрыть данную страницу или перейти на сайт мерчанта.'}</span>
            <span className="text-zinc-300 text-xs">{lang?.pay_paid_processing_notice || 'Обработка со стороны мерчанта может занять некоторое время.'}</span>
            {merchant.s_url && (
              <a
                href={getSuccessUrl()}
                className="mt-2 border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-2 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-3xl w-full shadow text-center"
              >
                {lang?.pay_to_store || 'В магазин'}
              </a>
            )}
          </div>
        )}

        {order.status === 'failed' && (
          <div className="relative border-t lg:border-t-0 lg:border-l border-zinc-600/30 flex flex-col flex-1 gap-2 w-full rounded-3xl bg-zinc-800/70 p-3">
            <span className={`font-bold text-2xl text-red-500 ${nauryzFont.className}`}>
              {lang?.pay_failed_title || 'Заказ отменён'}
            </span>
            <span className="text-zinc-100">{lang?.pay_failed_desc || 'Операция была отменена, средства не были списаны.'}</span>
            <span className="text-zinc-200 text-sm">{lang?.pay_failed_subdesc || 'Вы можете закрыть данную страницу или перейти на сайт мерчанта.'}</span>
            <span className="text-zinc-300 text-xs">{lang?.pay_paid_processing_notice || 'Обработка со стороны мерчанта может занять некоторое время.'}</span>
            {merchant.e_url && (
              <a
                href={getFailedUrl()}
                className="mt-2 border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-2 text-lg duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 text-zinc-100 rounded-3xl w-full shadow text-center"
              >
                {lang?.pay_to_store || 'В магазин'}
              </a>
            )}
          </div>
        )}

        {order.status === 'refunded' && (
          <div className="relative border-t lg:border-t-0 lg:border-l border-zinc-600/30 flex flex-col flex-1 gap-2 w-full rounded-3xl bg-zinc-800/70 p-3">
            <span className={`font-bold text-2xl text-amber-500 ${nauryzFont.className}`}>
              {lang?.pay_refunded_title || 'Заказ возвращён'}
            </span>
            <span className="text-zinc-100">{lang?.pay_refunded_desc || 'Операция была отменена, допускается возможность вернуть средства отправителю.'}</span>
            <span className="text-zinc-200 text-sm">{lang?.pay_refunded_subdesc || 'Оператор технической поддержки принял решение отменить операцию, так как счёл её рискованной.'}</span>
            <span className="text-zinc-300 text-xs">{lang?.pay_refunded_notice || 'Свяжитесь с технической поддержкой для уточнения деталей. Средства за заказ могут быть возвращены на Ancial Wallet или в криптовалюте, в некоторых случаях в возврате может быть отказано.'}</span>
            <span className="text-zinc-400 text-xs">{lang?.pay_refunded_disclaimer || 'Настоящий текст не подтверждает факт совершения оплаты или возможность получения возмещения за заказ как мерчанту, так и пользователю. Конечное решение о возврате средств принимает техническая поддержка.'}</span>
          </div>
        )}

        {order.status === 'finished' && (
          <div className="relative border-t lg:border-t-0 lg:border-l border-zinc-600/30 flex flex-col flex-1 gap-2 w-full rounded-3xl bg-zinc-800/70 p-3">
            <span className={`font-bold text-2xl text-lime-500 ${nauryzFont.className}`}>
              {lang?.pay_finished_title || 'Заказ выплачен'}
            </span>
            <span className="text-zinc-100">{lang?.pay_finished_desc || 'Средства за заказ были выплачены.'}</span>
            <span className="text-zinc-200 text-sm">{lang?.pay_finished_subdesc || 'Возврат средств отправителю в случае выплаты заказа мерчанту не предусмотрен. Если вас обманули - обратитесь в поддержку.'}</span>
          </div>
        )}

        {!['created', 'pending', 'paid', 'failed', 'refunded', 'finished'].includes(order.status) && (
          <div className="border-t lg:border-t-0 lg:border-l border-zinc-600/30 flex flex-col flex-1 gap-1.5 w-full rounded-3xl bg-zinc-800/70 p-3">
            <span className={`font-bold text-2xl text-white ${nauryzFont.className}`}>
              {lang?.pay_unknown_status || 'Неизвестный статус заказа'}
            </span>
            <span className="text-zinc-100">{lang?.pay_unknown_status_desc || 'Пожалуйста, проверьте правильность ссылки или обратитесь в поддержку.'}</span>
          </div>
        )}

        {/* Loading Overlay when redirecting to payment gateway */}
        {redirectingGatewayId && (
          <div className="w-full h-full absolute inset-0 rounded-3xl flex flex-col gap-3 items-center justify-center bg-zinc-900/90 backdrop-blur-lg z-50">
            <svg className="w-10 h-10 inline animate-spin fill-purple-500" viewBox="0 0 48 48">
              <path d="M 24 4 A 1.50015 1.50015 0 1 0 24 7 C 30.255882 7 35.765936 10.406785 38.703125 15.455078 A 1.5005776 1.5005776 0 1 0 41.296875 13.945312 C 37.834064 7.9936061 31.344118 4 24 4 z" />
            </svg>
            <span className="text-zinc-100">
              {lang?.pay_redirecting || 'Перенаправляем на'} {redirectingGatewayName}...
            </span>
          </div>
        )}
      </div>

      {/* Footer Branding & Links */}
      <div className="flex items-center justify-center mt-3 flex-wrap gap-6">
        <div className="flex items-center justify-center">
          <img src="/img/logos/zeni.png" alt="ZeniFlow" className="w-10" />
          <div className="flex flex-col items-start justify-center">
            <span className={`text-lg text-lime-500 ${nauryzFont.className}`} style={{ marginTop: 0 }}>zENIFLOW</span>
            <span className="text-zinc-300 text-xs -mt-2">leap ahead</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <img src="/img/zypo/logo-rounded.webp" alt="Zypo" className="w-8 rounded-xl" />
          <div className="flex flex-col items-start justify-center">
            <img src="/img/zypo/letter.svg" className="h-4 mt-1" />
            <span className="text-zinc-300 text-xs">flow as one</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 lg:gap-6 p-3 pt-1.5 text-xs flex-wrap">
        <Link
          href="/about/contacts"
          className="shrink-0 text-zinc-500 hover:text-zinc-300 active:scale-95 cursor-pointer duration-300"
        >
          {lang?.pay_support || 'Поддержка'}
        </Link>
        <Link
          href="/about/legal"
          className="shrink-0 text-zinc-500 hover:text-zinc-300 active:scale-95 cursor-pointer duration-300"
        >
          {lang?.pay_terms || 'Условия использования'}
        </Link>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://pay.ancial.ru/"
          className="shrink-0 text-zinc-500 hover:text-zinc-300 active:scale-95 cursor-pointer duration-300"
        >
          {lang?.pay_connect || 'Подключиться'}
        </a>
      </div>
    </div>
  );
}
