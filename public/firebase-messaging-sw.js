const SW_VERSION = '1.2';

importScripts("https://www.gstatic.com/firebasejs/12.4.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyASzxKce3_K8UU0tq-Z6FP_9XIP4v491Rw",
  authDomain: "ancial-notification.firebaseapp.com",
  projectId: "ancial-notification",
  messagingSenderId: "952168193669",
  appId: "1:952168193669:web:6b238d3552d90280cfd3ec"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.data?.title || 'Ancial';
  const options = {
    body: payload.data?.body || 'Новое уведомление',
    icon: payload.data?.icon || '/includes/img/anlite/anlogo.webp',
    badge: '/includes/img/anlite/anlogo.webp',
    tag: 'ancial-notification',
    data: {
      url: payload.data?.click_action || 'https://ancial.ru/'
    }
  };
  
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || 'https://ancial.ru/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.indexOf('ancial.ru') !== -1 && 'focus' in client) {
          return client.focus().then(() => client.navigate(urlToOpen));
        }
      }
      // Если не нашли — открываем новое окно
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
