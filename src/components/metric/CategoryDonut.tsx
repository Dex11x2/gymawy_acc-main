import { useState } from 'react';
import { SERIES_COLORS, formatCompact } from './metric-chart';

export interface DonutDatum { name: string; value: number }

// دونات تفاعلي: مركز يعرض الإجمالي/القسم + ليجند بالقيم والنِسب + تمييز بالحوم
export const CategoryDonut = ({ data, unit = '' }: { data: DonutDatum[]; unit?: string }) => {
  const [hi, setHi] = useState<number | null>(null);
  const clean = (data || []).filter((d) => d.value > 0);
  const total = clean.reduce((s, d) => s + d.value, 0);

  if (!clean.length || total <= 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-gray-400">لا توجد بيانات لعرضها</div>
    );
  }

  const r = 70;
  const C = 2 * Math.PI * r;
  const sw = 22;
  const gap = clean.length > 1 ? 0.012 : 0; // فراغ بسيط بين الأقسام

  let acc = 0;
  const segs = clean.map((d, i) => {
    const frac = d.value / total;
    const seg = { ...d, i, frac, offset: acc };
    acc += frac;
    return seg;
  });
  const active = hi != null ? segs[hi] : null;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      {/* الدونات */}
      <div className="relative shrink-0" style={{ width: 200, height: 200 }}>
        <svg viewBox="0 0 200 200" className="h-[200px] w-[200px] -rotate-90">
          <circle cx="100" cy="100" r={r} fill="none" stroke="currentColor" className="text-gray-100 dark:text-gray-800" strokeWidth={sw} />
          {segs.map((s) => {
            const len = Math.max(0, s.frac - gap) * C;
            return (
              <circle
                key={s.i}
                cx="100"
                cy="100"
                r={r}
                fill="none"
                stroke={SERIES_COLORS[s.i % SERIES_COLORS.length]}
                strokeWidth={hi === s.i ? sw + 6 : sw}
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-s.offset * C}
                strokeLinecap="round"
                opacity={hi == null || hi === s.i ? 1 : 0.32}
                onMouseEnter={() => setHi(s.i)}
                onMouseLeave={() => setHi(null)}
                className="cursor-pointer transition-all duration-200"
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="max-w-[120px] truncate text-xs text-gray-500 dark:text-gray-400">{active ? active.name : 'الإجمالي'}</span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatCompact(active ? active.value : total)}</span>
          <span className="text-[11px] text-gray-400">{active ? `${Math.round(active.frac * 100)}%` : unit}</span>
        </div>
      </div>

      {/* الليجند */}
      <div className="w-full flex-1 space-y-1.5">
        {segs.map((s) => (
          <div
            key={s.i}
            onMouseEnter={() => setHi(s.i)}
            onMouseLeave={() => setHi(null)}
            className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors ${hi === s.i ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SERIES_COLORS[s.i % SERIES_COLORS.length] }} />
              <span className="truncate text-sm text-gray-700 dark:text-gray-200">{s.name}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2 text-sm">
              <span className="font-semibold text-gray-900 dark:text-white">{formatCompact(s.value)}</span>
              <span className="w-9 text-end text-xs text-gray-400">{Math.round(s.frac * 100)}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryDonut;
