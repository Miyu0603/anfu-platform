import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { ReplyCurve } from '../components/ReplyCurve';
import { downloadFile, toCsv } from '../lib/csv';
import { STATUS_LABEL, toneClass } from '../labels';
import {
  formatDateTime,
  pad2,
  selectHistory,
  selectHistoryRows,
  wallClock,
  type DrillSummary,
  type HistoryRow,
} from '../store/selectors';
import { useAppState } from '../store/StoreContext';

const pct = (r: number) => `${Math.round(r * 100)}%`;
const escText = (row: HistoryRow) => row.escalations.map((e) => `${e.minute}′ ${e.channel}`).join(' · ') || '—';

/** S5 — after-action review. On phones the list and the detail are separate views. */
export function History() {
  const state = useAppState();
  const { id } = useParams();
  const history = selectHistory(state);
  const selected = history.find((h) => h.drill.id === id) ?? (id ? undefined : history[0]);

  return (
    <AppShell>
      <div className="grid min-h-0 flex-1 md:grid-cols-[300px_minmax(0,1fr)]">
        <nav aria-label="歷次點名" className={`border-line md:block md:border-r ${id ? 'hidden' : ''}`}>
          <h1 className="sr-only">點名紀錄</h1>
          <ul>
            {history.map((h) => {
              const current = selected?.drill.id === h.drill.id;
              return (
                <li key={h.drill.id}>
                  <Link
                    to={`/history/${h.drill.id}`}
                    aria-current={current ? 'page' : undefined}
                    className={`block border-b border-line px-5 py-3.5 hover:bg-hover ${current ? 'bg-accent-soft' : ''}`}
                  >
                    <div className="text-sm font-bold">
                      {h.drill.label}
                      {h.isActive && <span className="ml-2 text-xs font-normal text-pending-txt">進行中</span>}
                    </div>
                    <div className="mt-1 font-mono text-xs text-ink-2">
                      {formatDateTime(h.drill.startedAt)} · {h.total} 家 · {pct(h.rate)} · {h.elapsedMinutes} 分
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className={`min-h-0 ${id ? '' : 'hidden md:block'}`}>
          {selected ? <Detail summary={selected} /> : <p className="p-10 text-ink-2">找不到這筆點名紀錄。</p>}
        </div>
      </div>
    </AppShell>
  );
}

function Detail({ summary }: { summary: DrillSummary }) {
  const state = useAppState();
  const rows = selectHistoryRows(state, summary);
  const { drill } = summary;
  const end = summary.isActive ? '進行中' : wallClock(drill, summary.elapsedMinutes);
  const stats = [
    { k: '對象數', v: String(summary.total) },
    { k: '回報率', v: pct(summary.rate) },
    { k: '中位回報時間', v: summary.medianMinute === null ? '—' : `${summary.medianMinute} 分` },
    { k: '最終未回報', v: String(summary.total - summary.replied) },
  ];

  const exportCsv = () => {
    const body = rows.map((r) => [
      r.facility.name,
      STATUS_LABEL[r.callout.status],
      r.callout.reports.map((rep) => `${rep.at}:${rep.outcome}`).join(' > '),
      escText(r),
      r.callout.opsNote ?? '',
      r.callout.note ?? '',
    ]);
    const csv = toCsv([['機構', '結果', '回報紀錄（分鐘:結果）', '升級歷程', '市府註記', '備註'], ...body]);
    downloadFile(`drill-${drill.id}.csv`, csv, 'text/csv;charset=utf-8');
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 px-4 py-5 md:px-6">
      <Link to="/history" className="text-sm text-accent-ink md:hidden">
        ← 歷次點名
      </Link>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-xl font-bold">{drill.label}</h2>
        <span className="font-mono text-[13px] text-ink-2">
          {wallClock(drill, 0)} – {end}
        </span>
        <button type="button" className="btn-secondary ml-auto" onClick={exportCsv}>
          匯出 CSV
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.k} className="bg-page px-[18px] py-3.5">
            <dt className="text-[13px] text-ink-2">{s.k}</dt>
            <dd className="mt-1 font-mono text-[30px] leading-[1.2] font-bold">{s.v}</dd>
          </div>
        ))}
      </dl>
      <ReplyCurve summary={summary} />
      <div className="min-h-0 flex-1 overflow-auto border-t border-line text-[13px] md:min-h-[160px]">
        <table className="w-full border-collapse">
          <thead className="sr-only">
            <tr><th>機構</th><th>結果</th><th>回報時間</th><th>升級歷程</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.callout.id} className="border-b border-line-row align-top">
                <td className="py-2 pr-3 font-bold">{r.facility.name}</td>
                <td className={`${toneClass(r.callout.status)} py-2 pr-3 font-bold whitespace-nowrap`} style={{ color: 'var(--t-txt)' }}>
                  {STATUS_LABEL[r.callout.status]}
                </td>
                <td className="py-2 pr-3 font-mono whitespace-nowrap">
                  {r.callout.reports[0] ? `第 ${pad2(r.callout.reports[0].at)} 分` : '—'}
                </td>
                <td className="py-2 text-ink-2">{escText(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
