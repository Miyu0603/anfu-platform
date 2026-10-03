import { forwardRef } from 'react';
import { OPS_LABEL, STATUS_LABEL, VULNERABILITY_LABEL, toneClass } from '../labels';
import { escalationProgress, pad2, type QueueRow as Row } from '../store/selectors';
import { StatusPill } from './StatusPill';
import { QueueRowDetail } from './QueueRowDetail';

/** Desktop column template from the handoff; phones use a compact two-line layout instead. */
export const QUEUE_COLUMNS = 'md:grid-cols-[4px_52px_minmax(0,1fr)_72px_76px_60px_100px_230px]';

interface Props {
  row: Row;
  minute: number;
  open: boolean;
  onToggle: () => void;
}

function timeText(row: Row, minute: number): string {
  const c = row.callout;
  if (c.status === 'pending') return `未確認 ${pad2(minute)} 分 · ${escalationProgress(c, minute).currentChannel}`;
  const at = pad2(c.respondedAt ?? 0);
  return row.leaving ? `第 ${at} 分回報 · 移入已回報` : `第 ${at} 分回報`;
}

export const QueueRow = forwardRef<HTMLLIElement, Props>(function QueueRow({ row, minute, open, onToggle }, ref) {
  const { callout: c, facility: f } = row;
  const rank = row.rank === null ? '—' : String(row.rank).padStart(3, '0');
  const time = timeText(row, minute);
  const detailId = `detail-${c.id}`;
  const ops = c.opsNote ? (
    <span className="whitespace-nowrap rounded border border-tag-bd px-1.5 text-[11px] text-accent-ink">{OPS_LABEL[c.opsNote]}</span>
  ) : null;

  return (
    <li
      ref={ref}
      className={`${toneClass(c.status)} border-b border-line-row transition-opacity duration-200`}
      style={{ background: 'var(--t-tint)', opacity: row.leaving ? 0.5 : 1 }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailId}
        onClick={onToggle}
        aria-label={`${row.rank ?? ''} ${f.name}，${STATUS_LABEL[c.status]}，${time}`}
        className={`grid w-full grid-cols-[4px_32px_minmax(0,1fr)_auto] items-center gap-x-3 pr-4 text-left text-sm hover:bg-hover md:h-12 ${QUEUE_COLUMNS}`}
      >
        <span className="self-stretch" style={{ background: 'var(--t-bar)' }} aria-hidden />
        <span className="text-right font-mono text-[13px] font-medium text-ink-faint">{rank}</span>
        <span className="min-w-0 py-2 md:py-0">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[15px] font-bold">{f.name}</span>
            {ops}
          </span>
          <span className="mt-0.5 block truncate text-xs text-ink-3 md:hidden">
            {f.district} · {f.type} · 脆弱度 {VULNERABILITY_LABEL[f.vulnerability]}
          </span>
          <span className="mt-0.5 block truncate font-mono text-xs md:hidden" style={{ color: 'var(--t-txt)' }}>
            {time}
          </span>
        </span>
        <span className="hidden text-ink-3 md:block">{f.district}</span>
        <span className="hidden text-ink-3 md:block">{f.type}</span>
        <span className="hidden text-ink-3 md:block">{VULNERABILITY_LABEL[f.vulnerability]}</span>
        <span>
          <StatusPill status={c.status} />
        </span>
        <span className="hidden truncate font-mono text-[13px] font-medium md:block" style={{ color: 'var(--t-txt)' }}>
          {time}
        </span>
      </button>
      {open && <QueueRowDetail id={detailId} row={row} minute={minute} />}
    </li>
  );
});

