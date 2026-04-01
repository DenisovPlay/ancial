'use client';

import { useEffect, useState } from 'react';

interface FirebaseMessaging {
  messaging: any;
  ready: boolean;
  error: string | null;
}

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyASzxKce3_K8UU0tq-Z6FP_9XIP4v491Rw',
  authDomain: 'ancial-notification.firebaseapp.com',
  projectId: 'ancial-notification',
  storageBucket: 'ancial-notification.appspot.com',
  messagingSenderId: '952168193669',
  appId: '1:952168193669:web:6b238d3552d90280cfd3ec',
  vapidKey: 'BBYIPhDqaKhcpjK0XIAfaNRJSva0kC68oDyGTGEH8S0QuBKwyt--yZxIYfRxCdBr-_QFJW_hrgfRUHZSvf8ivk4',
};

declare global {
  interface Window {
    firebase?: any;
  }
}

export function useFirebaseMessaging(): FirebaseMessaging {
  const [messaging, setMessaging] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initFirebase = () => {
      // Проверяем, загружен ли Firebase
      if (!window.firebase) {
        // Загружаем firebase-app-compat
        const appScript = document.createElement('script');
        appScript.src = 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app-compat.js';
        
        appScript.onload = () => {
          // Загружаем firebase-messaging-compat
          const msgScript = document.createElement('script');
          msgScript.src = 'https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging-compat.js';
          
          msgScript.onload = () => {
            if (!mounted) return;
            
            try {
              // Инициализируем Firebase
              window.firebase.initializeApp(FIREBASE_CONFIG);
              const msg = window.firebase.messaging();
              setMessaging(msg);
              setReady(true);
            } catch (err) {
              console.error('Firebase init error:', err);
              setError(err instanceof Error ? err.message : 'Firebase initialization failed');
            }
          };
          
          document.head.appendChild(msgScript);
        };
        
        document.head.appendChild(appScript);
      } else {
        // Firebase уже загружен
        try {
          const app = window.firebase.apps?.[0] || window.firebase.initializeApp(FIREBASE_CONFIG);
          const msg = window.firebase.messaging(app);
          setMessaging(msg);
          setReady(true);
        } catch (err) {
          console.error('Firebase init error:', err);
          setError(err instanceof Error ? err.message : 'Firebase initialization failed');
        }
      }
    };

    initFirebase();

    return () => {
      mounted = false;
    };
  }, []);

  return { messaging, ready, error };
}
