import { createHash, createSign } from 'node:crypto';

export type ReminderSlotKey = 'morning' | 'lunch' | 'dinner';

export interface ReminderSlotConfig {
  enabled: boolean;
  time: string;
}

export type ReminderSlots = Record<ReminderSlotKey, ReminderSlotConfig>;

export interface PushSubscriptionDoc {
  token: string;
  enabled: boolean;
  slots: ReminderSlots;
  lastSent: Partial<Record<ReminderSlotKey, string>>;
  updatedAt: string;
}

interface ServiceAccountInfo {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export class FirebaseConfigError extends Error {
  readonly code = 'MISSING_FIREBASE_CONFIG';

  constructor(message: string) {
    super(message);
    this.name = 'FirebaseConfigError';
  }
}

let cachedAccessToken: { token: string; expiresAtMs: number; clientEmail: string } | null = null;

export const DEFAULT_SLOTS: ReminderSlots = {
  morning: { enabled: false, time: '08:30' },
  lunch: { enabled: true, time: '12:30' },
  dinner: { enabled: true, time: '20:30' },
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function sanitizeSlots(input?: Partial<ReminderSlots> | null): ReminderSlots {
  const sanitizeOne = (key: ReminderSlotKey): ReminderSlotConfig => {
    const raw = input?.[key];
    const fallback = DEFAULT_SLOTS[key];
    const enabled = typeof raw?.enabled === 'boolean' ? raw.enabled : fallback.enabled;
    const time =
      typeof raw?.time === 'string' && TIME_PATTERN.test(raw.time.trim())
        ? raw.time.trim()
        : fallback.time;
    return { enabled, time };
  };

  return {
    morning: sanitizeOne('morning'),
    lunch: sanitizeOne('lunch'),
    dinner: sanitizeOne('dinner'),
  };
}

export function getServiceAccountFromEnv(): ServiceAccountInfo {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    throw new FirebaseConfigError(
      'サーバーに FIREBASE_SERVICE_ACCOUNT_JSON が設定されていません。Vercelの環境変数を確認してください。'
    );
  }

  let parsed: { project_id?: string; client_email?: string; private_key?: string };
  try {
    parsed = JSON.parse(raw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
  } catch {
    throw new FirebaseConfigError('FIREBASE_SERVICE_ACCOUNT_JSON のJSON形式が正しくありません。');
  }

  const projectId = parsed.project_id?.trim();
  const clientEmail = parsed.client_email?.trim();
  const privateKey = parsed.private_key?.replace(/\\n/g, '\n').trim();

  if (!projectId || !clientEmail || !privateKey) {
    throw new FirebaseConfigError(
      'FIREBASE_SERVICE_ACCOUNT_JSON に project_id / client_email / private_key が含まれていません。'
    );
  }

  return { projectId, clientEmail, privateKey };
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export async function getGoogleAccessToken(sa: ServiceAccountInfo): Promise<string> {
  const nowMs = Date.now();
  if (
    cachedAccessToken &&
    cachedAccessToken.clientEmail === sa.clientEmail &&
    nowMs < cachedAccessToken.expiresAtMs - 60_000
  ) {
    return cachedAccessToken.token;
  }

  const nowSec = Math.floor(nowMs / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: sa.clientEmail,
      scope:
        'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat: nowSec,
      exp: nowSec + 3600,
    })
  );

  const signingInput = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = base64UrlEncode(signer.sign(sa.privateKey));
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[firebaseRest] Failed to exchange OAuth token:', res.status, errText.slice(0, 200));
    throw new Error('Google認証トークンの取得に失敗しました。');
  }

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new Error('Google認証レスポンスに access_token がありません。');
  }

  cachedAccessToken = {
    token: data.access_token,
    expiresAtMs: nowMs + (data.expires_in || 3600) * 1000,
    clientEmail: sa.clientEmail,
  };

  return data.access_token;
}

export function getTokenDocId(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 32);
}

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

