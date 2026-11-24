import { getApp, getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';
import type { MealType, ReminderSettings, ReminderSlotKey } from '../types';

const REMINDER_STORAGE_KEY = 'pfc_tracker_reminder_settings';
const LAST_SYNCED_ACTIVITY_KEY = 'pfc_tracker_last_synced_activity';
const SYNCABLE_MEALS = new Set<string>(['breakfast', 'lunch', 'dinner']);

let inFlightSyncKey: string | null = null;
let latestRequestedSyncKey: string | null = null;

export function clearLastSyncedActivity(): void {
  inFlightSyncKey = null;
  latestRequestedSyncKey = null;
  try {
    localStorage.removeItem(LAST_SYNCED_ACTIVITY_KEY);
  } catch {
    // ignore storage errors
  }
}

interface FirebasePublicConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

function getFirebasePublicConfig(): FirebasePublicConfig {
  return {
    apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
    authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
    projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
    messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
    appId: (import.meta.env.VITE_FIREBASE_APP_ID || '').trim(),
    vapidKey: (import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim(),
  };
}

export function isPushConfigured(): boolean {
  const cfg = getFirebasePublicConfig();
  return Boolean(
    cfg.apiKey &&
      cfg.authDomain &&
      cfg.projectId &&
      cfg.messagingSenderId &&
      cfg.appId &&
      cfg.vapidKey
  );
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export function getDefaultReminderSettings(): ReminderSettings {
  return {
    enabled: false,
    slots: {
      morning: { enabled: false, time: '08:30' },
      lunch: { enabled: true, time: '12:30' },
      dinner: { enabled: true, time: '20:30' },
    },
  };
}

export function loadReminderSettings(): ReminderSettings {
  const defaults = getDefaultReminderSettings();
  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<ReminderSettings>;

    const mergeSlot = (key: ReminderSlotKey) => ({
      enabled:
        typeof parsed.slots?.[key]?.enabled === 'boolean'
          ? parsed.slots[key].enabled
          : defaults.slots[key].enabled,
      time:
        typeof parsed.slots?.[key]?.time === 'string' && parsed.slots[key].time.trim()
          ? parsed.slots[key].time
          : defaults.slots[key].time,
    });

    return {
      enabled: Boolean(parsed.enabled && parsed.token),
      token: typeof parsed.token === 'string' ? parsed.token : undefined,
      slots: {
        morning: mergeSlot('morning'),
        lunch: mergeSlot('lunch'),
        dinner: mergeSlot('dinner'),
      },
    };
  } catch {
    return defaults;
  }
}

export function saveReminderSettingsLocal(settings: ReminderSettings): void {
  try {
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

async function getSwRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) {
    await navigator.serviceWorker.ready;
    return existing;
  }

  const isProd = import.meta.env.MODE === 'production';
  const swUrl = isProd ? '/sw.js' : '/dev-sw.js?dev-sw';
  const registration = await navigator.serviceWorker.register(swUrl, {
    type: isProd ? 'classic' : 'module',
  });
  await navigator.serviceWorker.ready;
  return registration;
}

function getFirebaseMessagingInstance() {
  const cfg = getFirebasePublicConfig();
  const app =
    getApps().length > 0
      ? getApp()
      : initializeApp({
          apiKey: cfg.apiKey,
          authDomain: cfg.authDomain,
          projectId: cfg.projectId,
          messagingSenderId: cfg.messagingSenderId,
          appId: cfg.appId,
        });
  return { messaging: getMessaging(app), vapidKey: cfg.vapidKey };
}

async function callSubscriptionApi(payload: {
  action: 'save' | 'delete' | 'test';
  token: string;
  slots?: ReminderSettings['slots'];
}): Promise<void> {
  let res: Response;
  try {
    res = await fetch('/api/push-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('通信できませんでした。インターネット接続を確認してください。');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (res.status === 404) {
      throw new Error('通知APIが見つかりません（Vercel本番環境でお試しください）。');
    }
    throw new Error('通知サーバーから予期しない応答が返されました。');
  }

  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok || !data.ok) {
    throw new Error(data.error || '通知設定の更新に失敗しました。');
  }
}

export async function enablePushNotifications(
  slots: ReminderSettings['slots']
): Promise<ReminderSettings> {
  if (!isPushSupported()) {
    throw new Error('このブラウザはプッシュ通知に対応していません。AndroidのChromeからお試しください。');
  }
  if (!isPushConfigured()) {
    throw new Error('Firebaseの環境変数が未設定です。Vercelの設定完了後に利用できます。');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      '通知が許可されませんでした。Chromeのサイト設定から通知を許可してください。'
    );
  }

  const registration = await getSwRegistration();
  const { messaging, vapidKey } = getFirebaseMessagingInstance();
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error('通知トークンの取得に失敗しました。少し時間をおいて再度お試しください。');
  }

  await callSubscriptionApi({ action: 'save', token, slots });

  const nextSettings: ReminderSettings = {
    enabled: true,
    token,
    slots,
  };
  saveReminderSettingsLocal(nextSettings);
  clearLastSyncedActivity();
  return nextSettings;
}

