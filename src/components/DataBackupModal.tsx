import React, { useState } from 'react';
import type { AppState } from '../types';
import { DEFAULT_PRESETS } from '../utils/storage';
import { X, Copy, Check, RotateCcw, Upload, FileText, Smartphone } from 'lucide-react';

interface DataBackupModalProps {
  isOpen: boolean;
  appState: AppState;
  onClose: () => void;
  onRestoreState: (state: AppState) => void;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({
  isOpen,
  appState,
  onClose,
  onRestoreState,
}) => {
  const [jsonInput, setJsonInput] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  // ユーザー要件: データ書き出し（JSONコピー）
  const handleCopyJson = async () => {
    try {
      const dataStr = JSON.stringify(appState, null, 2);
      await navigator.clipboard.writeText(dataStr);
      setIsCopied(true);
      setSuccessMessage('クリップボードにJSONデータを書き出しました！');
      setTimeout(() => {
        setIsCopied(false);
        setSuccessMessage('');
      }, 3000);
    } catch {
      setErrorMessage('コピーに失敗しました。');
    }
  };

  // ユーザー要件: データ取り込み（JSON復元）
  const handleImportJson = () => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      if (!jsonInput.trim()) {
        setErrorMessage('JSONテキストを入力してください。');
        return;
      }

      const parsed: AppState = JSON.parse(jsonInput);

      // バリデーション
      if (
        !parsed.target ||
        !Array.isArray(parsed.presets) ||
        !Array.isArray(parsed.todayLogs) ||
        typeof parsed.lastActiveDate !== 'string'
      ) {
        throw new Error('データ形式が正しくありません。');
      }

      onRestoreState(parsed);
      setSuccessMessage('データを取り込み、正常に復元しました！');
      setJsonInput('');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || '有効なJSONデータを貼り付けてください。');
    }
  };

  // 初期プリセットへの復元
  const handleResetPresets = () => {
    if (window.confirm('定番食材パーツを初期プリセット（8品）に戻しますか？（当日の記録は保持されます）')) {
      const resetState: AppState = {
        ...appState,
        presets: DEFAULT_PRESETS,
      };
      onRestoreState(resetState);
      setSuccessMessage('初期プリセットを復元しました。');
      setTimeout(() => setSuccessMessage(''), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-200">
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">設定・バックアップ</span>
            <h3 className="text-base font-bold text-white">データの保存 & 復元</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 成功 / エラー通知 */}
        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold p-2.5 rounded-xl flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold p-2.5 rounded-xl flex items-center gap-2 animate-in fade-in">
            <X className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. データ書き出し（JSONコピー） */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-sky-400" />
            <span>データ書き出し（JSONコピー）</span>
          </label>
          <p className="text-[11px] text-slate-400">
            現在の食材パーツ、目標設定、当日の記録をJSON形式でクリップボードへ書き出します。メモ帳や別端末へ保存できます。
          </p>
          <button
            type="button"
            onClick={handleCopyJson}
            className="w-full py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 active:scale-98"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{isCopied ? 'コピー完了（書き出し成功）' : 'JSONデータをコピーする'}</span>
          </button>
        </div>

        {/* 2. データ取り込み（JSON復元） */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Upload className="w-4 h-4 text-purple-400" />
            <span>データ取り込み（JSON復元）</span>
          </label>
          <p className="text-[11px] text-slate-400">
            コピーしたバックアップJSONテキストを貼り付けて復元します。
          </p>
          <textarea
            rows={3}
            placeholder="ここにバックアップJSONテキストを貼り付け..."
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
          />
          <button
            type="button"
            onClick={handleImportJson}
            disabled={!jsonInput.trim()}
            className="w-full py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>JSONデータを取り込んで復元</span>
          </button>
        </div>

        {/* 3. 初期パーツ復元 */}
        <div className="pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleResetPresets}
            className="w-full py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>定番パーツのみ初期状態（8品）に戻す</span>
          </button>
        </div>

        {/* PWA案内カード */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 flex items-start gap-2.5">
          <Smartphone className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-slate-200 block">ホーム画面に追加で全画面表示</strong>
            ブラウザのメニューから「ホーム画面に追加」を行うと、URLバーのない全画面（standalone）で快適に動作します。
          </div>
        </div>
      </div>
    </div>
  );
};
