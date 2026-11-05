import React, { useState } from 'react';
import { getTodayDateString } from '../utils/calculations';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check } from 'lucide-react';

interface CalendarModalProps {
  isOpen: boolean;
  selectedDate: string; // YYYY-MM-DD
  loggedDates: string[]; // 記録がある日付の配列
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  selectedDate,
  loggedDates,
  onSelectDate,
  onClose,
}) => {
  const today = getTodayDateString();

  // 表示中の年月
  const [currentYear, setCurrentYear] = useState(() => {
    const [y] = selectedDate.split('-').map(Number);
    return y || new Date().getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    const [, m] = selectedDate.split('-').map(Number);
    return m ? m - 1 : new Date().getMonth();
  });

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // カレンダーマトリクスの生成
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0:日曜日
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const handleDayClick = (day: number) => {
    const m = String(currentMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${m}-${d}`;
    onSelectDate(dateStr);
    onClose();
  };

  const handleGoToday = () => {
    onSelectDate(today);
    onClose();
  };

  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full sm:max-w-sm bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom duration-200">
        {/* ヘッダー */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">カレンダー</span>
              <h3 className="text-base font-bold text-white">日付を選択して振り返り</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 年月切り替えバー */}
        <div className="flex items-center justify-between px-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-sm font-black text-white">
            {currentYear}年 {currentMonth + 1}月
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdays.map((w, idx) => (
            <div
              key={w}
              className={`text-[11px] font-bold py-1 ${
                idx === 0 ? 'text-rose-400' : idx === 6 ? 'text-sky-400' : 'text-slate-400'
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {days.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-10" />;
            }

            const m = String(currentMonth + 1).padStart(2, '0');
            const d = String(day).padStart(2, '0');
            const dateStr = `${currentYear}-${m}-${d}`;
            const isSelected = selectedDate === dateStr;
            const isToday = today === dateStr;
            const hasLog = loggedDates.includes(dateStr);

            return (
              <button
                key={dateStr}
                onClick={() => handleDayClick(day)}
                className={`relative h-10 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                    : isToday
                    ? 'bg-sky-500/15 border border-sky-500/50 text-sky-300'
                    : 'hover:bg-slate-800 text-slate-200'
                }`}
              >
                <span>{day}</span>
                {/* 記録がある日のドットマーク */}
                {hasLog && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      isSelected ? 'bg-white' : 'bg-orange-400'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* フッター: 今日に戻る & 閉じる */}
        <div className="flex gap-2 pt-1 border-t border-slate-800">
          <button
            type="button"
            onClick={handleGoToday}
            className="flex-1 py-2.5 rounded-2xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-400 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>今日（{today.slice(5).replace('-', '/')}）へ</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
