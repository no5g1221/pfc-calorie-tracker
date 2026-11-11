import React, { useState, useEffect } from 'react';
import type { AppState } from '../types';
import { calcTargetMacros, cleanNumberInput } from '../utils/calculations';
import { X, Check, Target, AlertTriangle } from 'lucide-react';

interface TargetSettingsModalProps {
  isOpen: boolean;
  target: AppState['target'];
  onClose: () => void;
  onSave: (newTarget: AppState['target']) => void;
}

export const TargetSettingsModal: React.FC<TargetSettingsModalProps> = ({
  isOpen,
  target,
  onClose,
  onSave,
}) => {
  const [calories, setCalories] = useState<string>('2000');
  const [pRatio, setPRatio] = useState<number>(30);
  const [fRatio, setFRatio] = useState<number>(20);
  const [cRatio, setCRatio] = useState<number>(50);

  useEffect(() => {
    if (target) {
      setCalories(String(target.calories));
      setPRatio(target.pRatio);
      setFRatio(target.fRatio);
      setCRatio(target.cRatio);
    }
  }, [target, isOpen]);

  if (!isOpen) return null;

  const numCalories = parseInt(calories, 10) || 0;
  const totalRatio = pRatio + fRatio + cRatio;
  const isRatioValid = totalRatio === 100;
  const { targetP, targetF, targetC } = calcTargetMacros(numCalories, pRatio, fRatio, cRatio);

  const presets = [
    { label: '標準バランス', p: 30, f: 20, c: 50 },
    { label: '減量・高タンパク', p: 35, f: 15, c: 50 },
    { label: '増量・筋肥大', p: 25, f: 20, c: 55 },
    { label: 'ケトジェニック', p: 25, f: 70, c: 5 },
  ];

  const handleApplyPreset = (p: number, f: number, c: number) => {
    setPRatio(p);
    setFRatio(f);
    setCRatio(c);
  };

  const handleSave = () => {
    if (!isRatioValid) return;
    onSave({
      calories: Math.max(500, numCalories),
      pRatio,
      fRatio,
      cRatio,
      targetP,
      targetF,
      targetC,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-200">
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">目標設定</span>
              <h3 className="text-base font-bold text-white">カロリー & PFC比率</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1日の目標カロリー */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-300">1日の目標カロリー</label>
          <div className="relative">
            <input
              type="number"
              step="50"
              min="500"
              max="10000"
              placeholder="2000"
              value={calories}
              onFocus={(e) => {
                const el = e.target;
                setTimeout(() => el.select(), 50);
              }}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              onChange={(e) => setCalories(cleanNumberInput(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xl font-black text-white focus:outline-none focus:border-sky-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
              kcal
            </span>
          </div>
        </div>

        {/* 定番PFCバランスプリセット */}
        <div className="space-y-1">
          <span className="text-xs font-bold text-slate-400">定番PFC比率</span>
          <div className="grid grid-cols-2 gap-2">
            {presets.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleApplyPreset(item.p, item.f, item.c)}
                className={`p-2 rounded-xl text-left border transition-all ${
                  pRatio === item.p && fRatio === item.f && cRatio === item.c
                    ? 'bg-sky-500/20 border-sky-500 text-white'
                    : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold">{item.label}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  P:{item.p}% F:{item.f}% C:{item.c}%
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* PFC比率スライダー & 警告表示 */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-200">PFC比率の調整</span>
            <span className={isRatioValid ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
              合計: {totalRatio}% {isRatioValid && '✓'}
            </span>
          </div>

          {/* ユーザー要件: 比率の合計が100%でない場合の警告 */}
          {!isRatioValid && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-2 text-xs font-bold text-rose-400 flex items-center gap-1.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>合計が100%になっていません: 現在{totalRatio}%</span>
            </div>
          )}

          {/* P比率 */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-sky-400">P (タンパク質)</span>
              <span className="font-mono text-white">{pRatio}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="80"
              value={pRatio}
              onChange={(e) => setPRatio(parseInt(e.target.value) || 0)}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          {/* F比率 */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-amber-400">F (脂質)</span>
              <span className="font-mono text-white">{fRatio}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="80"
              value={fRatio}
              onChange={(e) => setFRatio(parseInt(e.target.value) || 0)}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          {/* C比率 */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-emerald-400">C (炭水化物)</span>
              <span className="font-mono text-white">{cRatio}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="85"
              value={cRatio}
              onChange={(e) => setCRatio(parseInt(e.target.value) || 0)}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>
        </div>

        {/* 換算後の目標摂取量プレビュー */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
          <div className="text-[11px] font-bold text-slate-400 mb-1.5">自動換算された目標グラム数</div>
          <div className="grid grid-cols-3 gap-2 text-center font-mono">
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl py-1.5">
              <div className="text-[10px] text-sky-400 font-bold">目標 P</div>
              <div className="text-base font-black text-white">{targetP}g</div>
              <div className="text-[10px] text-slate-500">{Math.round(targetP * 4)}kcal</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl py-1.5">
              <div className="text-[10px] text-amber-400 font-bold">目標 F</div>
              <div className="text-base font-black text-white">{targetF}g</div>
              <div className="text-[10px] text-slate-500">{Math.round(targetF * 9)}kcal</div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-1.5">
              <div className="text-[10px] text-emerald-400 font-bold">目標 C</div>
              <div className="text-base font-black text-white">{targetC}g</div>
              <div className="text-[10px] text-slate-500">{Math.round(targetC * 4)}kcal</div>
            </div>
          </div>
        </div>

        {/* ボタン */}
        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isRatioValid}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-1.5 ${
              isRatioValid
                ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/25'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>目標を更新</span>
          </button>
        </div>
      </div>
    </div>
  );
};
