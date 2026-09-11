import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CalendarViewProps {
  selected?: Date | null;
  onSelect?: (date: Date | null) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function CalendarView({ selected, onSelect }: CalendarViewProps) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const daysInMonth = useMemo(() => getDaysInMonth(viewYear, viewMonth), [viewYear, viewMonth]);
  const firstDay = useMemo(() => getFirstDayOfMonth(viewYear, viewMonth), [viewYear, viewMonth]);

  const cells = useMemo(() => {
    const blanks = Array.from({ length: firstDay }, (_, i) => null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return [...blanks, ...days];
  }, [firstDay, daysInMonth]);

  const prev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const next = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const handleDayClick = (day: number) => {
    const clicked = new Date(viewYear, viewMonth, day);
    if (selected && isSameDay(clicked, selected)) {
      onSelect?.(null);
    } else {
      onSelect?.(clicked);
    }
  };

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 w-full max-w-xs shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
          <ChevronLeft className="h-4 w-4 text-gray-500" />
        </button>
        <span className="text-sm font-semibold text-gray-900">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button onClick={next} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} />;
          const date = new Date(viewYear, viewMonth, day);
          const isToday = isSameDay(date, today);
          const isSelected = selected ? isSameDay(date, selected) : false;

          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              className={`
                relative flex items-center justify-center h-9 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer
                ${isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : isToday
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {selected && (
        <button
          onClick={() => onSelect?.(null)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
          Clear date
        </button>
      )}
    </div>
  );
}
