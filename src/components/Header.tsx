import React, { useState } from 'react';
import { Settings, Database, PlusCircle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, RotateCcw, RefreshCw } from 'lucide-react';
import { getTodayDateString } from '../utils/calculations';

interface HeaderProps {
  currentDate: string; // 選択中の日付 (YYYY-MM-DD)
  onOpenCalendar: () => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onGoToday: () => void;
  onOpenTargetModal: () => void;
  onOpenQuickAdd: () => void;
  onOpenBackupModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  onOpenCalendar,
  onPrevDay,
  onNextDay,
  onGoToday,
  onOpenTargetModal,
  onOpenQuickAdd,
  onOpenBackupModal,
}) => {
  const today = getTodayDateString();
  const isPast = currentDate !== today;

  const formatDateJapanese = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const days = ['日', '月', '火', '水', '木', '金', '土'];
      return `${m}月${d}日 (${days[date.getDay()]})`;
    } catch {
      return dateStr;
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleReloadApp = async () => {
    setIsRefreshing(true);
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const r of registrations) {
          await r.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) {
          await caches.delete(k);
        }
      }
    } catch {
      // ignore
    }
    window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
  };

  return (
    <header className="space-y-2 pb-1">
      {/* 1行目: アプリロゴ & 各種メニューボタン */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/favicon.png?v=2"
            alt="パプリカPFC Logo"
            className="w-8 h-8 rounded-xl shadow-md shadow-sky-500/20 object-cover border border-slate-700/60"
          />
          <div>
            <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5 leading-none m-0">
              パプリカPFC
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.5 rounded-md">
                自炊派 ✨
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* アプリ更新ボタン */}
          <button
            type="button"
            onClick={handleReloadApp}
            disabled={isRefreshing}
            className="p-1.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-sky-400 transition-all duration-150 active:scale-95 shadow-sm"
            title="アプリを最新版に更新"
            aria-label="アプリ更新"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
          </button>

          {/* 自由入力ボタン */}
          <button
            type="button"
            onClick={onOpenQuickAdd}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-bold transition-all duration-150 active:scale-95 shadow-sm"
            title="自由入力"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">自由入力</span>
          </button>

          {/* バックアップボタン */}
          <button
            type="button"
            onClick={onOpenBackupModal}
            className="p-1.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-white transition-all duration-150 active:scale-95 shadow-sm"
            title="データバックアップ・復元"
            aria-label="データ管理"
          >
            <Database className="w-4 h-4" />
          </button>

          {/* 目標設定 歯車アイコン */}
          <button
            type="button"
            onClick={onOpenTargetModal}
            className="p-1.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-sky-400 hover:border-sky-500/50 transition-all duration-150 active:scale-95 shadow-sm"
            title="目標設定"
            aria-label="目標設定"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2行目: 日付ナビゲーションバー（前日・翌日・カレンダーを開く） */}
      <div className="flex items-center justify-between bg-slate-900/70 border border-slate-800/80 px-2 py-1.5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevDay}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-150 active:scale-95"
            title="前日へ"
            aria-label="前日"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* カレンダーを開くタップ領域 */}
          <button
            type="button"
            onClick={onOpenCalendar}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl hover:bg-slate-800/80 transition-all duration-150 active:scale-95 group"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-extrabold text-white tracking-tight">
              {formatDateJapanese(currentDate)}
            </span>
          </button>

          <button
            type="button"
            onClick={onNextDay}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-150 active:scale-95"
            title="翌日へ"
            aria-label="翌日"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 過去日表示中の場合「今日に戻る」ボタン、今日の場合はカレンダーボタン */}
        {isPast ? (
          <button
            type="button"
            onClick={onGoToday}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold hover:bg-amber-500/25 transition-all duration-150 active:scale-95 animate-in fade-in"
          >
            <RotateCcw className="w-3 h-3" />
            <span>今日へ戻る</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenCalendar}
            className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-sky-500/10 transition-all duration-150 active:scale-95"
          >
            <span>カレンダー</span>
          </button>
        )}
      </div>
    </header>
  );
};