interface FirestoreDocument {
  name?: string;
  fields?: Record<string, FirestoreValue>;
}

function buildSlotFirestoreMap(slot: ReminderSlotConfig): FirestoreValue {
  return {
    mapValue: {
      fields: {
        enabled: { booleanValue: slot.enabled },
        time: { stringValue: slot.time },
      },
    },
  };
}

function buildLastSentFirestoreMap(
  lastSent: Partial<Record<ReminderSlotKey, string>>
): FirestoreValue {
  const fields: Record<string, FirestoreValue> = {};
  for (const key of ['morning', 'lunch', 'dinner'] as const) {
    const val = lastSent[key];
    if (typeof val === 'string' && val.length > 0) {
      fields[key] = { stringValue: val };
    }
  }
  return { mapValue: { fields } };
}

function toFirestoreFields(doc: PushSubscriptionDoc): Record<string, FirestoreValue> {
  return {
    token: { stringValue: doc.token },
    enabled: { booleanValue: doc.enabled },
    slots: {
      mapValue: {
        fields: {
          morning: buildSlotFirestoreMap(doc.slots.morning),
          lunch: buildSlotFirestoreMap(doc.slots.lunch),
          dinner: buildSlotFirestoreMap(doc.slots.dinner),
        },
      },
    },
    lastSent: buildLastSentFirestoreMap(doc.lastSent || {}),
    updatedAt: { stringValue: doc.updatedAt },
  };
}

function getStringField(val: FirestoreValue | undefined): string | undefined {
  return val && 'stringValue' in val ? val.stringValue : undefined;
}

function getBoolField(val: FirestoreValue | undefined): boolean | undefined {
  return val && 'booleanValue' in val ? val.booleanValue : undefined;
}

function getMapField(val: FirestoreValue | undefined): Record<string, FirestoreValue> | undefined {
  return val && 'mapValue' in val ? val.mapValue.fields : undefined;
}

function fromFirestoreDocument(raw: FirestoreDocument): { id: string; doc: PushSubscriptionDoc } | null {
  const nameParts = (raw.name || '').split('/');
  const id = nameParts[nameParts.length - 1] || '';
  const fields = raw.fields;
  if (!id || !fields) return null;

  const token = getStringField(fields.token);
  if (!token) return null;

  const enabled = getBoolField(fields.enabled) ?? true;
  const slotsMap = getMapField(fields.slots);

  const readSlot = (key: ReminderSlotKey): ReminderSlotConfig => {
    const slotFields = getMapField(slotsMap?.[key]);
    const fallback = DEFAULT_SLOTS[key];
    const slotEnabled = getBoolField(slotFields?.enabled);
    const slotTime = getStringField(slotFields?.time);
    return {
      enabled: slotEnabled !== undefined ? slotEnabled : fallback.enabled,
      time: slotTime && TIME_PATTERN.test(slotTime) ? slotTime : fallback.time,
    };
  };

  const lastSentMap = getMapField(fields.lastSent);
  const lastSent: Partial<Record<ReminderSlotKey, string>> = {};
  for (const key of ['morning', 'lunch', 'dinner'] as const) {
    const sentDate = getStringField(lastSentMap?.[key]);
    if (sentDate) {
      lastSent[key] = sentDate;
    }
  }

  return {
    id,
    doc: {
      token,
      enabled,
      slots: {
        morning: readSlot('morning'),
        lunch: readSlot('lunch'),
        dinner: readSlot('dinner'),
      },
      lastSent,
      updatedAt: getStringField(fields.updatedAt) || new Date().toISOString(),
    },
  };
}

function firestoreCollectionUrl(projectId: string): string {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/push_subscriptions`;
}

export async function getSubscriptionByToken(token: string): Promise<PushSubscriptionDoc | null> {
  const sa = getServiceAccountFromEnv();
  const accessToken = await getGoogleAccessToken(sa);
  const docId = getTokenDocId(token);

  const res = await fetch(`${firestoreCollectionUrl(sa.projectId)}/${docId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[firebaseRest] Failed to read subscription:', res.status, errText.slice(0, 200));
    return null;
  }

  const raw = (await res.json()) as FirestoreDocument;
  return fromFirestoreDocument(raw)?.doc ?? null;
}

