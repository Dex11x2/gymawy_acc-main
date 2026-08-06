import { useEffect, useMemo, useRef, useState } from 'react';

// ===== الأنواع =====
export type SeriesPoint = { date: string; value: number };
export type MetricAccent = 'emerald' | 'rose' | 'neutral' | 'amber' | 'sky' | 'violet' | 'brand';
export type ChartView = 'curve' | 'bars';
export type MetricSeries = { name: string; data: SeriesPoint[]; accent?: MetricAccent };
export type ChartSeries = { name: string; data: SeriesPoint[]; color: string };

// ===== لوحة الألوان =====
export const ACCENTS: Record<MetricAccent, { stroke: string; text: string }> = {
  emerald: { stroke: '#10b981', text: '#059669' },
  rose: { stroke: '#f43f5e', text: '#e11d48' },
  neutral: { stroke: '#64748b', text: '#475569' },
  amber: { stroke: '#f59e0b', text: '#d97706' },
  sky: { stroke: '#0ea5e9', text: '#0284c7' },
  violet: { stroke: '#8b5cf6', text: '#7c3aed' },
  brand: { stroke: '#F97316', text: '#EA580C' },
};

export const SERIES_COLORS = ['#F97316', '#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#f43f5e'];

// تنسيق مختصر للأرقام (1.2K / 3.4M)
export const formatCompact = (n: number): string => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(abs >= 10_000 ? 0 : 1).replace(/\.0$/, '') + 'K';
  return Math.round(n).toLocaleString();
};

// منحنى ناعم (Catmull-Rom → Bézier)
const smoothPath = (pts: { x: number; y: number }[]): string => {
  if (pts.length < 2) return pts.length ? `M ${pts[0].x} ${pts[0].y}` : '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
};

interface MetricChartProps {
  series: ChartSeries[];
  view: ChartView;
  defaultIndex?: number;
  valueFormatter?: (v: number) => string;
  dateFormatter?: (d: string) => string;
}

export const MetricChart = ({ series, view, defaultIndex, valueFormatter, dateFormatter }: MetricChartProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = series[0]?.data.length ?? 0;
  const fmtV = valueFormatter ?? ((v: number) => v.toLocaleString());
  const fmtD = dateFormatter ?? ((d: string) => d);

  const { W, H, padTop, padBottom, padX, xAt, yAt, min, max } = useMemo(() => {
    const W = size.w, H = size.h;
    const allVals = series.flatMap((s) => s.data.map((d) => d.value));
    let max = allVals.length ? Math.max(...allVals) : 1;
    let min = Math.min(0, ...(allVals.length ? allVals : [0]));
    if (max === min) max = min + 1;
    const padTop = 22, padBottom = 26, padX = 14;
    const xAt = (i: number) => padX + (n <= 1 ? (W - padX * 2) / 2 : (i / (n - 1)) * (W - padX * 2));
    const yAt = (v: number) => padTop + (1 - (v - min) / (max - min)) * (H - padTop - padBottom);
    return { W, H, padTop, padBottom, padX, xAt, yAt, min, max };
  }, [size, series, n]);

  if (W === 0 || H === 0 || n === 0) {
    return <div ref={wrapRef} className="h-full w-full" />;
  }

  const active = Math.min(Math.max(0, hover ?? defaultIndex ?? n - 1), n - 1);
  const activeDate = series[0]?.data[active]?.date ?? '';

  const onMove = (e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = e.clientX - rect.left;
    const ratio = Math.min(1, Math.max(0, (relX - padX) / Math.max(1, W - padX * 2)));
    setHover(Math.round(ratio * (n - 1)));
  };

  const barGroupW = n > 0 ? (W - padX * 2) / n : 0;
  const innerBarW = view === 'bars' ? Math.min(26, (barGroupW * 0.6) / Math.max(1, series.length)) : 0;

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <svg width={W} height={H} className="block">
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`grad-${i}-${s.name.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* خط المؤشر */}
        <line x1={xAt(active)} y1={padTop - 6} x2={xAt(active)} y2={H - padBottom} stroke="currentColor" className="text-gray-300 dark:text-gray-700" strokeWidth="1" strokeDasharray="3 3" />

        {series.map((s, si) => {
          const pts = s.data.map((d, i) => ({ x: xAt(i), y: yAt(d.value) }));
          if (view === 'bars') {
            const offset = (si - (series.length - 1) / 2) * (innerBarW + 2);
            return (
              <g key={si}>
                {s.data.map((d, i) => {
                  const h = Math.max(1, (H - padBottom) - yAt(d.value));
                  const bx = xAt(i) + offset - innerBarW / 2;
                  return (
                    <rect
                      key={i}
                      className="metric-bar"
                      style={{ animationDelay: `${Math.min(i * 12, 300)}ms` }}
                      x={bx}
                      y={yAt(d.value)}
                      width={innerBarW}
                      height={h}
                      rx={Math.min(4, innerBarW / 2)}
                      fill={s.color}
                      opacity={i === active ? 1 : 0.5}
                    />
                  );
                })}
              </g>
            );
          }
          // curve
          const line = smoothPath(pts);
          const area = `${line} L ${xAt(n - 1)} ${H - padBottom} L ${xAt(0)} ${H - padBottom} Z`;
          return (
            <g key={si}>
              <path className="metric-area" d={area} fill={`url(#grad-${si}-${s.name.replace(/\W/g, '')})`} />
              <path
                className="metric-line"
                d={line}
                pathLength={1}
                fill="none"
                stroke={s.color}
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 3px 6px ${s.color}55)` }}
              />
              <circle className="metric-dot-pulse" cx={xAt(active)} cy={yAt(s.data[active]?.value ?? 0)} r="4.5" fill={s.color} stroke="#fff" strokeWidth="2.5" style={{ transition: 'cx 0.15s ease, cy 0.15s ease' }} />
            </g>
          );
        })}
      </svg>

      {/* التلميح (tooltip) */}
      <div
        className="pointer-events-none absolute top-1 z-20 -translate-x-1/2 rounded-lg border border-gray-200 bg-white/95 px-2.5 py-1.5 text-[11px] shadow-lg backdrop-blur transition-[left] duration-150 dark:border-gray-700 dark:bg-gray-900/95"
        style={{ left: Math.min(Math.max(xAt(active), 54), W - 54) }}
      >
        <div className="mb-0.5 font-semibold text-gray-500 dark:text-gray-400">{fmtD(activeDate)}</div>
        {series.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            <span className="font-bold text-gray-900 dark:text-white">{fmtV(s.data[active]?.value ?? 0)}</span>
            {series.length > 1 && <span className="text-gray-400">{s.name}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
