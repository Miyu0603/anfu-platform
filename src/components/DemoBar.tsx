import { pad2 } from '../store/selectors';
import { useAppState, useDispatch } from '../store/StoreContext';

/** Demo-only control strip. The only place in the product allowed to say 模擬. Always dark in both themes. */
export function DemoBar() {
  const { minute, playing, activeDrillId } = useAppState();
  const dispatch = useDispatch();
  const hasDrill = !!activeDrillId;
  const btn =
    'rounded border border-[#2a3442] px-2.5 py-1 text-[#e6ebf2] hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent';
  return (
    <div
      className="flex min-h-[34px] flex-none flex-wrap items-center gap-x-3.5 gap-y-1 border-b border-[#1c2531] bg-demo-bar px-4 py-1 font-mono text-xs font-medium text-[#c8d1de]"
      role="region"
      aria-label="模擬控制"
    >
      <span className="font-bold tracking-[.08em] text-[#ffb42e]">模擬資料</span>
      <span className="text-[#3a4556]" aria-hidden>|</span>
      <span>已進行 {hasDrill ? `${pad2(minute)}:00` : '—'}</span>
      <span className="text-[#3a4556]" aria-hidden>|</span>
      <span className="flex gap-2">
        <button
          type="button"
          className={btn}
          disabled={!hasDrill}
          onClick={() => dispatch({ type: 'SIM_SET_PLAYING', playing: !playing })}
        >
          {playing ? '暫停' : '播放'}
        </button>
        <button type="button" className={btn} onClick={() => dispatch({ type: 'SIM_RESET' })}>
          重設
        </button>
        <button type="button" className={btn} disabled={!hasDrill} onClick={() => dispatch({ type: 'SIM_FAST_FORWARD' })}>
          快轉到結束
        </button>
      </span>
    </div>
  );
}
