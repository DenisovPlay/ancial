'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AncialAPI, type WalletMerchant, type WalletMerchantStats } from '../../lib/api-v2';

export default function MerchantContent() {
  const router = useRouter();
  const { lang, isAuthenticated, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [merchants, setMerchants] = useState<WalletMerchant[]>([]);
  const [stats, setStats] = useState<WalletMerchantStats>({
    total_merchants: 0,
    total_payments: 0,
    total_earned: 0
  });

  const strings = useMemo(() => {
    return {
      all: lang?.all || 'Все'
    };
  }, [lang]);

  const loadData = async (showLoading = false) => {
    if (showLoading && merchants.length === 0) setLoading(true);
    try {
      const res = await AncialAPI.getMerchants();
      const fetchedMerchants = res.merchants || [];
      const fetchedStats = res.stats || { total_merchants: 0, total_payments: 0, total_earned: 0 };
      setMerchants(fetchedMerchants);
      setStats(fetchedStats);
      setError(null);
      localStorage.setItem('wallet_merchants_cache', JSON.stringify({ merchants: fetchedMerchants, stats: fetchedStats }));
    } catch (err: any) {
      if (merchants.length === 0) setError(err.message || 'Ошибка загрузки панели мерчанта');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login?backurl=/wallet/merchant');
      return;
    }

    const cached = localStorage.getItem('wallet_merchants_cache');
    let hasCache = false;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.merchants)) {
          setMerchants(parsed.merchants);
          if (parsed.stats) setStats(parsed.stats);
          hasCache = true;
          setLoading(false);
        }
      } catch (e) {
        console.error('Failed to parse merchants cache', e);
      }
    }

    loadData(!hasCache);
  }, [authLoading, isAuthenticated]);

  const handleTopage = (path: string) => {
    router.push(path);
  };

  if (loading && merchants.length === 0) {
    return (
      <div className="p-3 lg:px-0 flex flex-col items-center gap-6 bg-black min-h-screen text-zinc-100">
        <div className="flex items-center gap-3 max-w-screen-2xl w-full pt-3">
          <span style={{ marginTop: '0.1rem' }} className="shrink-0 text-3xl font-bold bg-gradient-to-br from-lime-500 to-emerald-500 text-transparent bg-clip-text">
            Мерчант
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 w-full max-w-screen-2xl">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-zinc-900/20 border border-zinc-600/30 shadow rounded-3xl p-4 h-24 animate-pulse" />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full max-w-screen-2xl">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex flex-col gap-3 p-4 border border-zinc-600/30 bg-zinc-800/70 rounded-3xl h-28 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl h-14 w-14 bg-zinc-700/60 shrink-0" />
                <div className="flex flex-col gap-2 flex-grow">
                  <div className="h-4 w-24 bg-zinc-700/60 rounded" />
                  <div className="h-3 w-16 bg-zinc-700/60 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 lg:px-0 flex flex-col items-center gap-6 bg-black min-h-screen text-zinc-100">
      
      {/* Header / Title */}
      <div className="flex items-center gap-3 max-w-screen-2xl w-full pt-3">
        <span
          onClick={() => handleTopage('/wallet')}
          className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer"
        >
          <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path d="M 29.449219 4.9863281 A 1.50015 1.50015 0 0 0 28.423828 5.4550781 L 11.423828 22.955078 A 1.50015 1.50015 0 0 0 11.423828 25.044922 L 28.423828 42.544922 A 1.50015 1.50015 0 1 0 30.576172 40.455078 L 14.591797 24 L 30.576172 7.5449219 A 1.50015 1.50015 0 0 0 29.449219 4.9863281 z" />
          </svg>
          <span style={{ marginTop: '0.1rem' }} className="shrink-0 text-3xl font-bold bg-gradient-to-br from-lime-500 to-emerald-500 text-transparent bg-clip-text cutetext">
            Мерчант
          </span>
        </span>
        <div className="flex-grow" />
        <div className="flex-nowrap items-center gap-3 overflow-x-auto viewport px-3 lg:px-0 duration-300 hidden lg:flex">
          <button
            onClick={() => handleTopage('/wallet')}
            className="border border-zinc-600/30 shrink-0 flex items-center gap-3 text-zinc-300 bg-zinc-900/20 hover:bg-zinc-700 hover:text-white shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95 backdrop-blur-md backdrop-saturate-200"
          >
            Главная
          </button>
          <button
            onClick={() => handleTopage('/wallet/merchant')}
            className="border border-zinc-500 shrink-0 flex items-center gap-3 text-white bg-zinc-800 shadow rounded-3xl cursor-pointer py-1.5 px-3 duration-300 active:scale-95"
          >
            Мои мерчанты
          </button>
        </div>
      </div>

      {error && (
        <div className="text-red-500 bg-red-500/10 p-3 rounded-2xl border border-red-500/20 max-w-screen-2xl w-full text-center">
          {error}
        </div>
      )}

      {/* Stats Widgets */}
      <div className="flex gap-3 items-center w-full duration-300 max-w-screen-2xl">
        <span className="text-xl lg:text-3xl font-bold text-white flex-grow shrink-0 text-left">Статистика</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 w-full max-w-screen-2xl">
        <div className="bg-zinc-900/20 border border-zinc-600/30 shadow rounded-3xl p-4 duration-300 w-full text-left">
          <div className="text-3xl font-bold text-white">{stats.total_merchants}</div>
          <span className="text-zinc-400 text-sm">Всего мерчантов</span>
        </div>
        <div className="bg-zinc-900/20 border border-zinc-600/30 shadow rounded-3xl p-4 duration-300 w-full text-left">
          <div className="text-3xl font-bold text-white">{stats.total_payments}</div>
          <span className="text-zinc-400 text-sm">Всего платежей</span>
        </div>
        <div className="bg-zinc-900/20 border border-zinc-600/30 shadow rounded-3xl p-4 duration-300 w-full text-left">
          <div className="text-3xl font-bold text-white">{stats.total_earned} ₽</div>
          <span className="text-zinc-400 text-sm">Доступно для вывода</span>
        </div>
      </div>

      {/* Merchants Header */}
      <div className="flex gap-3 items-center w-full duration-300 max-w-screen-2xl">
        <span className="text-xl lg:text-3xl font-bold text-white flex-grow shrink-0 text-left">Мерчанты</span>
        <div className="flex flex-nowrap items-center gap-3 overflow-x-auto viewport duration-300">
          <button
            onClick={() => handleTopage('/wallet/merchant')}
            className="shrink-0 flex items-center gap-2 text-zinc-300 bg-zinc-900/20 border border-zinc-600/30 hover:bg-zinc-700 hover:text-white shadow rounded-3xl cursor-pointer py-1.5 px-3.5 duration-300 active:scale-95"
          >
            {strings.all}
          </button>
        </div>
      </div>

      {/* Merchants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full overflow-hidden duration-300 max-w-screen-2xl">
        {merchants.length > 0 ? (
          merchants.map((merchant) => {
            const isActive = merchant.status === 1;
            const statusBadge = isActive ? (
              <span className="border border-zinc-600/30 bg-green-500/25 text-green-500 px-1.5 py-0.5 text-xs rounded-full w-fit">
                Активен
              </span>
            ) : (
              <span className="border border-zinc-600/30 bg-red-500/25 text-red-500 px-1.5 py-0.5 text-xs rounded-full w-fit">
                Неактивен
              </span>
            );

            const callbackStatus = merchant.c_url ? 'Callback подключён' : '';

            return (
              <div
                key={merchant.id}
                onClick={() => handleTopage(`/wallet/merchant/about?id=${merchant.id}`)}
                className="relative flex flex-col gap-3 justify-center w-full p-4 border border-zinc-600/30 bg-zinc-800/70 hover:bg-zinc-700/50 duration-300 cursor-pointer active:scale-95 rounded-3xl text-left"
              >
                <div className="flex items-center gap-3">
                  <img src={merchant.img || '/includes/img/noavatar.png'} className="rounded-2xl h-14 w-14 object-cover" alt="Merchant Avatar" />
                  <div className="flex flex-col grow truncate">
                    <span className="text-lg font-bold text-white truncate">{merchant.name}</span>
                    <span className="text-zinc-400 text-xs truncate">ID: {merchant.id}</span>
                  </div>
                  <div className="shrink-0 flex items-start h-full">{statusBadge}</div>
                </div>
                
                <div className="flex items-center gap-1.5">
                  {callbackStatus && (
                    <>
                      <span className="text-zinc-400 text-xs truncate">{callbackStatus}</span>
                      <div className="rounded-full h-1 w-1 bg-zinc-500" />
                    </>
                  )}
                  <span className="text-zinc-400 text-xs truncate">{merchant.payments_count} платежей</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-zinc-400 py-10 text-center w-full">
            У вас пока нет созданных мерчантов.
          </div>
        )}
      </div>

    </div>
  );
}
