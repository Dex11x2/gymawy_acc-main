import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// تسجيل Service Worker (PWA — تثبيت + دعم offline أساسي)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* تجاهل */ });
  });
}