export async function upsertSubscription(doc: PushSubscriptionDoc): Promise<void> {
  const sa = getServiceAccountFromEnv();
  const accessToken = await getGoogleAccessToken(sa);
  const docId = getTokenDocId(doc.token);

  const res = await fetch(`${firestoreCollectionUrl(sa.projectId)}/${docId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: toFirestoreFields(doc) }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[firebaseRest] Failed to upsert subscription:', res.status, errText.slice(0, 200));
    throw new Error('Firestoreへの通知設定保存に失敗しました。');
  }
}

export async function deleteSubscriptionById(docId: string): Promise<void> {
  const sa = getServiceAccountFromEnv();
  const accessToken = await getGoogleAccessToken(sa);

  const res = await fetch(`${firestoreCollectionUrl(sa.projectId)}/${encodeURIComponent(docId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && res.status !== 404) {
    const errText = await res.text().catch(() => '');
    console.error('[firebaseRest] Failed to delete subscription:', res.status, errText.slice(0, 200));
    throw new Error('Firestoreからの通知設定削除に失敗しました。');
  }
}

export async function deleteSubscriptionByToken(token: string): Promise<void> {
  await deleteSubscriptionById(getTokenDocId(token));
}

export async function listSubscriptions(): Promise<Array<{ id: string; doc: PushSubscriptionDoc }>> {
  const sa = getServiceAccountFromEnv();
  const accessToken = await getGoogleAccessToken(sa);

  const res = await fetch(`${firestoreCollectionUrl(sa.projectId)}?pageSize=100`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 404) return [];
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[firebaseRest] Failed to list subscriptions:', res.status, errText.slice(0, 200));
    throw new Error('Firestoreからの通知一覧取得に失敗しました。');
  }

  const data = (await res.json()) as { documents?: FirestoreDocument[] };
  return (data.documents || [])
    .map(fromFirestoreDocument)
    .filter((item): item is { id: string; doc: PushSubscriptionDoc } => item !== null);
}

export async function updateLastSent(docId: string, doc: PushSubscriptionDoc): Promise<void> {
  const sa = getServiceAccountFromEnv();
  const accessToken = await getGoogleAccessToken(sa);

  const res = await fetch(`${firestoreCollectionUrl(sa.projectId)}/${encodeURIComponent(docId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: toFirestoreFields(doc) }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[firebaseRest] Failed to update lastSent:', res.status, errText.slice(0, 200));
  }
}

export type FcmSendResult =
  | { ok: true }
  | { ok: false; unregistered: boolean; status: number; detail: string };

export async function sendFcmDataPush(
  token: string,
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<FcmSendResult> {
  const sa = getServiceAccountFromEnv();
  const accessToken = await getGoogleAccessToken(sa);

  const fcmRes = await fetch(
    `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(sa.projectId)}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          data: {
            title: payload.title,
            body: payload.body,
            url: payload.url || '/',
            tag: payload.tag || 'pfc-reminder',
          },
          webpush: {
            headers: {
              Urgency: 'high',
              TTL: '3600',
            },
          },
        },
      }),
    }
  );

  if (fcmRes.ok) {
    return { ok: true };
  }

  const errText = await fcmRes.text().catch(() => '');
  const upper = errText.toUpperCase();
  const unregistered =
    fcmRes.status === 404 ||
    fcmRes.status === 410 ||
    upper.includes('UNREGISTERED') ||
    upper.includes('NOT_FOUND');

  console.error('[firebaseRest] FCM send error:', fcmRes.status, errText.slice(0, 250));
  return {
    ok: false,
    unregistered,
    status: fcmRes.status,
    detail: errText.slice(0, 200),
  };
}
