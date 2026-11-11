import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// PWA Service Worker 自動更新登録
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
  onRegisteredSW(_swScriptUrl, registration) {
    if (registration) {
      // 1分ごとに更新チェック
      setInterval(() => {
        registration.update();
      }, 60 * 1000);
      // アプリ前面復帰時にも即座に更新チェック
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update();
        }
      });
    }
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
