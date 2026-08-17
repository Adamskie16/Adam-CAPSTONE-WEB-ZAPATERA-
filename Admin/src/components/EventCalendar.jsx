// Admin/src/components/EventCalendar.jsx
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, X } from 'lucide-react';

export default function EventCalendar({ events = [], selectedDate, onSelectDate }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const eventDatesMap = {};
  events.forEach((evt) => {
    if (evt.event_date) {
      const d = new Date(evt.event_date);
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!eventDatesMap[key]) eventDatesMap[key] = [];
        eventDatesMap[key].push(evt);
      }
    }
  });

  const days = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, dateKey: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ day: d, isCurrentMonth: true, dateKey: key, events: eventDatesMap[key] || [] });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, isCurrentMonth: false, dateKey: null });
  }

  const todayKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-800 text-sm">
            {monthNames[month]} {year}
          </h3>
        </div>
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
        <span>Su</span>
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
      </div>

      {/* Grid of Days */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {days.map((item, idx) => {
          if (!item.isCurrentMonth) {
            return (
              <div key={idx} className="py-2 text-slate-300 pointer-events-none text-[11px]">
                {item.day}
              </div>
            );
          }

          const hasEvents = item.events && item.events.length > 0;
          const isToday = item.dateKey === todayKey;
          const isSelected = selectedDate === item.dateKey;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => hasEvents && onSelectDate(isSelected ? null : item.dateKey)}
              className={`py-2 rounded-xl flex flex-col items-center justify-center relative transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/30'
                  : isToday
                  ? 'bg-blue-50 text-blue-800 font-bold border border-blue-300'
                  : hasEvents
                  ? 'bg-blue-100/70 hover:bg-blue-200 text-blue-900 font-bold cursor-pointer'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{item.day}</span>
              {hasEvents && (
                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-blue-600'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Filter Status */}
      {selectedDate ? (
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-blue-800 font-semibold flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1" /> Filtered Date: <span className="font-mono ml-1 font-bold">{selectedDate}</span>
          </span>
          <button
            type="button"
            onClick={() => onSelectDate(null)}
            className="text-slate-500 hover:text-rose-600 font-bold flex items-center space-x-0.5 text-[11px]"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Filter</span>
          </button>
        </div>
      ) : (
        <div className="pt-2 border-t border-slate-100 text-center text-[11px] text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5" />
          Highlighted days indicate scheduled barangay events.
        </div>
      )}
    </div>
  );
}
