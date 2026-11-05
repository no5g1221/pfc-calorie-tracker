import React, { useState } from 'react';
import type { CategoryType, PresetItem } from '../types';
import { calcCalories, round1 } from '../utils/calculations';
import { X, Check, Trash2, Plus, Edit2, ArrowLeft } from 'lucide-react';

interface PresetManageModalProps {
  isOpen: boolean;
  presets: PresetItem[];
  onClose: () => void;
  onSavePreset: (preset: PresetItem) => void;
  onDeletePreset: (id: string) => void;
}

export const PresetManageModal: React.FC<PresetManageModalProps> = ({
  isOpen,
  presets,
  onClose,
  onSavePreset,
  onDeletePreset,
}) => {
  // mode: 'list' (パーツ一覧) または 'form' (新規追加・編集)
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);

  // フォームステート
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategoryType>('staple');
  const [unit, setUnit] = useState('g');
  const [baseAmount, setBaseAmount] = useState<number>(100);
  const [baseP, setBaseP] = useState<number>(0);
  const [baseF, setBaseF] = useState<number>(0);
  const [baseC, setBaseC] = useState<number>(0);

  if (!isOpen) return null;

  const handleStartCreate = () => {
    setEditingId(null);
    setName('');
    setCategory('staple');
    setUnit('g');
    setBaseAmount(100);
    setBaseP(0);
    setBaseF(0);
    setBaseC(0);
    setMode('form');
  };

  const handleStartEdit = (preset: PresetItem) => {
    setEditingId(preset.id);
    setName(preset.name);
    setCategory(preset.category);
    setUnit(preset.unit);
    setBaseAmount(preset.baseAmount);
    setBaseP(preset.baseP);
    setBaseF(preset.baseF);
    setBaseC(preset.baseC);
    setMode('form');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const item: PresetItem = {
      id: editingId || `preset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      category,
      unit: unit.trim() || 'g',
      baseAmount: Math.max(0.1, Number(baseAmount) || 100),
      baseP: round1(Number(baseP) || 0),
      baseF: round1(Number(baseF) || 0),
      baseC: round1(Number(baseC) || 0),
    };

    onSavePreset(item);
    setMode('list');
  };

  const previewCal = calcCalories(baseP, baseF, baseC);
  const commonUnits = ['g', '個', '尾', 'パック', '切れ', '缶', '枚', '杯'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-200">
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            {mode === 'form' && (
              <button
                type="button"
                onClick={() => setMode('list')}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                {mode === 'list' ? '食材パーツ管理' : editingId ? 'パーツの編集' : '新規パーツ追加'}
              </span>
              <h3 className="text-base font-bold text-white leading-tight">
                {mode === 'list' ? '定番パーツの編集・追加' : name || '新しい食材'}
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

        {mode === 'list' ? (
          /* パーツ一覧画面 */
          <div className="space-y-3">
            {/* 新規作成ボタン */}
            <button
              onClick={handleStartCreate}
              className="w-full py-2.5 px-3 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>+ 新規パーツを追加する</span>
            </button>

            {/* パーツ一覧（スクロール可能） */}
            <div className="space-y-2 max-h-[55vh] overflow-y-auto no-scrollbar pr-0.5">
              {presets.map((preset) => {
                const cal = calcCalories(preset.baseP, preset.baseF, preset.baseC);
                const catLabel =
                  preset.category === 'staple'
                    ? '主食'
                    : preset.category === 'main'
                    ? '主菜・P'
                    : '副菜・他';

                return (
                  <div
                    key={preset.id}
                    className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-3 flex items-center justify-between gap-2.5 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {catLabel}
                        </span>
                        <span className="text-sm font-bold text-white truncate">
                          {preset.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mt-1">
                        <span className="text-orange-400 font-semibold">{cal} kcal</span>
                        <span className="text-slate-600">/</span>
                        <span>{preset.baseAmount}{preset.unit}</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-sky-400">P:{preset.baseP}</span>
                        <span className="text-amber-400">F:{preset.baseF}</span>
                        <span className="text-emerald-400">C:{preset.baseC}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleStartEdit(preset)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="編集"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`「${preset.name}」を削除しますか？`)) {
                            onDeletePreset(preset.id);
                          }
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors mt-2"
            >
              閉じる
            </button>
          </div>
        ) : (
          /* パーツ入力・編集フォーム */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">食材パーツ名</label>
              <input
                type="text"
                required
                placeholder="例: 白米、皮なし鶏むね肉"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">分類（タブ）</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'staple', label: '主食' },
                  { id: 'main', label: '主菜・P' },
                  { id: 'sub', label: '副菜・他' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id as CategoryType)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      category === c.id
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">基準量</label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  value={baseAmount}
                  onChange={(e) => setBaseAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">単位</label>
                <input
                  type="text"
                  required
                  placeholder="例: g, 個, 尾, 缶"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* クイック単位ピル */}
            <div className="flex flex-wrap gap-1.5">
              {commonUnits.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                    unit === u
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>

            {/* PFC入力（基準量あたり） */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  基準量（{baseAmount}{unit}）のPFC
                </span>
                <span className="text-xs font-bold text-orange-400">
                  {previewCal} kcal
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-sky-400 mb-1">P (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={baseP}
                    onChange={(e) => setBaseP(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-sky-500/30 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-400 mb-1">F (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={baseF}
                    onChange={(e) => setBaseF(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-amber-500/30 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-400 mb-1">C (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={baseC}
                    onChange={(e) => setBaseC(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMode('list')}
                className="flex-1 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{editingId ? '更新する' : '登録する'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
