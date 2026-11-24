import { timingSafeEqual } from 'node:crypto';
import {
  FirebaseConfigError,
  deleteSubscriptionById,
  listSubscriptions,
  sendFcmDataPush,
  updateLastSent,
  type ActivityMealKey,
  type ReminderSlotKey,
} from './_lib/firebaseRest.js';

const SLOT_TO_MEAL: Record<ReminderSlotKey, ActivityMealKey> = {
  morning: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
};

const SLOT_MESSAGES: Record<ReminderSlotKey, { title: string; body: string }> = {
  morning: {
    title: 'パプリカPFC 🌅',
    body: 'おはよう！今日の1品目、1タップでゆるく始めよう',
  },
  lunch: {
    title: 'パプリカPFC 🍱',
    body: 'お昼ごはん食べた？ざっくり記録でもOKだよ',
  },
  dinner: {
    title: 'パプリカPFC 🌿',
    body: '今日もおつかれさま！1タップ記録かお休みスタンプで締めよう',
  },
};

function isAuthorized(authHeader: string | null, expectedSecret: string): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const provided = authHeader.slice('Bearer '.length).trim();
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expectedSecret, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function getJstNow(): { todayJst: string; nowMinutes: number } {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const year = jst.getUTCFullYear();
  const month = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jst.getUTCDate()).padStart(2, '0');
  const hours = jst.getUTCHours();
  const minutes = jst.getUTCMinutes();

  return {
    todayJst: `${year}-${month}-${day}`,
    nowMinutes: hours * 60 + minutes,
  };
}

function parseTimeToMinutes(timeStr: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeStr);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export async function POST(request: Request): Promise<Response> {
  try {
    const cronSecret = process.env.REMINDER_CRON_SECRET?.trim();
    if (!cronSecret) {
      console.error('[send-reminders] REMINDER_CRON_SECRET is not set');
      return Response.json(
        { error: 'REMINDER_CRON_SECRET が設定されていません。', code: 'MISSING_CRON_SECRET' },
        { status: 503 }
      );
    }

    if (!isAuthorized(request.headers.get('authorization'), cronSecret)) {
      return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { todayJst, nowMinutes } = getJstNow();
    const subscriptions = await listSubscriptions();

    let checked = 0;
    let sent = 0;
    let skipped = 0;
    let removed = 0;

    for (const item of subscriptions) {
      checked += 1;
      const { id, doc } = item;
      if (!doc.enabled) continue;

      let tokenInvalid = false;

      for (const slotKey of ['morning', 'lunch', 'dinner'] as const) {
        const slot = doc.slots[slotKey];
        if (!slot?.enabled) continue;
        if (doc.lastSent?.[slotKey] === todayJst) continue;

        const slotMinutes = parseTimeToMinutes(slot.time);
        if (slotMinutes === null) continue;

        // GitHub Actionsのcron遅延を考慮して前後15分以内を対象にする
        if (Math.abs(nowMinutes - slotMinutes) > 15) continue;

        // 当日（JST）の記録済み区分・お休み日がサーバーへ同期されていれば送信を自動スキップ
        if (doc.activityDate === todayJst) {
          if (doc.isRestDay === true) {
            skipped += 1;
            continue;
          }
          const targetMeal = SLOT_TO_MEAL[slotKey];
          if (doc.loggedMeals?.includes(targetMeal)) {
            skipped += 1;
            continue;
          }
        }

        const msg = SLOT_MESSAGES[slotKey];
        const pushResult = await sendFcmDataPush(doc.token, {
          title: msg.title,
          body: msg.body,
          url: '/',
          tag: `pfc-${slotKey}-${todayJst}`,
        });

        if (pushResult.ok) {
          sent += 1;
          doc.lastSent = { ...doc.lastSent, [slotKey]: todayJst };
          doc.updatedAt = new Date().toISOString();
          await updateLastSent(id, doc);
        } else if (pushResult.unregistered) {
          await deleteSubscriptionById(id);
          removed += 1;
          tokenInvalid = true;
          break;
        }
      }

      if (tokenInvalid) {
        continue;
      }
    }

    return Response.json({ ok: true, todayJst, checked, sent, skipped, removed }, { status: 200 });
  } catch (err) {
    if (err instanceof FirebaseConfigError) {
      console.error('[send-reminders] Config error:', err.message);
      return Response.json({ error: err.message, code: err.code }, { status: 503 });
    }

    console.error('[send-reminders] Unexpected error:', err);
    return Response.json(
      { error: 'リマインダー送信処理中にエラーが発生しました。', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
