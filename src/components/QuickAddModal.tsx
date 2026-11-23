import React, { useState, useEffect } from 'react';
import type {
  AppState,
  CategoryType,
  IntakeLogItem,
  MealType,
  NutritionEstimateResult,
  PresetItem,
  RoughPresetItem,
} from '../types';
import {
  calcCalories,
  calcMacrosFromCalories,
  cleanNumberInput,
  createRoughLogItem,
  round1,
} from '../utils/calculations';
import { AiNutritionSearch } from './AiNutritionSearch';
import {
  X,
  Check,
  UtensilsCrossed,
  Zap,
  Sparkles,
  Flame,
  Sliders,
  Edit2,
  Trash2,
  Plus,
  ArrowLeft,
  RotateCcw,
  Coffee,
} from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  defaultMealType: MealType;
  target: AppState['target'];
  roughPresets: RoughPresetItem[];
  isRestDay: boolean;
  onClose: () => void;
  onAdd: (log: IntakeLogItem) => void;
  onSavePreset?: (preset: PresetItem) => void;
  onSaveRoughPreset: (item: RoughPresetItem) => void;
  onDeleteRoughPreset: (id: string) => void;
  onResetRoughPresets: () => void;
  onToggleRestDay: () => void;
}

type ModalTab = 'rough' | 'ai' | 'calories' | 'detail';
type RoughView = 'pick' | 'manage' | 'form';
type ScaleKey = 'light' | 'normal' | 'heavy';

const mealOptions: { id: MealType; label: string; icon: string }[] = [
  { id: 'breakfast', label: '朝食', icon: '🌅' },
  { id: 'lunch', label: '昼食', icon: '☀️' },
  { id: 'dinner', label: '夕食', icon: '🌙' },
  { id: 'snack', label: '間食', icon: '☕' },
];

const scaleOptions: { key: ScaleKey; label: string; scale: number; sub: string }[] = [
  { key: 'light', label: '軽め', scale: 0.75, sub: '0.75x' },
  { key: 'normal', label: '普通', scale: 1.0, sub: '1.0x' },
  { key: 'heavy', label: 'がっつり', scale: 1.3, sub: '1.3x' },
];

