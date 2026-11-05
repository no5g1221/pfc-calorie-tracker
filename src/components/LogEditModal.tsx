import React, { useState, useEffect } from 'react';
import type { IntakeLogItem } from '../types';
import { calcCalories, round1 } from '../utils/calculations';
import { X, Check, Trash2, Scale } from 'lucide-react';

interface LogEditModalProps {
  log: IntakeLogItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, newAmount: number) => void;
  onDelete: (id: string) => void;
}

export const LogEditModal: React.FC<LogEditModalProps> = ({
  log,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [amount, setAmount] = useState<number>(0);

  useEffect(() => {
    if (log) {
      setAmount(log.currentAmount);
    }
  }, [log, isOpen]);

  if (!isOpen || !log) return null;

  const ratio = log.baseAmount > 0 ? amount / log.baseAmount : 1;
  const previewP = round1(log.baseP * ratio);
  const previewF = round1(log.baseF * ratio);
  const previewC = round1(log.baseC * ratio);
  const previewCal = calcCalories(previewP, previewF, previewC);

  // 表示名のリアルタイムプレビュー（例: 「白米 120g」）
  const baseName = log.name.replace(/\s+\d+(\.\d+)?[^\s]*$/, '');
  const formattedAmount = Number.isInteger(amount) ? amount : round1(amount);
  const previewDisplayName = `${baseName} ${formattedAmount}${log.unit}`;

  // ユーザー要件指定の倍率ボタン: 0.5倍、1倍、1.5倍、2倍
  const multipliers = [
    { label: '0.5倍', value: 0.5 },
    { label: '1倍', value: 1.0 },
    { label: '1.5倍', value: 1.5 },
    { label: '2倍', value: 2.0 },
  ];

  const handleMultiplierClick = (m: number) => {
    const newAmt = round1(log.baseAmount * m);
    setAmount(newAmt);
  };

  const handleSave = () => {
    onSave(log.id, Math.max(0, amount));
    onClose();
  };

  const handleDelete = () => {
    onDelete(log.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom duration-200">
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">摂取量の再調整</span>
              <h3 className="text-base font-bold text-white truncate max-w-[220px]">
                {previewDisplayName}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* リアルタイム再計算プレビューカード */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">再計算カロリー</span>
            <span className="text-2xl font-black text-orange-400">
              {previewCal} <span className="text-xs font-medium text-slate-400">kcal</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 font-mono text-center">
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl py-1.5">
              <div className="text-[10px] text-sky-400 font-bold">P</div>
              <div className="text-sm font-black text-white">{previewP}g</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl py-1.5">
              <div className="text-[10px] text-amber-400 font-bold">F</div>
              <div className="text-sm font-black text-white">{previewF}g</div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-1.5">
              <div className="text-[10px] text-emerald-400 font-bold">C</div>
              <div className="text-sm font-black text-white">{previewC}g</div>
            </div>
          </div>
        </div>

        {/* ユーザー要件: 倍率ボタン（0.5倍、1倍、1.5倍、2倍） */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300">
            倍率ボタン（基準量: {log.baseAmount}{log.unit}）
          </label>
          <div className="grid grid-cols-4 gap-2">
            {multipliers.map((m) => {
              const isSelected = round1(amount) === round1(log.baseAmount * m.value);
              return (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => handleMultiplierClick(m.value)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ユーザー要件: 数値直接入力（実際に食べた量を入力） */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">
              実際に食べた量 ({log.unit}) を直接入力
            </label>
            <span className="text-[11px] text-slate-500">
              基準: {log.baseAmount}{log.unit}
            </span>
          </div>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="0"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xl font-black text-white focus:outline-none focus:border-sky-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
              {log.unit}
            </span>
          </div>
        </div>

        {/* アクションボタン: 削除 & 保存 */}
        <div className="flex gap-2 pt-2">
          {/* 削除ボタン */}
          <button
            type="button"
            onClick={handleDelete}
            className="p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition-colors flex items-center justify-center shrink-0"
            title="間違えて登録したアイテムを削除"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          {/* キャンセル */}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
          >
            キャンセル
          </button>

          {/* 保存 */}
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>保存する</span>
          </button>
        </div>
      </div>
    </div>
  );
};
