import React from 'react';
import type { MealType, IntakeLogItem } from '../types';
import { calcCalories } from '../utils/calculations';

interface MealSelectorProps {
  activeMealType: MealType;
  onChangeMealType: (meal: MealType) => void;
  todayLogs: IntakeLogItem[];
}

export const meals: { id: MealType; label: string; icon: string }[] = [
  { id: 'breakfast', label: '朝食', icon: '🌅' },
  { id: 'lunch', label: '昼食', icon: '☀️' },
  { id: 'dinner', label: '夕食', icon: '🌙' },
  { id: 'snack', label: '間食', icon: '☕' },
];

export const MealSelector: React.FC<MealSelectorProps> = ({
  activeMealType,
  onChangeMealType,
  todayLogs,
}) => {
  // 各食事区分の合計カロリーを算出
  const mealCalories: Record<MealType, number> = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snack: 0,
  };

  todayLogs.forEach((log) => {
    const meal = log.mealType || 'lunch';
    if (meal in mealCalories) {
      mealCalories[meal] += calcCalories(log.currentP, log.currentF, log.currentC);
    }
  });

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-slate-400">
          記録先: <strong className="text-sky-400 font-bold">{meals.find(m => m.id === activeMealType)?.label}</strong> に加算中
        </span>
        <span className="text-[10px] text-slate-500">
          タップで切替
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 shadow-inner">
        {meals.map((meal) => {
          const isActive = activeMealType === meal.id;
          const cal = mealCalories[meal.id];

          return (
            <button
              key={meal.id}
              onClick={() => onChangeMealType(meal.id)}
              className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all ${
                isActive
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-1 text-xs font-bold leading-none">
                <span>{meal.icon}</span>
                <span>{meal.label}</span>
              </div>
              <span className={`text-[10px] font-mono mt-1 ${isActive ? 'text-sky-100 font-bold' : cal > 0 ? 'text-orange-400 font-semibold' : 'text-slate-600'}`}>
                {cal > 0 ? `${cal}kcal` : '-'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
