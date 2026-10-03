import { CONFIG } from '../config';
import type { DrillSummary } from '../store/selectors';

const W = 760;
const H = 210;
const X0 = 40;
const X1 = 720;
const Y0 = 170; // baseline
const Y1 = 20; // top

/** Cumulative replies over time, with a dashed marker at each escalation minute. Hand-written SVG on purpose. */
export function ReplyCurve({ summary }: { summary: DrillSummary }) {
  const { spanMinutes: span, total, curve } = summary;
  const x = (m: number) => X0 + (m / span) * (X1 - X0);
  const y = (n: number) => Y0 - (total ? n / total : 0) * (Y0 - Y1);
  const line = curve.map((n, m) => `${m ? 'L' : 'M'}${x(m).toFixed(1)},${y(n).toFixed(1)}`).join(' ');
  const lastX = x(curve.length - 1).toFixed(1);
  const area = curve.length ? `${line} L${lastX},${Y0} L${X0},${Y0} Z` : '';
  const ticks = Array.from({ length: Math.floor(span / 5) + 1 }, (_, i) => i * 5);
  const escalations = CONFIG.escalation.filter((e) => e.minute <= span);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block h-auto w-full max-w-[900px]"
      role="img"
      aria-label={`回報累積曲線：${total} 家中 ${summary.replied} 家已回報，升級時點為第 ${escalations.map((e) => e.minute).join('、')} 分`}
    >
      <g stroke="var(--line-row)">
        {[Y1, (Y0 + Y1) / 2, Y0].map((yy) => (
          <line key={yy} x1={X0} y1={yy} x2={X1} y2={yy} />
        ))}
      </g>
      <g stroke="var(--pending-bar)" strokeDasharray="3 3">
        {escalations.map((e) => (
          <line key={e.level} x1={x(e.minute)} y1={Y1 - 6} x2={x(e.minute)} y2={Y0} />
        ))}
      </g>
      <g fontSize="10" fill="var(--pending-txt)" fontFamily="JetBrains Mono, monospace">
        {escalations.map((e) => (
          <text key={e.level} x={x(e.minute) + 4} y={Y1 + 4}>
            L{e.level}
          </text>
        ))}
      </g>
      <path d={area} fill="var(--accent-soft)" />
      <path d={line} fill="none" stroke="var(--chart-line)" strokeWidth="2" />
      <g fontSize="10" fill="var(--ink-2)" fontFamily="JetBrains Mono, monospace">
        {ticks.map((m) => (
          <text key={m} x={x(m)} y={Y0 + 16} textAnchor="middle">
            {m === span || m === ticks[ticks.length - 1] ? `${m} 分` : m}
          </text>
        ))}
        <text x={X0 - 8} y={Y1 + 4} textAnchor="end">{total}</text>
        <text x={X0 - 8} y={Y0 + 4} textAnchor="end">0</text>
      </g>
    </svg>
  );
}
