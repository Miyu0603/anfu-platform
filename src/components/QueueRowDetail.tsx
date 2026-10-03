import { useNavigate } from 'react-router-dom';
import { ESCALATION_TEXT } from '../config';
import { STATUS_LABEL } from '../labels';
import { escalationProgress, pad2, type QueueRow } from '../store/selectors';
import { useDispatch } from '../store/StoreContext';

/** Expanded row: contacts, escalation history, notes, and the two city-side marks (which never change status). */
export function QueueRowDetail({ id, row, minute }: { id: string; row: QueueRow; minute: number }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { callout: c, facility: f } = row;
  const pending = c.status === 'pending';
  const esc = escalationProgress(c, minute);
  const heading = 'mb-1.5 text-xs text-ink-2';

  return (
    <div id={id} className="grid gap-6 bg-surface px-4 pt-1.5 pb-4 text-[13px] md:grid-cols-[1.3fr_1fr_1.2fr] md:pl-[68px]">
      <div>
        <div className={heading}>聯絡人</div>
        {f.contacts.map((p) => (
          <div key={p.phone + p.name} className="flex flex-wrap gap-x-2 py-0.5">
            <span className="font-bold">{p.name}</span>
            <span className="text-ink-2">
              {p.role} · {p.isPrimary ? '主要' : '第二'}
            </span>
            <a className="ml-auto font-mono underline-offset-2 hover:underline" href={`tel:${p.phone}`}>
              {p.phone}
            </a>
          </div>
        ))}
      </div>

      <div>
        <div className={heading}>升級歷程</div>
        {esc.fired.length === 0 && <div className="text-ink-2">尚未升級</div>}
        {esc.fired.map((e) => (
          <div key={e.level} className="flex gap-2.5 py-0.5">
            <span className="font-mono text-pending-txt">第 {pad2(e.minute)} 分</span>
            <span>{ESCALATION_TEXT[e.level].did}</span>
          </div>
        ))}
        {pending && (
          <div className="mt-2 flex items-center gap-2">
            <div
              className="h-[3px] w-[120px] overflow-hidden rounded-sm bg-line"
              role="progressbar"
              aria-label="距離下一次升級"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(esc.progress * 100)}
            >
              <div className="h-[3px] bg-need-bar" style={{ width: `${Math.round(esc.progress * 100)}%` }} />
            </div>
            <span className="text-xs text-pending-txt">
              {esc.next ? `${esc.minutesToNext} 分後${ESCALATION_TEXT[esc.next.level].did}` : '已達最高升級等級'}
            </span>
          </div>
        )}
      </div>

      <div>
        <div className={heading}>回報備註</div>
        <div>{c.note ?? (pending ? '（尚未回報）' : '—')}</div>
        {c.reports.length > 1 && (
          <ul className="mt-1.5 text-xs text-ink-2">
            {c.reports.map((r, i) => (
              <li key={i}>
                第 {pad2(r.at)} 分 {i === 0 ? '回報' : '更正為'}「{STATUS_LABEL[r.outcome]}」
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            aria-pressed={c.opsNote === 'contacted'}
            onClick={() => dispatch({ type: 'MARK_OPS', calloutId: c.id, opsNote: 'contacted' })}
          >
            {c.opsNote === 'contacted' ? '已標記聯繫' : '標記已聯繫'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            aria-pressed={c.opsNote === 'site-check'}
            onClick={() => dispatch({ type: 'MARK_OPS', calloutId: c.id, opsNote: 'site-check' })}
          >
            {c.opsNote === 'site-check' ? '已標記現地確認' : '標記需現地確認'}
          </button>
          {pending && (
            <button
              type="button"
              className="rounded-md border border-dashed border-pending-bd px-3 py-1.5 text-[13px] text-pending-txt hover:bg-hover"
              onClick={() => navigate(`/r/${c.token}`)}
            >
              開啟回報頁（Demo）
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
