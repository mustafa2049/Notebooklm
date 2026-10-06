import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { isNativeApp } from './platform/native';
import App from './App';
import { StoreProvider } from './storage/store';
import './ui/styles.css';

// Kurulu Android/masaüstü uygulamasında dosyalar zaten cihazda; service worker gerekmez.
if (!isNativeApp()) registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