const quickCalorieOptions = [300, 500, 700, 1000];
const emojiSuggestions = ['🍱', '🍜', '🍝', '🥪', '🍺', '🍰', '🥗', '🍛', '🍔', '🍣', '🍙', '🥩', '🍲', '☕'];

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  defaultMealType,
  target,
  roughPresets,
  isRestDay,
  onClose,
  onAdd,
  onSavePreset,
  onSaveRoughPreset,
  onDeleteRoughPreset,
  onResetRoughPresets,
  onToggleRestDay,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('rough');
  const [mealType, setMealType] = useState<MealType>(defaultMealType);

  // ざっくりタブ用ステート
  const [roughView, setRoughView] = useState<RoughView>('pick');
  const [scaleKey, setScaleKey] = useState<ScaleKey>('normal');
  const [editingRoughId, setEditingRoughId] = useState<string | null>(null);
  const [roughName, setRoughName] = useState('');
  const [roughIcon, setRoughIcon] = useState('🍽️');
  const [roughAutoCal, setRoughAutoCal] = useState('');
  const [roughP, setRoughP] = useState('');
  const [roughF, setRoughF] = useState('');
  const [roughC, setRoughC] = useState('');

  // AI検索タブ用ステート
  const [aiResult, setAiResult] = useState<NutritionEstimateResult | null>(null);
  const [aiName, setAiName] = useState('');
  const [aiCategory, setAiCategory] = useState<CategoryType>('main');
  const [aiAmount, setAiAmount] = useState('1');
  const [aiUnit, setAiUnit] = useState('食');
  const [aiP, setAiP] = useState('');
  const [aiF, setAiF] = useState('');
  const [aiC, setAiC] = useState('');
  const [saveAsPreset, setSaveAsPreset] = useState(false);

  // カロリーだけタブ用ステート
  const [calName, setCalName] = useState('');
  const [calValue, setCalValue] = useState('');

  // 詳細PFCタブ用ステート
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<string>('1');
  const [unit, setUnit] = useState('人前');
  const [p, setP] = useState<string>('');
  const [f, setF] = useState<string>('');
  const [c, setC] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setMealType(defaultMealType);
      setActiveTab('rough');
      setRoughView('pick');
      setScaleKey('normal');
      setAiResult(null);
      setAiName('');
      setAiCategory('main');
      setAiAmount('1');
      setAiUnit('食');
      setAiP('');
      setAiF('');
      setAiC('');
      setSaveAsPreset(false);
    }
  }, [isOpen, defaultMealType]);

  if (!isOpen) return null;

  const selectedScale = scaleOptions.find((s) => s.key === scaleKey) || scaleOptions[1];

  // ざっくりプリセットを1タップ記録
  const handlePickRoughPreset = (preset: RoughPresetItem) => {
    const log = createRoughLogItem(preset, selectedScale.scale, selectedScale.label, mealType);
    onAdd(log);
    onClose();
  };

  // ざっくりメニュー作成/編集フォーム開始
  const handleStartCreateRough = () => {
    setEditingRoughId(null);
    setRoughName('');
    setRoughIcon('🍽️');
    setRoughAutoCal('');
    setRoughP('');
    setRoughF('');
    setRoughC('');
    setRoughView('form');
  };

  const handleStartEditRough = (item: RoughPresetItem) => {
    setEditingRoughId(item.id);
    setRoughName(item.name);
    setRoughIcon(item.icon);
    setRoughAutoCal('');
    setRoughP(String(item.baseP));
    setRoughF(String(item.baseF));
    setRoughC(String(item.baseC));
    setRoughView('form');
  };

  const handleApplyAutoCalToRough = () => {
    const cal = parseFloat(roughAutoCal) || 0;
    if (cal <= 0) return;
    const macros = calcMacrosFromCalories(cal, target.pRatio, target.fRatio, target.cRatio);
    setRoughP(String(macros.p));
    setRoughF(String(macros.f));
    setRoughC(String(macros.c));
  };

  const handleSubmitRoughForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roughName.trim()) return;

    const item: RoughPresetItem = {
      id: editingRoughId || `rough-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: roughName.trim(),
      icon: roughIcon.trim() || '🍽️',
      baseP: round1(parseFloat(roughP) || 0),
      baseF: round1(parseFloat(roughF) || 0),
      baseC: round1(parseFloat(roughC) || 0),
    };
    onSaveRoughPreset(item);
    setRoughView('manage');
  };

  // カロリーだけ入力の換算と送信
  const numCalOnly = Math.max(0, Math.round(parseFloat(calValue) || 0));
  const estimatedMacros = calcMacrosFromCalories(numCalOnly, target.pRatio, target.fRatio, target.cRatio);

  const handleSubmitCaloriesOnly = (e: React.FormEvent) => {
    e.preventDefault();
    if (numCalOnly <= 0) return;

    const title = calName.trim() || 'ざっくり食事';
    const newLog: IntakeLogItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `${title}（約${numCalOnly}kcal）`,
      unit: '食',
      baseAmount: 1,
      currentAmount: 1,
      baseP: estimatedMacros.p,
      baseF: estimatedMacros.f,
      baseC: estimatedMacros.c,
      currentP: estimatedMacros.p,
      currentF: estimatedMacros.f,
      currentC: estimatedMacros.c,
      timestamp: Date.now(),
      mealType,
      isRough: true,
    };

    onAdd(newLog);
    setCalName('');
    setCalValue('');
    onClose();
  };

  // 詳細PFC送信
  const numP = parseFloat(p) || 0;
  const numF = parseFloat(f) || 0;
  const numC = parseFloat(c) || 0;
  const detailCal = calcCalories(numP, numF, numC);

  const handleSubmitDetail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const currentAmount = parseFloat(amount) || 1;
    const currentP = round1(numP);
    const currentF = round1(numF);
    const currentC = round1(numC);

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
      mealType,
    };

    onAdd(newLog);
    setName('');
    setAmount('1');
    setUnit('人前');
    setP('');
    setF('');
    setC('');
    onClose();
  };

  const roughFormPreviewCal = calcCalories(
    parseFloat(roughP) || 0,
    parseFloat(roughF) || 0,
    parseFloat(roughC) || 0
  );

  // AI検索結果のフォーム適用と送信
  const handleApplyAiEstimate = (result: NutritionEstimateResult) => {
    setAiResult(result);
    setAiName(result.name);
    setAiCategory(result.category);
    setAiAmount(String(result.baseAmount));
    setAiUnit(result.unit);
    setAiP(String(result.baseP));
    setAiF(String(result.baseF));
    setAiC(String(result.baseC));
  };

  const numAiP = parseFloat(aiP) || 0;
  const numAiF = parseFloat(aiF) || 0;
  const numAiC = parseFloat(aiC) || 0;
  const aiCal = calcCalories(numAiP, numAiF, numAiC);

  const handleSubmitAi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiName.trim()) return;

    const currentAmount = Math.max(0.1, round1(parseFloat(aiAmount) || 1));
    const safeUnit = aiUnit.trim() || '食';
    const currentP = round1(numAiP);
    const currentF = round1(numAiF);
    const currentC = round1(numAiC);
    const formattedAmount = Number.isInteger(currentAmount) ? currentAmount : round1(currentAmount);

    const newLog: IntakeLogItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `${aiName.trim()} ${formattedAmount}${safeUnit}`,
      unit: safeUnit,
      baseAmount: currentAmount,
      currentAmount,
      baseP: currentP,
      baseF: currentF,
      baseC: currentC,
      currentP,
      currentF,
      currentC,
      timestamp: Date.now(),
      mealType,
      isRough: aiResult ? aiResult.confidence !== 'high' : true,
    };

    onAdd(newLog);

    if (saveAsPreset && onSavePreset) {
      onSavePreset({
        id: `preset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: aiName.trim(),
        category: aiCategory,
        unit: safeUnit,
        baseAmount: currentAmount,
        baseP: currentP,
        baseF: currentF,
        baseC: currentC,
      });
    }

    setAiResult(null);
    setAiName('');
    setAiP('');
    setAiF('');
    setAiC('');
    setSaveAsPreset(false);
    onClose();
  };

  const showMealSelector = !(activeTab === 'rough' && roughView !== 'pick');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-200">
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            {activeTab === 'rough' && roughView !== 'pick' ? (
              <button
                type="button"
                onClick={() => setRoughView(roughView === 'form' ? 'manage' : 'pick')}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors"
                aria-label="戻る"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                ざっくり & 自由記録
              </span>
              <h3 className="text-base font-bold text-white leading-tight">
                {activeTab === 'rough' && roughView === 'manage'
                  ? 'ざっくりメニューの管理'
                  : activeTab === 'rough' && roughView === 'form'
                  ? editingRoughId
                    ? 'メニューを編集'
                    : '新規メニューを追加'
                  : '外食・単品の記録'}
              </h3>
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

        {/* 4タブ切替 */}
        <div className="grid grid-cols-4 gap-1 bg-slate-950/90 p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('rough');
              setRoughView('pick');
            }}
            className={`py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'rough'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>ざっくり</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'ai'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>AI検索</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calories')}
            className={`py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'calories'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>カロリー</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('detail')}
            className={`py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'detail'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>詳細PFC</span>
          </button>
        </div>

        {/* 記録先（食事区分）セレクター */}
        {showMealSelector && (
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">記録先</label>
            <div className="grid grid-cols-4 gap-1.5">
              {mealOptions.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMealType(m.id)}
                  className={`py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    mealType === m.id
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ==================== タブ1: ざっくり記録 ==================== */}
        {activeTab === 'rough' && roughView === 'pick' && (
          <div className="space-y-3">
            {/* ボリューム選択 + 編集ボタン */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 flex-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {scaleOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setScaleKey(opt.key)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      scaleKey === opt.key
                        ? 'bg-purple-500/25 text-purple-200 border border-purple-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setRoughView('manage')}
                className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold transition-colors flex items-center gap-1 shrink-0"
              >
                <Edit2 className="w-3 h-3" />
                <span>編集</span>
              </button>
            </div>

            {/* ざっくりメニューグリッド */}
            <div className="grid grid-cols-2 gap-2 max-h-[38vh] overflow-y-auto no-scrollbar pr-0.5">
              {roughPresets.map((preset) => {
                const scaledP = round1(preset.baseP * selectedScale.scale);
                const scaledF = round1(preset.baseF * selectedScale.scale);
                const scaledC = round1(preset.baseC * selectedScale.scale);
                const cal = calcCalories(scaledP, scaledF, scaledC);

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePickRoughPreset(preset)}
                    className="text-left bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-2.5 transition-all active:scale-95 flex flex-col justify-between gap-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg leading-none">{preset.icon}</span>
                      <span className="text-xs font-bold text-white truncate">{preset.name}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-black text-orange-400">{cal} kcal</span>
                      <span className="text-[10px] font-mono text-slate-500">
                        P{Math.round(scaledP)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 今日はお休み日トグル */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onToggleRestDay();
                  onClose();
                }}
                className={`w-full py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all active:scale-98 flex items-center justify-center gap-1.5 ${
                  isRestDay
                    ? 'bg-purple-500/20 border-purple-400/50 text-purple-200 hover:bg-purple-500/30'
                    : 'bg-slate-950 border-slate-800 hover:border-purple-500/40 text-slate-300 hover:text-purple-200'
                }`}
              >
                <Coffee className="w-4 h-4 text-purple-300" />
                <span>
                  {isRestDay
                    ? '🌿 お休み日を解除する'
                    : '🌿 今日はお休み日（チートデイ）にする'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ==================== ざっくり管理画面 ==================== */}
        {activeTab === 'rough' && roughView === 'manage' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleStartCreateRough}
              className="w-full py-2.5 px-3 rounded-2xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>新しいざっくりメニューを追加</span>
            </button>

            <div className="space-y-2 max-h-[42vh] overflow-y-auto no-scrollbar pr-0.5">
              {roughPresets.map((item) => {
                const cal = calcCalories(item.baseP, item.baseF, item.baseC);
                return (
                  <div
                    key={item.id}
                    className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{item.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{item.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          <span className="text-orange-400 font-bold">{cal} kcal</span> | P:{item.baseP} F:{item.baseF} C:{item.baseC}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditRough(item)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                        title="編集"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`「${item.name}」を削除しますか？`)) {
                            onDeleteRoughPreset(item.id);
                          }
                        }}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
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
              type="button"
              onClick={() => {
                if (window.confirm('ざっくりメニューを初期の定番8種に戻しますか？')) {
                  onResetRoughPresets();
                }
              }}
              className="w-full py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-[11px] font-bold text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>定番8種にリセットする</span>
            </button>
          </div>
        )}

        {/* ==================== ざっくりメニュー作成/編集フォーム ==================== */}
        {activeTab === 'rough' && roughView === 'form' && (
          <form onSubmit={handleSubmitRoughForm} className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-300">アイコン</label>
              <div className="flex flex-wrap gap-1.5">
                {emojiSuggestions.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setRoughIcon(em)}
                    className={`w-8 h-8 rounded-xl text-base flex items-center justify-center border transition-all ${
                      roughIcon === em
                        ? 'bg-purple-500/25 border-purple-400 scale-105'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">絵文字</label>
                <input
                  type="text"
                  value={roughIcon}
                  onChange={(e) => setRoughIcon(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-center text-base text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-bold text-slate-300 mb-1">メニュー名</label>
                <input
                  type="text"
                  required
                  placeholder="例: 定食・丼もの"
                  value={roughName}
                  onChange={(e) => setRoughName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* カロリーから自動換算ヘルパー */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-400">
                PFCが不明な場合：カロリーから自動入力
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="例: 700"
                  value={roughAutoCal}
                  onChange={(e) => setRoughAutoCal(cleanNumberInput(e.target.value))}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={handleApplyAutoCalToRough}
                  className="px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 text-xs font-bold transition-colors"
                >
                  自動計算
                </button>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">普通 (1.0x) あたりのPFC</span>
                <span className="text-xs font-bold text-orange-400">{roughFormPreviewCal} kcal</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-sky-400 mb-1">P (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    value={roughP}
                    onChange={(e) => setRoughP(cleanNumberInput(e.target.value))}
                    className="w-full bg-slate-900 border border-sky-500/30 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-400 mb-1">F (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    value={roughF}
                    onChange={(e) => setRoughF(cleanNumberInput(e.target.value))}
                    className="w-full bg-slate-900 border border-amber-500/30 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-400 mb-1">C (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    value={roughC}
                    onChange={(e) => setRoughC(cleanNumberInput(e.target.value))}
                    className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRoughView('manage')}
                className="flex-1 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
              >
                戻る
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{editingRoughId ? '更新する' : '追加する'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ==================== タブ2: AI栄養検索 ==================== */}
        {activeTab === 'ai' && (
          <div className="space-y-3">
            <AiNutritionSearch onSelectResult={handleApplyAiEstimate} />

            {aiResult && (
              <form onSubmit={handleSubmitAi} className="space-y-3 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">メニュー・品名</label>
                  <input
                    type="text"
                    required
                    value={aiName}
                    onChange={(e) => setAiName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">基準量</label>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      required
                      value={aiAmount}
                      onFocus={(e) => {
                        const el = e.target;
                        setTimeout(() => el.select(), 50);
                      }}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      onChange={(e) => setAiAmount(cleanNumberInput(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">単位</label>
                    <input
                      type="text"
                      required
                      value={aiUnit}
                      onChange={(e) => setAiUnit(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">推定PFC（微調整OK）</span>
                    <span className="text-xs font-bold text-orange-400">{aiCal} kcal</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-sky-400 mb-1">P (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={aiP}
                        onChange={(e) => setAiP(cleanNumberInput(e.target.value))}
                        className="w-full bg-slate-900 border border-sky-500/30 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-400 mb-1">F (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={aiF}
                        onChange={(e) => setAiF(cleanNumberInput(e.target.value))}
                        className="w-full bg-slate-900 border border-amber-500/30 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-400 mb-1">C (g)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={aiC}
                        onChange={(e) => setAiC(cleanNumberInput(e.target.value))}
                        className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 定番パーツにも同時保存するオプション */}
                {onSavePreset && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-2.5 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-200">
                      <input
                        type="checkbox"
                        checked={saveAsPreset}
                        onChange={(e) => setSaveAsPreset(e.target.checked)}
                        className="w-4 h-4 rounded accent-sky-500"
                      />
                      <span>定番パーツにも保存する（次回から1タップ）</span>
                    </label>
                    {saveAsPreset && (
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        {[
                          { id: 'staple', label: '主食' },
                          { id: 'main', label: '主菜・P' },
                          { id: 'sub', label: '副菜・他' },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setAiCategory(cat.id as CategoryType)}
                            className={`py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                              aiCategory === cat.id
                                ? 'bg-sky-500 text-white'
                                : 'bg-slate-900 border border-slate-800 text-slate-400'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>今日に追加</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ==================== タブ3: カロリーだけ入力 ==================== */}
        {activeTab === 'calories' && (
          <form onSubmit={handleSubmitCaloriesOnly} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                メモ・メニュー名（任意）
              </label>
              <input
                type="text"
                placeholder="例: 外食ランチ（空欄なら「ざっくり食事」）"
                value={calName}
                onChange={(e) => setCalName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">だいたいのカロリー</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="600"
                  value={calValue}
                  onFocus={(e) => {
                    const el = e.target;
                    setTimeout(() => el.select(), 50);
                  }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  onChange={(e) => setCalValue(cleanNumberInput(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xl font-black text-white focus:outline-none focus:border-orange-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  kcal
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {quickCalorieOptions.map((cVal) => (
                  <button
                    key={cVal}
                    type="button"
                    onClick={() => setCalValue(String(cVal))}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      numCalOnly === cVal
                        ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cVal}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400">
                設定中の目標比率（P:{target.pRatio}% F:{target.fRatio}% C:{target.cRatio}%）で仮換算
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl py-1.5">
                  <div className="text-[10px] text-sky-400 font-bold">仮 P</div>
                  <div className="text-sm font-black text-white">{estimatedMacros.p}g</div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl py-1.5">
                  <div className="text-[10px] text-amber-400 font-bold">仮 F</div>
                  <div className="text-sm font-black text-white">{estimatedMacros.f}g</div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-1.5">
                  <div className="text-[10px] text-emerald-400 font-bold">仮 C</div>
                  <div className="text-sm font-black text-white">{estimatedMacros.c}g</div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={numCalOnly <= 0}
                className="flex-1 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>記録する</span>
              </button>
            </div>
          </form>
        )}

        {/* ==================== タブ3: 詳細PFC（既存フォーム） ==================== */}
        {activeTab === 'detail' && (
          <form onSubmit={handleSubmitDetail} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">メニュー・品名</label>
              <input
                type="text"
                required
                placeholder="例: プロテインバー、外食ランチ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">量</label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  placeholder="1"
                  value={amount}
                  onFocus={(e) => {
                    const el = e.target;
                    setTimeout(() => el.select(), 50);
                  }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  onChange={(e) => setAmount(cleanNumberInput(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-sky-500"
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">PFC入力</span>
                <span className="text-xs font-bold text-orange-400">{detailCal} kcal</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-sky-400 mb-1">P (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    value={p}
                    onFocus={(e) => {
                      const el = e.target;
                      setTimeout(() => el.select(), 50);
                    }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    onChange={(e) => setP(cleanNumberInput(e.target.value))}
                    className="w-full bg-slate-900 border border-sky-500/30 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-400 mb-1">F (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    value={f}
                    onFocus={(e) => {
                      const el = e.target;
                      setTimeout(() => el.select(), 50);
                    }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    onChange={(e) => setF(cleanNumberInput(e.target.value))}
                    className="w-full bg-slate-900 border border-amber-500/30 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-400 mb-1">C (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    value={c}
                    onFocus={(e) => {
                      const el = e.target;
                      setTimeout(() => el.select(), 50);
                    }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    onChange={(e) => setC(cleanNumberInput(e.target.value))}
                    className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>記録する</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
