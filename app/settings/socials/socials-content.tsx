'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { AncialAPI } from '../../lib/api-v2';

// Helper to dynamically load external scripts
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script ${src}`));
    document.body.appendChild(script);
  });
}

export default function SocialsContent() {
  const router = useRouter();
  const { lang, user, isAuthenticated, isLoading: authLoading, checkAuth } = useAuth();
  const { showNote } = useNotification();

  const [isMounted, setIsMounted] = useState(false);
  const [tgWidgetKey, setTgWidgetKey] = useState(0);
  const [isUnlinkingTg, setIsUnlinkingTg] = useState(false);
  const [isUnlinkingYandex, setIsUnlinkingYandex] = useState(false);
  const [yandexLoading, setYandexLoading] = useState(true);
  const [yandexErrorText, setYandexErrorText] = useState<string | null>(null);

  const tgInitializedRef = useRef(false);
  const yandexInitializedRef = useRef(false);

  // Set isMounted to true on client-side mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset Telegram initialization flag when tgWidgetKey forces a reload
  useEffect(() => {
    tgInitializedRef.current = false;
  }, [tgWidgetKey]);

  // Redirect if not authenticated (client-side only)
  useEffect(() => {
    if (!isMounted || authLoading) return;
    if (!isAuthenticated) {
      router.push('/login?backurl=/settings/socials');
    }
  }, [isMounted, authLoading, isAuthenticated, router]);

  // Load Telegram Widget Script
  useEffect(() => {
    if (isMounted && !authLoading && isAuthenticated && user && !user.connected_telegram) {
      if (tgInitializedRef.current) return;
      const container = document.getElementById('telegram-widget-container');
      if (container) {
        tgInitializedRef.current = true;
        container.innerHTML = '';
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.async = true;
        script.setAttribute('data-telegram-login', 'ancialbot');
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-userpic', 'false');
        script.setAttribute('data-radius', '30');
        script.setAttribute('data-auth-url', 'https://ancial.ru/api/V2/oauth/Telegram.php?action=connect');
        script.setAttribute('data-request-access', 'write');
        container.appendChild(script);
      }
    }
  }, [isMounted, authLoading, isAuthenticated, user?.connected_telegram, tgWidgetKey]);

  // Load Yandex Suggest Script
  useEffect(() => {
    let active = true;
    if (isMounted && !authLoading && isAuthenticated && user && !user.connected_yacc) {
      if (yandexInitializedRef.current) return;
      yandexInitializedRef.current = true;
      setYandexLoading(true);
      loadScript('https://yastatic.net/s3/passport-sdk/autofill/v1/sdk-suggest-with-polyfills-latest.js')
        .then(() => {
          if (!active) return;
          const yandexBtn = document.getElementById('yandexbutton');
          if (!yandexBtn) return;

          yandexBtn.innerHTML = '';
          setYandexLoading(false);

          const YaAuthSuggest = (window as any).YaAuthSuggest;
          if (YaAuthSuggest) {
            YaAuthSuggest.init(
              {
                client_id: 'b9cad7a054c14c518c94de0183c3f000',
                response_type: 'token',
                redirect_uri: 'https://ancial.ru/api/V2/oauth/Yandex.php?action=connect'
              },
              'https://ancial.ru/api/V2/oauth/Yandex.php',
              {
                view: 'button',
                parentId: 'yandexbutton',
                buttonView: 'main',
                buttonTheme: 'light',
                buttonSize: 'm',
                buttonBorderRadius: 0
              }
            )
              .then((result: any) => result.handler())
              .then((data: any) => {
                if (!active) return;
                const responseData = data?.extraData;
                if (!responseData?.error) {
                  showNote({
                    content: lang?.yandexconnected || 'Аккаунты связаны!',
                    type: 'success',
                    time: 5
                  });
                  checkAuth();
                } else {
                  showNote({
                    content: responseData.error,
                    type: 'error',
                    time: 5
                  });
                  setYandexErrorText(lang?.updatetryagain || 'Обновите страницу и попробуйте ещё раз');
                  yandexInitializedRef.current = false;
                }
              })
              .catch((err: any) => {
                console.error('Yandex Suggestion error:', err);
                if (active) {
                  yandexInitializedRef.current = false;
                }
              });
          }
        })
        .catch((err) => {
          console.error(err);
          if (active) {
            setYandexLoading(false);
            yandexInitializedRef.current = false;
          }
        });
    }
    return () => {
      active = false;
    };
  }, [isMounted, authLoading, isAuthenticated, user?.connected_yacc, lang, checkAuth, showNote]);

  const handleDisconnectTelegram = async () => {
    if (isUnlinkingTg) return;
    setIsUnlinkingTg(true);
    try {
      const response = await AncialAPI.disconnectTelegram();
      showNote({
        content: response.message || lang?.telegramdiscon || 'Аккаунт Telegram отвязан',
        type: 'success',
        time: 5
      });
      await checkAuth();
      setTgWidgetKey(prev => prev + 1);
    } catch (error: any) {
      console.error(error);
      showNote({
        content: error.message || lang?.errorhappend || 'Произошла ошибка...',
        type: 'error',
        time: 5
      });
    } finally {
      setIsUnlinkingTg(false);
    }
  };

  const handleDisconnectYandex = async () => {
    if (isUnlinkingYandex) return;
    setIsUnlinkingYandex(true);
    try {
      const response = await AncialAPI.disconnectYandex();
      showNote({
        content: response.message || lang?.yandexdiscon || 'Yandex отвязан!',
        type: 'success',
        time: 5
      });
      await checkAuth();
      yandexInitializedRef.current = false;
    } catch (error: any) {
      console.error(error);
      showNote({
        content: error.message || lang?.errorhappend || 'Произошла ошибка...',
        type: 'error',
        time: 5
      });
    } finally {
      setIsUnlinkingYandex(false);
    }
  };

  // Memoize static containers to prevent React from unmounting/updating them
  const telegramContainer = useMemo(() => {
    return <div id="telegram-widget-container" className="flex justify-center items-center min-h-[40px] w-full" />;
  }, []);

  const yandexContainer = useMemo(() => {
    return <div className="rounded-full h-9 overflow-hidden w-full flex items-center justify-center relative min-h-[36px]" id="yandexbutton" />;
  }, []);

  if (!isMounted || authLoading || !isAuthenticated || !user) {
    return (
      <div className="w-full flex items-center justify-center min-h-[50vh]">
        <svg className="w-8 h-8 animate-spin fill-purple-500" viewBox="0 0 48 48">
          <use href="#IC-loader"></use>
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center gap-3 pb-3 w-full bg-gradient-to-b from-lime-400/25 md:from-transparent via-transparent to-transparent">
      {/* Sticky Header */}
      <div className="w-full flex items-center justify-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent z-40">
        <div className="w-full max-w-3xl flex items-center gap-3">
          <span
            onClick={() => router.push('/settings')}
            className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-3 cursor-pointer"
          >
            <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <use href="#IC-chevron-left"></use>
            </svg>
            {lang?.socialnetworks || 'Социальные сети'}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-3 w-full max-w-3xl px-3 lg:px-0">
        {/* Telegram Card */}
        <div className="border border-zinc-600/30 bg-zinc-800/90 w-full p-3 shadow rounded-3xl flex flex-col items-center min-h-[220px]">
          <div className="bg-blue-600 rounded-2xl p-3 h-12 w-12 text-white flex items-center justify-center relative">
            <img className="w-10 object-contain" src="/includes/img/anlite/socials/tg.png" alt="Telegram logo" />
          </div>
          <div className="flex flex-col w-full h-full items-center justify-center gap-2 mt-3 flex-grow">
            {/* Connected State */}
            <div className={`flex flex-col items-center justify-center w-full h-full gap-2 ${!user.connected_telegram ? 'hidden' : ''}`}>
              <span className="text-sm md:text-base text-zinc-400 text-center my-auto">
                {lang?.telegramconnected || 'Аккаунт Telegram подключён'}
              </span>
              <div className="flex-grow" />
              <button
                onClick={handleDisconnectTelegram}
                disabled={isUnlinkingTg}
                className="border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-1.5 duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-zinc-100 rounded-full w-full shadow mt-1.5 font-medium"
              >
                {isUnlinkingTg ? (
                  <svg className="w-5 h-5 animate-spin fill-white" viewBox="0 0 48 48">
                    <use href="#IC-loader"></use>
                  </svg>
                ) : (
                  lang?.unlink || 'Отвязать'
                )}
              </button>
            </div>

            {/* Disconnected State */}
            <div className={`flex flex-col items-center justify-center w-full h-full gap-2 ${user.connected_telegram ? 'hidden' : ''}`}>
              <span className="text-zinc-300 text-center my-auto text-sm md:text-base">
                {lang?.connecttelegram || 'Подключите аккаунт Telegram, чтобы ускорить вход.'}
              </span>
              {telegramContainer}
            </div>
          </div>
        </div>

        {/* Yandex Card */}
        <div className="border border-zinc-600/30 bg-zinc-800/90 w-full p-3 shadow rounded-3xl flex flex-col items-center min-h-[220px]">
          <div className="rounded-2xl h-12 w-12 flex items-center justify-center overflow-hidden">
            <img src="/includes/img/yandexlogo.png" className="w-12 h-12 shadow rounded-2xl object-cover" alt="Yandex logo" />
          </div>
          <div className="flex flex-col w-full items-center justify-center gap-2 mt-3 flex-grow">
            {/* Connected State */}
            <div className={`flex flex-col items-center justify-center w-full h-full gap-2 ${!user.connected_yacc ? 'hidden' : ''}`}>
              <span className="text-sm md:text-base text-zinc-400 text-center my-auto break-all">
                {(lang?.yaccconnected || 'Этот аккаунт связан с аккаунтом Yandex') + ': ' + user.connected_yacc}
              </span>
              <div className="flex-grow" />
              <button
                onClick={handleDisconnectYandex}
                disabled={isUnlinkingYandex}
                className="border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-1.5 duration-300 active:scale-95 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-zinc-100 rounded-full w-full shadow mt-1.5 font-medium"
              >
                {isUnlinkingYandex ? (
                  <svg className="w-5 h-5 animate-spin fill-white" viewBox="0 0 48 48">
                    <use href="#IC-loader"></use>
                  </svg>
                ) : (
                  lang?.unlink || 'Отвязать'
                )}
              </button>
            </div>

            {/* Disconnected State */}
            <div className={`flex flex-col items-center justify-center w-full h-full gap-2 ${user.connected_yacc ? 'hidden' : ''}`}>
              <span className="text-zinc-300 text-center my-auto text-sm md:text-base">
                {lang?.connyandextover || 'Подключите аккаунт Яндекс, чтобы подтвердить свою почту и телефон.'}
              </span>

              {/* Description and Info */}
              <span id="moreinfoyandex" className="text-xs text-zinc-400 text-center">
                {lang?.socialnetworksdesc2 || 'Здесь вы можете подключить свой Yandex для более быстрого входа. Для этого нажмите на кнопку ниже!'}
              </span>

              {yandexErrorText && (
                <span className="text-sm text-red-500 text-center">
                  {yandexErrorText}
                </span>
              )}

              <div className="w-full relative mt-2">
                {yandexContainer}
                {yandexLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-800/90 rounded-full">
                    <svg className="w-8 h-8 inline animate-spin fill-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                      <path d="M 24 4 A 1.50015 1.50015 0 1 0 24 7 C 30.255882 7 35.765936 10.406785 38.703125 15.455078 A 1.5005776 1.5005776 0 1 0 41.296875 13.945312 C 37.834064 7.9936061 31.344118 4 24 4 z"></path>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden"><br /><br /><br /><br /></div>
    </div>
  );
}
