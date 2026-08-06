import { useEffect, useRef, useState } from 'react';
import { Activity, BarChart3, ChevronDown } from 'lucide-react';
import type { ChartView } from './metric-chart';

export type PeriodOption = { label: string; points?: number };

// مبدّل شكل الرسم: منحنى / أعمدة
export const ViewToggle = ({ value, onChange }: { value: ChartView; onChange: (v: ChartView) => void }) => (
  <div className="pointer-events-auto inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-800">
    {([
      { key: 'curve' as const, Icon: Activity },
      { key: 'bars' as const, Icon: BarChart3 },
    ]).map(({ key, Icon }) => (
      <button
        key={key}
        type="button"
        onClick={() => onChange(key)}
        className={`flex h-6 w-7 items-center justify-center rounded-md transition-colors ${
          value === key ? 'bg-white text-brand-600 shadow-sm dark:bg-gray-700 dark:text-brand-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
        aria-label={key}
      >
        <Icon size={13} strokeWidth={2.4} />
      </button>
    ))}
  </div>
);

// قائمة اختيار الفترة
export const PeriodSelect = ({
  value,
  options,
  onChange,
  accentText,
}: {
  value: string;
  options: PeriodOption[];
  onChange: (o: PeriodOption) => void;
  accentText?: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={ref} className="pointer-events-auto relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-lg px-1.5 py-1 font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
        style={{ color: accentText }}
      >
        {value}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute end-0 top-full z-30 mt-1 min-w-[150px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900">
          {options.map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => { onChange(o); setOpen(false); }}
              className={`block w-full px-3 py-1.5 text-start text-[13px] hover:bg-gray-50 dark:hover:bg-gray-800 ${
                o.label === value ? 'font-semibold text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
