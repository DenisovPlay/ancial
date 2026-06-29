'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { authFetch } from '../../lib/auth-fetch';
import { AncialAPI } from '../../lib/api-v2';
import { useFirebaseMessaging, FIREBASE_CONFIG } from '../../lib/useFirebaseMessaging';
import { SvgIcon } from '../../feed/editor-shared';

interface PushDevice {
  brand?: string;
  model?: string;
  os?: string;
  osver?: string;
  client?: string;
}

export default function NotificationsSettingsContent() {
  const router = useRouter();
  const { user, isAuthenticated, checkAuth, lang } = useAuth();
  const { showNote } = useNotification();
  const { messaging, ready: firebaseReady, error: firebaseError } = useFirebaseMessaging();

  const [pushDevice, setPushDevice] = useState<PushDevice | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const hasPush = Boolean(user?.pushsid && user.pushsid !== '0');

  useEffect(() => {
    if (user?.pushdevice) {
      try {
        const device = typeof user.pushdevice === 'string' 
          ? JSON.parse(user.pushdevice) 
          : user.pushdevice;
        setPushDevice(device);
      } catch {
        setPushDevice(null);
      }
    }
  }, [user?.pushdevice]);

  useEffect(() => {
    if (firebaseError) {
      console.error('Firebase error:', firebaseError);
    }
  }, [firebaseError]);

  const detectDevice = useCallback(() => {
    // Детекция устройства через userAgent (как в PHP версии)
    const ua = navigator.userAgent;
    let os = 'Unknown';
    let osver = '';
    let brand = 'Unknown';
    let model = 'Unknown';
    let client = 'Web Browser';

    // Определяем OS
    if (/iPhone OS ([0-9_]+)/i.test(ua)) {
      os = 'iOS';
      osver = RegExp.$1.replace(/_/g, '.');
      brand = 'Apple';
      model = 'iPhone';
    } else if (/iPad.*OS ([0-9_]+)/i.test(ua)) {
      os = 'iOS';
      osver = RegExp.$1.replace(/_/g, '.');
      brand = 'Apple';
      model = 'iPad';
    } else if (/Mac OS X ([0-9_]+)/i.test(ua)) {
      os = 'Mac';
      osver = RegExp.$1.replace(/_/g, '.');
      brand = 'Apple';
      model = 'Mac';
    } else if (/Android ([0-9.]+)?/i.test(ua)) {
      os = 'Android';
      osver = RegExp.$1 || '';
      // Пытаемся определить устройство Android
      const deviceMatch = ua.match(/;\s*([^;)]+)\s*Build/i);
      if (deviceMatch) {
        brand = 'Android';
        model = deviceMatch[1];
      } else {
        brand = 'Android';
        model = 'Device';
      }
    } else if (/Windows NT ([0-9.]+)/i.test(ua)) {
      os = 'Windows';
      osver = RegExp.$1;
      brand = 'Windows';
      model = 'PC';
    }

    // Определяем браузер
    if (/Chrome\/([0-9.]+)/i.test(ua)) {
      client = `Chrome ${RegExp.$1}`;
    } else if (/Safari\/([0-9.]+)/i.test(ua) && !/Chrome/i.test(ua)) {
      client = `Safari ${RegExp.$1}`;
    } else if (/Firefox\/([0-9.]+)/i.test(ua)) {
      client = `Firefox ${RegExp.$1}`;
    } else if (/Edg\/([0-9.]+)/i.test(ua)) {
      client = `Edge ${RegExp.$1}`;
    }

    return { brand, model, os, osver, client };
  }, []);

  const ensureServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error(lang?.service_worker_not_supported || 'Service Worker не поддерживается в этом браузере');
    }
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      updateViaCache: 'none',
      scope: '/',
    });
    await reg.update();
    await navigator.serviceWorker.ready;
    return reg;
  }, []);

  const setupNotifications = useCallback(async () => {
    try {
      if (!messaging) {
        showNote({
          content: lang?.firebase_not_initialized || 'Firebase ещё не инициализирован. Попробуйте перезагрузить страницу.',
          type: 'error',
          time: 5,
        });
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setIsDetecting(true);
        const registration = await ensureServiceWorker();
        const token = await window.firebase.messaging().getToken(messaging, {
          vapidKey: FIREBASE_CONFIG.vapidKey,
          serviceWorkerRegistration: registration,
        });

        const device = detectDevice();
        console.log('Device info:', device);

        let result: any;
        try {
          result = await AncialAPI.updateProfile({
            pushsid: token,
            'device[brand]': device.brand,
            'device[model]': device.model,
            'device[os]': device.os,
            'device[osver]': device.osver,
            'device[client]': device.client,
          });
        } catch (error) {
          console.error('API error:', error);
          throw new Error('Invalid response from server');
        }

        // Firebase Admin SDK возвращает { name: 'projects/...' } при успехе
        if (result?.success || result?.message || result?.name) {
          showNote({
            content: lang?.connected || 'Подключено!',
            type: 'success',
            time: 3,
          });
          await checkAuth();
          setTimeout(() => router.push('/settings/notifications'), 1000);
        } else {
          showNote({
            content: lang?.connection_error || 'Ошибка при подключении',
            type: 'error',
            time: 5,
          });
        }
      }
    } catch (err) {
      console.error('Ошибка:', err);
      showNote({
        content: lang?.notification_connection_error || 'Ошибка при подключении уведомлений',
        type: 'error',
        time: 5,
      });
    } finally {
      setIsDetecting(false);
    }
  }, [messaging, ensureServiceWorker, detectDevice, showNote, checkAuth, router]);

  const cancelNotifications = useCallback(async () => {
    try {
      let result: any;
      try {
        result = await AncialAPI.updateProfile({ pushsid: '0' });
      } catch {
        throw new Error('Invalid response from server');
      }

      // Firebase Admin SDK возвращает { name: 'projects/...' } при успехе
      if (result?.success || result?.message || result?.name) {
        showNote({
          content: lang?.disconnected || 'Отключено',
          type: 'success',
          time: 3,
        });
        await checkAuth();
        router.push('/settings/notifications');
      } else {
        showNote({
          content: lang?.disconnection_error || 'Ошибка при отключении',
          type: 'error',
          time: 5,
        });
      }
    } catch (err) {
      console.error('Ошибка:', err);
      showNote({
        content: lang?.notification_disconnection_error || 'Ошибка при отключении уведомлений',
        type: 'error',
        time: 5,
      });
    }
  }, [showNote, checkAuth, router]);

  const getDeviceIcon = () => {
    const os = pushDevice?.os?.toLowerCase() || '';
    
    if (os.includes('ios')) {
      return (
        <SvgIcon className="w-12 h-12 fill-lime-500" id="IC-mobile" viewBox="0 0 48 48" />
      );
    } else if (os.includes('mac')) {
      return (
        <SvgIcon className="w-12 h-12 fill-lime-500" id="IC-laptop" viewBox="0 0 48 48" />
      );
    } else if (os.includes('android')) {
      return (
        <SvgIcon className="w-12 h-12 fill-lime-500" id="IC-android" viewBox="0 0 48 48" />
      );
    } else if (os.includes('win')) {
      return (
        <SvgIcon className="w-12 h-12 fill-lime-500" id="IC-windows" viewBox="0 0 48 48" />
      );
    } else {
      return (
        <SvgIcon className="w-12 h-12 fill-lime-500" id="IC-notification" viewBox="0 0 48 48" />
      );
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <p className="text-zinc-300">{lang?.auth_required || 'Требуется авторизация...'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center gap-3 pb-3 w-full bg-gradient-to-b from-amber-400/25 md:from-transparent via-transparent to-transparent">
      {/* Header */}
      <div className="w-full flex items-center justify-center gap-3 px-3 lg:px-0 sticky top-0 pt-3 bg-gradient-to-b from-black via-black/90 to-transparent" style={{ zIndex: 99 }}>
        <div className="w-full max-w-3xl flex items-center gap-3">
          <span onClick={() => router.push('/settings')} className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer">
              <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <use href={`#IC-chevron-left`}></use>
              </svg> 
              {lang?.notif || 'Уведомления'}
          </span>
        </div>
      </div>

      {/* Device Info or Info Text */}
      {hasPush && pushDevice ? (
        <>
          <div className="flex items-center px-3 lg:px-0 w-full justify-center">
            <div className="rounded-full bg-zinc-800/90 flex items-center gap-1.5 p-1 max-w-3xl w-full border border-zinc-600/30">
              <div className="w-16 h-16 shrink-0 bg-lime-500/25 rounded-full flex items-center justify-center">
                {getDeviceIcon()}
              </div>
              <div className="flex flex-col w-full">
                <span className="text-xl lg:text-2xl font-bold">
                  {pushDevice.brand || 'Unknown'} {pushDevice.model || ''}
                </span>
                <span className="lg:text-lg text-zinc-300">
                  {pushDevice.os || ''} {pushDevice.osver || ''}, {pushDevice.client || ''}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center px-3 lg:px-0 w-full justify-center">
            <span className="w-full text-zinc-300 text-sm lg:text-base max-w-3xl">
              {lang?.push_activated || 'Push-уведомления активированы для этого устройства.'}
            </span>
          </div>
        </>
      ) : (
        <div className="flex items-center px-3 lg:px-0 w-full justify-center">
          <span className="w-full text-zinc-300 text-sm lg:text-base max-w-3xl">
            {lang?.enable_push_desc || 'Включите push-уведомления, чтобы получать уведомления о новых сообщениях и активностях.'}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center px-3 lg:px-0 w-full justify-center">
        <div className="grid grid-cols-2 gap-3 w-full max-w-3xl">
          {!hasPush ? (
            <button
              onClick={setupNotifications}
              disabled={isDetecting}
              className="border border-zinc-600/30 cursor-pointer col-span-2 flex items-center justify-center gap-3 px-4 py-1.5 duration-300 active:scale-95 bg-purple-700 hover:bg-purple-800 text-zinc-100 rounded-full w-full shadow disabled:opacity-50"
            >
              {isDetecting ? (
                <>
                  <SvgIcon className="w-5 h-5 fill-white animate-spin" id="IC-loader" viewBox="0 0 48 48" />
                  {lang?.connecting || 'Подключение...'}
                </>
              ) : (
                lang?.activate_notifications || 'Активировать уведомления'
              )}
            </button>
          ) : (
            <>
              <button
                onClick={cancelNotifications}
                className="border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-1.5 duration-300 active:scale-95 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-full w-full shadow"
              >
                {lang?.disable || 'Отключить'}
              </button>
              <button
                onClick={setupNotifications}
                disabled={isDetecting}
                className="border border-zinc-600/30 cursor-pointer flex items-center justify-center gap-3 px-4 py-1.5 duration-300 active:scale-95 bg-purple-700 hover:bg-purple-800 text-zinc-100 rounded-full w-full shadow disabled:opacity-50"
              >
                {isDetecting ? (lang?.connecting || 'Подключение...') : (lang?.change_device || 'Сменить устройство')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="lg:hidden"><br /><br /><br /><br /></div>
    </div>
  );
}
