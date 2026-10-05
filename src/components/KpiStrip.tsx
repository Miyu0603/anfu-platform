import type { BoardKpis } from '../store/selectors';

const NUM = 'mt-1.5 font-mono text-[34px] font-bold leading-[1.1] md:text-[44px]';

/** Left column on desktop, 2×2 grid on phones. */
export function KpiStrip({ kpis }: { kpis: BoardKpis }) {
  const cell = 'border-b border-line p-4 md:p-5';
  return (
    <section aria-label="點名指標" className="grid grid-cols-2 border-line md:flex md:flex-col md:border-r">
      <div className={`${cell} border-r md:border-r-0`}>
        <div className="text-[13px] text-ink-2">已確認正常</div>
        <div className={`${NUM} text-ok-txt`}>
          {kpis.ok}
          <span className="text-xl text-ink-faint"> / {kpis.total}</span>
        </div>
      </div>
      <div className={`${cell} bg-kpi-pending-bg`}>
        <div className="text-[13px] text-ink-2">尚未確認</div>
        <div className={`${NUM} text-pending-txt`}>{kpis.pending}</div>
      </div>
      <div className={`${cell} border-r md:border-r-0`}>
        <div className="text-[13px] text-ink-2">回報需要協助</div>
        <div className={`${NUM} text-damage-txt`}>{kpis.help}</div>
      </div>
      <div className={cell}>
        <div className="text-[13px] text-ink-2">待處理</div>
        <div className={NUM}>{kpis.todo}</div>
      </div>
    </section>
  );
}
