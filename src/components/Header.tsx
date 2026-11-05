import React from 'react';
import { Settings, Database, PlusCircle, Calendar as CalendarIcon, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
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

  return (
    <header className="space-y-1.5 pb-2 pt-1 border-b border-slate-800/80">
      {/* 1行目: アプリロゴ & 各種メニューボタン */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/favicon.png"
            alt="PFC Logo"
            className="w-8 h-8 rounded-xl shadow-md shadow-sky-500/20 object-cover"
          />
          <div>
            <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1 leading-none m-0">
              最速PFC管理
              <span className="text-[10px] font-bold text-sky-400 bg-sky-950/80 border border-sky-800/80 px-1 py-0.5 rounded">
                自炊派
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 自由入力ボタン */}
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-all active:scale-95"
            title="自由入力"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">自由入力</span>
          </button>

          {/* バックアップボタン */}
          <button
            onClick={onOpenBackupModal}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
            title="データバックアップ・復元"
            aria-label="データ管理"
          >
            <Database className="w-4 h-4" />
          </button>

          {/* 目標設定 歯車アイコン */}
          <button
            onClick={onOpenTargetModal}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-sky-400 hover:border-sky-500/50 transition-colors"
            title="目標設定"
            aria-label="目標設定"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2行目: 日付ナビゲーションバー（前日・翌日・カレンダーを開く） */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 px-2 py-1.5 rounded-2xl">
        <div className="flex items-center gap-1">
          <button
            onClick={onPrevDay}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="前日へ"
            aria-label="前日"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* カレンダーを開くタップ領域 */}
          <button
            onClick={onOpenCalendar}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg hover:bg-slate-800/80 transition-colors group"
          >
            <CalendarIcon className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-white tracking-tight">
              {formatDateJapanese(currentDate)}
            </span>
          </button>

          <button
            onClick={onNextDay}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="翌日へ"
            aria-label="翌日"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 過去日表示中の場合「今日に戻る」ボタン、今日の場合はカレンダーボタン */}
        {isPast ? (
          <button
            onClick={onGoToday}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-bold hover:bg-amber-500/25 transition-all animate-in fade-in"
          >
            <RotateCcw className="w-3 h-3" />
            <span>今日へ戻る</span>
          </button>
        ) : (
          <button
            onClick={onOpenCalendar}
            className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-sky-500/10 transition-colors"
          >
            <span>カレンダーで探す</span>
          </button>
        )}
      </div>
    </header>
  );
};
