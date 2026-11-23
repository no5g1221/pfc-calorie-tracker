import { precacheAndRoute } from 'workbox-precaching';

interface SwWindowClient {
  url: string;
  focus?: () => Promise<SwWindowClient>;
}

interface SwExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}

interface SwPushEvent extends SwExtendableEvent {
  data?: {
    json(): unknown;
    text(): string;
  } | null;
}

interface SwNotificationEvent extends SwExtendableEvent {
  notification: Notification & {
    data?: {
      url?: string;
    };
  };
}

interface SwGlobalScope {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
  skipWaiting(): Promise<void>;
  clients: {
    claim(): Promise<void>;
    matchAll(options?: { type?: 'window' | 'all'; includeUncontrolled?: boolean }): Promise<SwWindowClient[]>;
    openWindow(url: string): Promise<unknown>;
  };
  registration: {
    showNotification(title: string, options?: NotificationOptions): Promise<void>;
  };
  location: Location;
  addEventListener(type: 'install' | 'activate', listener: (event: SwExtendableEvent) => void): void;
  addEventListener(type: 'push', listener: (event: SwPushEvent) => void): void;
  addEventListener(type: 'notificationclick', listener: (event: SwNotificationEvent) => void): void;
}

declare const self: SwGlobalScope;

// VitePWA (injectManifest) によりビルド時にマニフェストが注入される
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

interface PushPayloadShape {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  data?: {
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
  };
  notification?: {
    title?: string;
    body?: string;
  };
}

self.addEventListener('push', (event) => {
  let payload: PushPayloadShape = {};
  try {
    if (event.data) {
      payload = event.data.json() as PushPayloadShape;
    }
  } catch {
    const rawText = event.data?.text() || '';
    payload = { body: rawText };
  }

  const title =
    payload.data?.title || payload.notification?.title || payload.title || 'パプリカPFC';
  const body =
    payload.data?.body ||
    payload.notification?.body ||
    payload.body ||
    '今日の食事をゆるく記録しよう 🌿';
  const url = payload.data?.url || payload.url || '/';
  const tag = payload.data?.tag || payload.tag || 'pfc-reminder';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/favicon.png',
      tag,
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clientsList) {
        if (client.url.startsWith(self.location.origin) && client.focus) {
          await client.focus();
          return;
        }
      }

      await self.clients.openWindow(targetUrl);
    })()
  );
});
