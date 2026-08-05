/* Service Worker لإشعارات Firebase على الويب/PWA (يستقبلها والمتصفح/التطبيق مقفول).
   Firebase بيسجّله على نطاق خاص فمابيتعارضش مع sw.js الأساسي. */
importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBvVHQseDYe3t0Ai2kSuJlimrKtbx0HYUI',
  authDomain: 'gymmawy-3f96c.firebaseapp.com',
  projectId: 'gymmawy-3f96c',
  storageBucket: 'gymmawy-3f96c.firebasestorage.app',
  messagingSenderId: '735748938127',
  appId: '1:735748938127:web:0a20924f487a9dc16993fa',
});

// رسائل الإشعارات (notification) بتتعرض تلقائيًا في الخلفية.
firebase.messaging();