export async function updatePushSlots(
  token: string,
  slots: ReminderSettings['slots']
): Promise<ReminderSettings> {
  await callSubscriptionApi({ action: 'save', token, slots });
  const nextSettings: ReminderSettings = {
    enabled: true,
    token,
    slots,
  };
  saveReminderSettingsLocal(nextSettings);
  return nextSettings;
}

export async function disablePushNotifications(
  currentSettings: ReminderSettings
): Promise<ReminderSettings> {
  if (currentSettings.token && isPushConfigured()) {
    try {
      await callSubscriptionApi({ action: 'delete', token: currentSettings.token });
    } catch {
      // サーバー削除に失敗しても端末側のオフ操作は完了させる
    }
  }

  const nextSettings: ReminderSettings = {
    enabled: false,
    token: undefined,
    slots: currentSettings.slots,
  };
  saveReminderSettingsLocal(nextSettings);
  clearLastSyncedActivity();
  return nextSettings;
}

export async function sendTestPushNotification(token: string): Promise<void> {
  await callSubscriptionApi({ action: 'test', token });
}

export async function syncPushActivity(
  settings: ReminderSettings,
  activity: { date: string; loggedMeals: MealType[]; isRestDay: boolean }
): Promise<void> {
  if (!settings.enabled || !settings.token || !isPushConfigured()) {
    return;
  }

  const meals = Array.from(
    new Set(activity.loggedMeals.filter((meal) => SYNCABLE_MEALS.has(meal)))
  ).sort();
  const syncKey = `${settings.token.slice(-12)}|${activity.date}|${activity.isRestDay ? '1' : '0'}|${meals.join(',')}`;

  try {
    if (localStorage.getItem(LAST_SYNCED_ACTIVITY_KEY) === syncKey) {
      return;
    }
  } catch {
    // ignore storage errors
  }

  if (inFlightSyncKey === syncKey) {
    return;
  }

  inFlightSyncKey = syncKey;
  latestRequestedSyncKey = syncKey;

  try {
    const res = await fetch('/api/push-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        action: 'sync-activity',
        token: settings.token,
        activityDate: activity.date,
        loggedMeals: meals,
        isRestDay: activity.isRestDay,
      }),
    });

    if (res.ok && latestRequestedSyncKey === syncKey) {
      try {
        localStorage.setItem(LAST_SYNCED_ACTIVITY_KEY, syncKey);
      } catch {
        // ignore storage errors
      }
    }
  } catch {
    // オフライン時や通信エラー時はユーザー操作を妨げず静かに無視
  } finally {
    if (inFlightSyncKey === syncKey) {
      inFlightSyncKey = null;
    }
  }
}
