import React from 'react';

const palette = ['#12213a', '#c99b3f', '#2f7d62', '#6d5ca8', '#b5654a', '#4a7ba8', '#8a8f4a', '#9b6b9b'];

export function BarChart({ data = [], height = 210, color = '#12213a', valueLabel = '' }) {
  const width = 640;
  const pad = { top: 18, right: 12, bottom: 32, left: 34 };
  const max = Math.max(1, ...data.map((d) => Number(d.value ?? d.amount ?? d.count ?? 0)));
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const step = innerW / Math.max(1, data.length);
  const barW = Math.min(46, step * 0.58);
  const ticks = [0, 0.5, 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`Bar chart of ${valueLabel || 'values'}`}>
      {ticks.map((t) => {
        const y = pad.top + innerH * (1 - t);
        return <g key={t}><line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="currentColor" className="text-paper-300 dark:text-ink-700" strokeDasharray="3 5" />
          <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="currentColor" className="text-ink-400">{Math.round(max * t)}</text></g>;
      })}
      {data.map((d, i) => {
        const value = Number(d.value ?? d.amount ?? d.count ?? 0);
        const h = Math.max(2, (value / max) * innerH);
        const x = pad.left + i * step + (step - barW) / 2;
        return <g key={i}>
          <rect x={x} y={pad.top + innerH - h} width={barW} height={h} rx="5" fill={color} opacity={0.88} />
          <text x={x + barW / 2} y={height - 10} textAnchor="middle" fontSize="10" fill="currentColor" className="text-ink-500">{d.label}</text>
          <title>{`${d.label}: ${value}${valueLabel ? ` ${valueLabel}` : ''}`}</title>
        </g>;
      })}
    </svg>
  );
}

export function AreaChart({ data = [], height = 210, color = '#2f7d62' }) {
  const width = 640;
  const pad = { top: 18, right: 14, bottom: 32, left: 34 };
  const values = data.map((d) => Number(d.value ?? d.count ?? 0));
  const max = Math.max(1, ...values);
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const points = values.map((v, i) => [pad.left + (i * innerW) / Math.max(1, values.length - 1), pad.top + innerH - (v / max) * innerH]);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const area = `${line} L${points.at(-1)?.[0] ?? pad.left},${pad.top + innerH} L${pad.left},${pad.top + innerH} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Trend chart">
      <defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.28" /><stop offset="1" stopColor={color} stopOpacity="0.01" /></linearGradient></defs>
      {[0, 0.5, 1].map((t) => <line key={t} x1={pad.left} x2={width - pad.right} y1={pad.top + innerH * (1 - t)} y2={pad.top + innerH * (1 - t)} stroke="currentColor" className="text-paper-300 dark:text-ink-700" strokeDasharray="3 5" />)}
      <path d={area} fill="url(#areaFill)" /><path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="3.5" fill="white" stroke={color} strokeWidth="2" />
        <text x={x} y={height - 10} textAnchor="middle" fontSize="10" fill="currentColor" className="text-ink-500">{data[i]?.label}</text></g>)}
    </svg>
  );
}

export function DonutChart({ data = [], size = 168 }) {
  const total = data.reduce((sum, item) => sum + Number(item.count || 0), 0) || 1;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox="0 0 160 160" className="shrink-0 -rotate-90">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="currentColor" className="text-paper-200 dark:text-ink-800" strokeWidth="17" />
        {data.map((item, i) => {
          const length = (Number(item.count || 0) / total) * circumference;
          const circle = <circle key={i} cx="80" cy="80" r={radius} fill="none" stroke={palette[i % palette.length]} strokeWidth="17"
            strokeDasharray={`${Math.max(0, length - 2)} ${circumference}`} strokeDashoffset={-offset} strokeLinecap="round" />;
          offset += length;
          return circle;
        })}
        <text x="80" y="76" textAnchor="middle" fontSize="25" fontWeight="700" fill="currentColor" className="text-ink-900 dark:text-white" transform="rotate(90 80 80)">{total}</text>
        <text x="80" y="94" textAnchor="middle" fontSize="10" fill="currentColor" className="text-ink-500" transform="rotate(90 80 80)">resources</text>
      </svg>
      <div className="flex-1 space-y-1.5">
        {data.slice(0, 6).map((item, i) => <div key={item.value} className="flex items-center gap-2 text-xs">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: palette[i % palette.length] }} />
          <span className="flex-1 truncate text-ink-600 dark:text-ink-300">{item.value}</span>
          <span className="font-semibold text-ink-900 dark:text-white">{item.count}</span>
        </div>)}
      </div>
    </div>
  );
}
