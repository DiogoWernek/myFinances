import React, { useState } from 'react';
import { formatCurrency } from '../lib/format';

export interface DonutSlice {
  id: string;
  label: string;
  color: string;
  value: number;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  centerFallbackLabel?: string;
  wrapperClassName?: string;
  showLegend?: boolean;
}

const DonutChart: React.FC<DonutChartProps> = ({
  data, size = 180, strokeWidth = 24, centerFallbackLabel = 'Total',
  wrapperClassName, showLegend = true,
}) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const hoveredSlice = data.find(d => d.id === hovered);

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${wrapperClassName || ''}`} style={wrapperClassName ? undefined : { width: size, height: size }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="block">
          {data.map(d => {
            const len = total > 0 ? (d.value / total) * circumference : 0;
            const isActive = hovered === d.id;
            const isDimmed = !!hovered && !isActive;
            const seg = (
              <circle
                key={d.id}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={isActive ? strokeWidth + 5 : strokeWidth}
                strokeDasharray={`${Math.max(len - 2, 0)} ${circumference - len + 2}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${cx} ${cy})`}
                onMouseEnter={() => setHovered(d.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ opacity: isDimmed ? 0.28 : 1, cursor: 'pointer', transition: 'opacity .25s, stroke-width .2s' }}
              />
            );
            offset += len;
            return seg;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-3)]">
            {hoveredSlice ? hoveredSlice.label : centerFallbackLabel}
          </div>
          <div className="font-serif text-[22px] leading-none tabular-nums text-[var(--text)]">
            {formatCurrency(hoveredSlice ? hoveredSlice.value : total)}
          </div>
        </div>
      </div>
      {showLegend && (
        <div className="mt-4 w-full flex flex-col gap-0.5">
          {data.map(d => {
            const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
            const isActive = hovered === d.id;
            return (
              <div
                key={d.id}
                onMouseEnter={() => setHovered(d.id)}
                onMouseLeave={() => setHovered(null)}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-[10px] cursor-pointer transition-opacity duration-200"
                style={{
                  opacity: hovered && !isActive ? 0.4 : 1,
                  background: isActive ? 'var(--surface-2)' : 'transparent',
                }}
              >
                <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: d.color }} />
                <span className="flex-1 min-w-0 truncate text-[13px] font-semibold text-[var(--text)]">{d.label}</span>
                <span className="text-xs text-[var(--text-3)] tabular-nums">{pct}%</span>
                <span className="text-[13px] font-semibold tabular-nums min-w-[78px] text-right text-[var(--text)]">
                  {formatCurrency(d.value)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DonutChart;
