import React, { useState, useEffect } from 'react';
import type { ReminderSettings, ReminderSlotKey } from '../types';
import {
  disablePushNotifications,
  enablePushNotifications,
  isPushConfigured,
  isPushSupported,
  sendTestPushNotification,
  saveReminderSettingsLocal,
  updatePushSlots,
} from '../utils/pushNotifications';
import { X, Bell, BellOff, Send, Loader2, Check, AlertCircle, Info } from 'lucide-react';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  settings: ReminderSettings;
  onClose: () => void;
  onChangeSettings: (next: ReminderSettings) => void;
  onShowToast: (text: string, subText?: string) => void;
}

const slotDefinitions: {
  key: ReminderSlotKey;
  label: string;
  desc: string;
  times: string[];
}[] = [
  {
    key: 'morning',
    label: '🌅 朝',
    desc: '1日のスタートに',
    times: ['08:00', '08:30', '09:00'],
  },
  {
    key: 'lunch',
    label: '☀️ 昼',
    desc: 'ランチ後のざっくり記録に',
    times: ['12:00', '12:30', '13:00'],
  },
  {
    key: 'dinner',
    label: '🌙 夜',
    desc: '1日の振り返り・お休みスタンプに',
    times: ['19:30', '20:00', '20:30', '21:00', '21:30'],
  },
];

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onChangeSettings,
  onShowToast,
}) => {
  const [draftSlots, setDraftSlots] = useState<ReminderSettings['slots']>(settings.slots);
  const [isBusy, setIsBusy] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraftSlots(settings.slots);
      setErrorMsg(null);
    }
  }, [isOpen, settings.slots]);

  if (!isOpen) return null;

  const supported = isPushSupported();
  const configured = isPushConfigured();
  const permissionState =
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  const isBlocked = permissionState === 'denied';

  const isDirty = JSON.stringify(draftSlots) !== JSON.stringify(settings.slots);

  const handleToggleSlot = (key: ReminderSlotKey) => {
    const nextSlots = {
      ...draftSlots,
      [key]: { ...draftSlots[key], enabled: !draftSlots[key].enabled },
    };
    setDraftSlots(nextSlots);

    if (!settings.enabled) {
      const next = { ...settings, slots: nextSlots };
      saveReminderSettingsLocal(next);
      onChangeSettings(next);
    }
  };

  const handleChangeSlotTime = (key: ReminderSlotKey, time: string) => {
    const nextSlots = {
      ...draftSlots,
      [key]: { ...draftSlots[key], time },
    };
    setDraftSlots(nextSlots);

    if (!settings.enabled) {
      const next = { ...settings, slots: nextSlots };
      saveReminderSettingsLocal(next);
      onChangeSettings(next);
    }
  };

  const handleEnable = async () => {
    setIsBusy(true);
    setErrorMsg(null);
    try {
      const next = await enablePushNotifications(draftSlots);
      onChangeSettings(next);
      onShowToast('🔔 プッシュ通知をオンにしました', '指定した時間にリマインドが届きます');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '通知の有効化に失敗しました。');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDisable = async () => {
    setIsBusy(true);
    setErrorMsg(null);
    try {
      const next = await disablePushNotifications(settings);
      onChangeSettings(next);
      onShowToast('通知をオフにしました');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveSlots = async () => {
    if (!settings.token) return;
    setIsBusy(true);
    setErrorMsg(null);
    try {
      const next = await updatePushSlots(settings.token, draftSlots);
      onChangeSettings(next);
      onShowToast('通知時刻を保存しました');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '通知時刻の保存に失敗しました。');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSendTest = async () => {
    if (!settings.token) return;
    setIsTesting(true);
    setErrorMsg(null);
    try {
      await sendTestPushNotification(settings.token);
      onShowToast('テスト通知を送信しました', '数秒以内にAndroid端末へ届きます');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'テスト通知の送信に失敗しました。');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-200">
        {/* ヘッダー */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                リマインダー設定
              </span>
              <h3 className="text-base font-bold text-white">プッシュ通知（Firebase）</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ステータス表示 & メイントグル */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">現在の状態</span>
            {isBlocked ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/35 text-rose-300">
                ブラウザでブロック中
              </span>
            ) : settings.enabled ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-300">
                通知オン ✓
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400">
                通知オフ
              </span>
            )}
          </div>

          {!configured && (
            <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-2.5 text-[11px] text-sky-200 flex items-start gap-2 leading-relaxed">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                Firebase の環境変数がまだ Vercel に設定されていません。設定後にオンにできるようになります。
              </span>
            </div>
          )}

          {isBlocked && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 text-[11px] text-rose-200 leading-relaxed">
              Android Chrome のアドレスバー左のアイコン（または「サイトの設定」）から「通知」を「許可」に変更してください。
            </div>
          )}

          {!supported && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-[11px] text-amber-200">
              このブラウザ環境は Web Push 通知に対応していません。Android Chrome からご利用ください。
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 text-[11px] font-semibold text-rose-300 flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {settings.enabled ? (
            <button
              type="button"
              onClick={() => void handleDisable()}
              disabled={isBusy}
              className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
              <span>通知をオフにする</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleEnable()}
              disabled={isBusy || !supported || !configured}
              className="w-full py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
            >
              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              <span>通知をオンにする</span>
            </button>
          )}
        </div>

        {/* 通知タイミング設定（朝・昼・晩） */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">リマインド時刻（日本時間）</span>
            <span className="text-[10px] text-slate-500">前後数分の誤差で届きます</span>
          </div>

          <div className="space-y-2">
            {slotDefinitions.map((slot) => {
              const cfg = draftSlots[slot.key];
              return (
                <div
                  key={slot.key}
                  className={`rounded-2xl border p-3 transition-all ${
                    cfg.enabled
                      ? 'bg-slate-950/90 border-emerald-500/35'
                      : 'bg-slate-950/50 border-slate-800/80 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <div className="text-xs font-bold text-white">{slot.label}</div>
                      <div className="text-[10px] text-slate-400">{slot.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleSlot(slot.key)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
                        cfg.enabled
                          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-800 border border-slate-700 text-slate-400'
                      }`}
                    >
                      {cfg.enabled ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {slot.times.map((t) => (
                      <button
                        key={t}
                        type="button"
                        disabled={!cfg.enabled}
                        onClick={() => handleChangeSlotTime(slot.key, t)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold transition-all ${
                          cfg.time === t && cfg.enabled
                            ? 'bg-sky-500 text-white shadow-sm'
                            : cfg.enabled
                            ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                            : 'bg-slate-900/50 border border-slate-800/50 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 時刻変更の保存 & テスト通知 */}
        {settings.enabled && settings.token && (
          <div className="space-y-2 pt-1">
            {isDirty && (
              <button
                type="button"
                onClick={() => void handleSaveSlots()}
                disabled={isBusy}
                className="w-full py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/20"
              >
                {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>変更した通知時刻を保存する</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleSendTest()}
              disabled={isTesting}
              className="w-full py-2.5 rounded-2xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>今すぐテスト通知を送る</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};
