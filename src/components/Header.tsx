import React from 'react';
import { Settings, Database, PlusCircle } from 'lucide-react';

interface HeaderProps {
  currentDate: string;
  onOpenTargetModal: () => void;
  onOpenQuickAdd: () => void;
  onOpenBackupModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  onOpenTargetModal,
  onOpenQuickAdd,
  onOpenBackupModal,
}) => {
  const formatDateJapanese = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const days = ['日', '月', '火', '水', '木', '金', '土'];
      return `${y}年${m}月${d}日 (${days[date.getDay()]})`;
    } catch {
      return dateStr;
    }
  };

  return (
    <header className="flex items-center justify-between pb-2 pt-1 border-b border-slate-800/80">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20 text-white font-black text-xs tracking-tight">
          PFC
        </div>
        <div>
          <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5 leading-none m-0">
            最速PFC管理
            <span className="text-[10px] font-bold text-sky-400 bg-sky-950/80 border border-sky-800/80 px-1 py-0.5 rounded">
              自炊派
            </span>
          </h1>
          <p className="text-[10px] font-medium text-slate-400 mt-0.5">
            {formatDateJapanese(currentDate)}
          </p>
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
          title="目標設定（カロリー & PFC比率）"
          aria-label="目標設定"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
