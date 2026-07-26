'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { AncialAPI, type LinkGuardAnalysis } from '../lib/api-v2';

function RedirectContentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawLink = searchParams.get('link') || searchParams.get('url') || '';
  const { lang } = useAuth();

  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<LinkGuardAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!rawLink) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    AncialAPI.checkLinkGuard(rawLink)
      .then((data) => {
        if (isMounted) {
          setAnalysis(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('LinkGuard check failed:', err);
          setError(err instanceof Error ? err.message : 'Не удалось проверить ссылку');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [rawLink]);

  const canRedirect = analysis ? !analysis.wrongDomain && !analysis.blockRecommended : false;
  const targetUrl = analysis?.finalUrl || analysis?.normalizedUrl || rawLink;

  const level = analysis?.level || 'safe';
  const score = analysis?.score ?? 0;

  let riskTitle = lang?.redirect_safe_title || 'Риск низкий';
  let riskLead = lang?.redirect_safe_lead || 'Алгоритмы не нашли угроз, но сохраняйте бдительность.';
  let badgeColor = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
  let iconName = 'IC-check';

  if (level === 'danger') {
    riskTitle = lang?.redirect_danger_title || 'Высокий риск';
    riskLead = lang?.redirect_danger_lead || 'Сайт выглядит опасным. Переход заблокирован.';
    badgeColor = 'bg-red-500/10 border-red-500/30 text-red-400';
    iconName = 'IC-warning';
  } else if (level === 'warning') {
    riskTitle = lang?.redirect_warning_title || 'Подозрительный риск';
    riskLead = lang?.redirect_warning_lead || 'Есть риск-маркеры. Переход возможен, но крайне не рекомендуется.';
    badgeColor = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
    iconName = 'IC-warning';
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center p-3">
      <div className="flex w-full max-w-xl flex-col gap-3">
        {/* Header box */}
        <div className="pb-20 flex items-center gap-3 rounded-3xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center">
            <img alt="Zypo Logo" className="h-14 w-14" src="/img/zypo/logo-rounded.webp" />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-xl font-bold text-white lg:text-2xl">
              {lang?.redirect_title || 'Переход на сторонний ресурс'}
            </h1>
            <p className="text-xs text-zinc-400 lg:text-sm">
              {lang?.redirect_subtitle || 'Проверка безопасности ссылки перед открытием'}
            </p>
          </div>
        </div>

        {/* Target link box */}
        <div className="-mt-20 flex flex-col gap-1 rounded-3xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-2xl backdrop-blur-xl">
          <span className="text-xs text-zinc-400">{lang?.redirect_link_label || 'Ссылка'}</span>
          <div className="break-all text-sm font-medium text-white lg:text-base">
            {rawLink ? decodeURIComponent(rawLink) : (lang?.not_found || 'Не указана')}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-xl">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            <span className="text-sm text-zinc-400">{lang?.loading || 'Проверка безопасности...'}</span>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="flex flex-col gap-2 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-400 shadow-2xl">
            <div className="text-base font-bold">Ошибка проверки</div>
            <div className="text-xs">{error}</div>
          </div>
        )}

        {/* Analysis Result Card */}
        {!loading && analysis && (
          <div className={`flex flex-col gap-3 rounded-3xl border ${badgeColor} p-5 shadow-2xl backdrop-blur-xl`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="h-6 w-6 fill-current">
                  <use href={`#${iconName}`} />
                </svg>
                <span className="text-lg font-bold">
                  {riskTitle} ({score})
                </span>
              </div>
              {analysis.redirectHops > 0 && (
                <span className="rounded-full bg-zinc-800/80 px-2.5 py-1 text-xs text-zinc-300">
                  Редиректов: {analysis.redirectHops}
                </span>
              )}
            </div>

            <p className="text-sm leading-relaxed opacity-90">{riskLead}</p>

            {analysis.finalUrl && analysis.finalUrl !== analysis.normalizedUrl && (
              <div className="break-all text-xs opacity-80">
                <span className="font-semibold">Финальный URL: </span>
                {analysis.finalUrl}
              </div>
            )}

            {/* Reasons List */}
            {analysis.reasons && analysis.reasons.length > 0 && (
              <div className="mt-2 flex flex-col gap-1.5">
                <span className="text-xs font-semibold opacity-75">Факторы риска:</span>
                <ul className="flex flex-col gap-1.5">
                  {analysis.reasons.map((reason, idx) => (
                    <li
                      key={idx}
                      className="rounded-2xl border border-zinc-700/40 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-200"
                    >
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {!loading && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  router.back();
                } else {
                  router.push('/');
                }
              }}
              className="flex h-12 items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-900 text-sm font-bold text-white transition-all hover:bg-zinc-800 active:scale-95"
            >
              {lang?.redirect_go_back || 'Назад'}
            </button>

            {canRedirect && targetUrl ? (
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 items-center justify-center rounded-3xl bg-purple-600 text-sm font-bold text-white shadow-lg transition-all hover:bg-purple-500 active:scale-95"
              >
                {lang?.redirect_proceed || 'Перейти на сайт'}
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex h-12 items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-950 text-sm font-bold text-zinc-600"
              >
                {lang?.redirect_blocked || 'Заблокировано'}
              </button>
            )}
          </div>
        )}

        {/* Disclaimer Footer */}
        <p className="px-2 text-center text-xs leading-relaxed text-zinc-500">
          {lang?.redirect_disclaimer ||
            'Zypo не несёт ответственности за содержимое сторонних ресурсов. Будьте осторожны при вводе паролей и персональных данных.'}
        </p>
      </div>
    </div>
  );
}

export default function RedirectContent() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      }
    >
      <RedirectContentInner />
    </Suspense>
  );
}
