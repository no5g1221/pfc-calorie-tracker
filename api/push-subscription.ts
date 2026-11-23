import {
  FirebaseConfigError,
  deleteSubscriptionByToken,
  getSubscriptionByToken,
  sanitizeSlots,
  sendFcmDataPush,
  upsertSubscription,
  type ReminderSlots,
} from './_lib/firebaseRest.js';

interface PushSubscriptionRequestBody {
  action?: unknown;
  token?: unknown;
  slots?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  try {
    let body: PushSubscriptionRequestBody;
    try {
      body = (await request.json()) as PushSubscriptionRequestBody;
    } catch {
      return Response.json(
        { error: 'リクエスト形式が不正です。', code: 'INVALID_BODY' },
        { status: 400 }
      );
    }

    const action = typeof body.action === 'string' ? body.action : '';
    const token = typeof body.token === 'string' ? body.token.trim() : '';

    if (!['save', 'delete', 'test'].includes(action)) {
      return Response.json(
        { error: '不正なアクションです。', code: 'INVALID_ACTION' },
        { status: 400 }
      );
    }

    if (token.length < 20 || token.length > 500) {
      return Response.json(
        { error: '通知トークンが不正です。再度通知をオンにしてみてください。', code: 'INVALID_TOKEN' },
        { status: 400 }
      );
    }

    if (action === 'save') {
      const slots = sanitizeSlots(
        body.slots && typeof body.slots === 'object' ? (body.slots as Partial<ReminderSlots>) : null
      );
      const existing = await getSubscriptionByToken(token);
      await upsertSubscription({
        token,
        enabled: true,
        slots,
        lastSent: existing?.lastSent || {},
        updatedAt: new Date().toISOString(),
      });
      return Response.json({ ok: true }, { status: 200 });
    }

    if (action === 'delete') {
      await deleteSubscriptionByToken(token);
      return Response.json({ ok: true }, { status: 200 });
    }

    // action === 'test'
    const sendResult = await sendFcmDataPush(token, {
      title: 'パプリカPFC テスト通知 ✨',
      body: 'プッシュ通知の設定はバッチリです！この調子でゆるく続けよう 🌿',
      url: '/',
      tag: 'pfc-test',
    });

    if (!sendResult.ok) {
      if (sendResult.unregistered) {
        await deleteSubscriptionByToken(token).catch(() => {});
        return Response.json(
          {
            error: '通知トークンの有効期限が切れています。いったん通知をオフにして再度オンにしてください。',
            code: 'TOKEN_UNREGISTERED',
          },
          { status: 410 }
        );
      }

      return Response.json(
        {
          error: 'テスト通知の送信に失敗しました。時間をおいて再度お試しください。',
          code: 'FCM_SEND_FAILED',
        },
        { status: 502 }
      );
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (err instanceof FirebaseConfigError) {
      console.error('[push-subscription] Config error:', err.message);
      return Response.json({ error: err.message, code: err.code }, { status: 503 });
    }

    console.error('[push-subscription] Unexpected error:', err);
    return Response.json(
      { error: '通知設定の処理中にエラーが発生しました。', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
