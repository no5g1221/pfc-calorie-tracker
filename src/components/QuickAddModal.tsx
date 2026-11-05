import React, { useState } from 'react';
import type { IntakeLogItem } from '../types';
import { calcCalories, round1 } from '../utils/calculations';
import { X, Check, UtensilsCrossed } from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (log: IntakeLogItem) => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number>(1);
  const [unit, setUnit] = useState('人前');
  const [p, setP] = useState<number>(0);
  const [f, setF] = useState<number>(0);
  const [c, setC] = useState<number>(0);

  if (!isOpen) return null;

  const cal = calcCalories(p, f, c);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const currentAmount = Number(amount) || 1;
    const currentP = round1(Number(p) || 0);
    const currentF = round1(Number(f) || 0);
    const currentC = round1(Number(c) || 0);

    const newLog: IntakeLogItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `${name.trim()} ${currentAmount}${unit}`,
      unit: unit.trim() || '食',
      baseAmount: currentAmount,
      currentAmount,
      baseP: currentP,
      baseF: currentF,
      baseC: currentC,
      currentP,
      currentF,
      currentC,
      timestamp: Date.now(),
    };

    onAdd(newLog);
    // フォームリセット
    setName('');
    setAmount(1);
    setUnit('人前');
    setP(0);
    setF(0);
    setC(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">自由入力</span>
              <h3 className="text-lg font-bold text-white">外食・単品の即時記録</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">メニュー・品名</label>
            <input
              type="text"
              required
              placeholder="例: プロテインバー、外食ランチ"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">量</label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">単位</label>
              <input
                type="text"
                required
                placeholder="例: 個, 人前, 本"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* PFC入力 */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">PFC入力</span>
              <span className="text-xs font-bold text-orange-400">{cal} kcal</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-sky-400 mb-1">P (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={p}
                  onChange={(e) => setP(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-sky-500/30 rounded-xl px-2.5 py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-400 mb-1">F (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={f}
                  onChange={(e) => setF(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-amber-500/30 rounded-xl px-2.5 py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-emerald-400 mb-1">C (g)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={c}
                  onChange={(e) => setC(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl px-2.5 py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/25 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>今日に追加</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
