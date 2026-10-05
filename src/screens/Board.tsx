import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { EndDrillButton } from '../components/EndDrillButton';
import { KpiStrip } from '../components/KpiStrip';
import { OkDrawer } from '../components/OkDrawer';
import { QueueList } from '../components/QueueList';
import { QUEUE_COLUMNS } from '../components/QueueRow';
import { activeDrill, pad2, selectKpis, selectOkList, selectQueue } from '../store/selectors';
import { useAppState } from '../store/StoreContext';

/** S2 — the product's core screen. */
export function Board() {
  const state = useAppState();
  const drill = activeDrill(state);
  const [openId, setOpenId] = useState<string | null>(null);

  if (!drill) {
    return (
      <AppShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <h1 className="text-[22px] font-bold">目前沒有進行中的點名</h1>
          <p className="max-w-md text-[15px] leading-relaxed text-ink-2">
            發起點名後，尚未確認與需要協助的機構會依優先順序列在這裡。
          </p>
          <Link to="/drill/new" className="btn-primary px-6 py-3 text-base">
            發起點名
          </Link>
        </div>
      </AppShell>
    );
  }

  const queue = selectQueue(state);
  const kpis = selectKpis(state, queue);
  const allDone = kpis.todo === 0;

  return (
    <AppShell
      actions={
        <>
          <span className="text-sm text-ink-3">{drill.label}</span>
          <span className="mr-2 ml-1 font-mono text-lg font-bold" aria-label={`已進行 ${state.minute} 分`}>
            {pad2(state.minute)}:00
          </span>
          <EndDrillButton />
        </>
      }
    >
      <div className="grid min-h-0 flex-1 md:grid-cols-[240px_minmax(0,1fr)]">
        <KpiStrip kpis={kpis} />
        <section className="flex min-h-0 flex-col" aria-labelledby="queue-title">
          <h1 id="queue-title" className="sr-only">
            未回報優先佇列，依狀態、脆弱度、等待時間排序
          </h1>
          <div
            aria-hidden
            className={`hidden gap-x-3 border-b border-line bg-surface py-2.5 pr-4 text-xs text-ink-2 md:grid ${QUEUE_COLUMNS}`}
          >
            <span />
            <span className="text-right">#</span>
            <span>機構</span>
            <span>行政區</span>
            <span>類型</span>
            <span>脆弱度</span>
            <span>狀態</span>
            <span>時間 · 通道</span>
          </div>
          <div className="relative min-h-0 flex-1 overflow-y-auto" aria-live="polite" aria-relevant="additions removals">
            {allDone && (
              <p className="p-10 text-center text-base font-bold text-ok-txt">全部 {kpis.total} 家均已回報</p>
            )}
            <QueueList
              rows={queue}
              minute={state.minute}
              openId={openId}
              onToggle={(id) => setOpenId((cur) => (cur === id ? null : id))}
            />
          </div>
          <OkDrawer items={selectOkList(state)} />
        </section>
      </div>
    </AppShell>
  );
}
