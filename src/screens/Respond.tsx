import { useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { CONFIG } from '../config';
import { OUTCOME_HINT, STATUS_LABEL, toneClass } from '../labels';
import { canCorrect } from '../store/reducer';
import { pad2, wallClock } from '../store/selectors';
import { useAppState, useDispatch } from '../store/StoreContext';
import type { Outcome } from '../types';

const OUTCOMES: Outcome[] = ['ok', 'need', 'damage'];

/**
 * S3 — opened from an SMS / push link on a phone. No navigation, no login, no confirm dialog:
 * one tap sends the report. Deliberately does not use AppShell.
 */
export function Respond() {
  const { token = '' } = useParams();
  const state = useAppState();
  const dispatch = useDispatch();
  const callout = state.callouts.find((c) => c.token === token);
  const drill = callout ? state.drills.find((d) => d.id === callout.drillId) : undefined;
  const facility = callout ? state.facilities.find((f) => f.id === callout.facilityId) : undefined;
  // A token is single-use: only a page that saw it pending may show the post-report screen.
  const [openedWhilePending] = useState(() => callout?.status === 'pending');

  useEffect(() => {
    // Demo only: a facility opened by hand overrides its scripted reply.
    if (callout && openedWhilePending) dispatch({ type: 'SIM_CANCEL_SCRIPT', calloutId: callout.id });
  }, [callout?.id, openedWhilePending, dispatch]);

  const live = !!drill && drill.id === state.activeDrillId && state.minute <= (callout?.tokenExpiresAt ?? 0);
  if (!callout || !drill || !facility || !live || !openedWhilePending) {
    return (
      <Frame issued={drill ? issuedLabel(drill.startedAt) : null}>
        <h1 className="text-[26px] leading-tight font-black">這個連結已經失效</h1>
        <p className="text-[15px] leading-relaxed text-ink-2">
          回報連結只能使用一次，並在發出後 {CONFIG.tokenTtlMinutes} 分鐘失效。若需要回報或更正，請直接來電，我們會協助處理。
        </p>
        <a
          href={`tel:${CONFIG.helpPhone}`}
          className="flex min-h-14 items-center justify-center rounded-lg border border-accent-line text-base font-bold text-accent-ink"
        >
          撥打 {CONFIG.helpPhone}
        </a>
      </Frame>
    );
  }

  const issued = issuedLabel(drill.startedAt);
  const respond = (outcome: Outcome) => dispatch({ type: 'RESPOND', token, outcome });

  if (callout.status === 'pending') {
    return (
      <Frame issued={issued}>
        <div className="text-[17px] text-ink-3">{facility.name}</div>
        <h1 className="text-[32px] leading-[1.2] font-black">現在狀況如何？</h1>
        <p className="mb-5 text-[15px] leading-relaxed text-ink-2">選一項就完成。不必登入，不必填其他欄位。</p>
        {OUTCOMES.map((o) => (
          <OutcomeButton key={o} outcome={o} onClick={() => respond(o)} />
        ))}
      </Frame>
    );
  }

  const latest = callout.reports[callout.reports.length - 1];
  const at = latest?.at ?? state.minute;
  return (
    <Frame issued={issued}>
      <div className="text-[17px] text-ink-3">{facility.name}</div>
      <h1 className="text-[30px] font-black">回報已送出</h1>
      <div
        className={`${toneClass(callout.status)} rounded-lg border-2 px-[18px] py-4`}
        style={{ background: 'var(--t-fill)', borderColor: 'var(--t-fill)', color: 'var(--t-fill-fg)' }}
        role="status"
      >
        <div className="text-[22px] font-bold">{STATUS_LABEL[callout.status]}</div>
        <div className="mt-1.5 font-mono text-sm opacity-85">
          送出時間 {wallClock(drill, at)}（第 {pad2(at)} 分）
        </div>
        {callout.reports.length > 1 && <div className="mt-1 text-sm opacity-85">已更正，市府端保留兩筆紀錄</div>}
      </div>
      <NoteField token={token} initial={callout.note ?? ''} />
      {canCorrect(callout, state.minute) && <Correction onPick={respond} />}
    </Frame>
  );
}

function issuedLabel(ms: number) {
  const d = new Date(ms);
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())} 發出`;
}

function Frame({ issued, children }: { issued: string | null; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-page text-ink">
      <header className="flex items-baseline justify-between gap-2 px-6 pt-7">
        <span className="text-sm font-bold text-accent-ink">{CONFIG.issuer}　災情確認</span>
        {issued && <span className="font-mono text-xs text-ink-2">{issued}</span>}
      </header>
      <main className="flex flex-col gap-2.5 px-6 pt-9 pb-6">{children}</main>
      <footer className="mt-auto px-6 py-4 text-[13px] text-ink-2">
        需要協助請撥{' '}
        <a href={`tel:${CONFIG.helpPhone}`} className="font-mono underline-offset-2 hover:underline">
          {CONFIG.helpPhone}
        </a>
      </footer>
    </div>
  );
}

/** All three buttons share size, weight and fill so none of them nudges the reporter toward "ok". */
function OutcomeButton({ outcome, onClick }: { outcome: Outcome; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${toneClass(outcome)} min-h-[84px] rounded-lg border-2 px-[18px] py-3 text-left transition-[filter] hover:brightness-105 active:brightness-95`}
      style={{ background: 'var(--t-fill)', borderColor: 'var(--t-fill)', color: 'var(--t-fill-fg)' }}
    >
      <span className="block text-xl font-bold">{STATUS_LABEL[outcome]}</span>
      <span className="mt-0.5 block text-sm opacity-85">{OUTCOME_HINT[outcome]}</span>
    </button>
  );
}

function NoteField({ token, initial }: { token: string; initial: string }) {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(false);
  const secondary = 'min-h-14 rounded-lg border border-input-bd bg-transparent px-[18px] text-left text-base text-ink';

  if (!open) {
    return (
      <button type="button" className={`${secondary} mt-1`} onClick={() => setOpen(true)}>
        {initial ? '修改補充說明' : '補充說明（選填）'}
      </button>
    );
  }
  return (
    <form
      className="mt-1 flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        dispatch({ type: 'ADD_NOTE', token, note: text });
        setSaved(true);
        setOpen(false);
      }}
    >
      <label htmlFor="note" className="text-sm text-ink-2">
        補充說明（選填，最多 500 字）
      </label>
      <textarea
        id="note"
        rows={3}
        maxLength={500}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        className="rounded-lg border border-input-bd bg-input p-3 text-base text-ink"
        placeholder="例如：缺少的物資、受傷人數"
      />
      <button type="submit" className="btn-primary min-h-12 text-base">
        送出補充說明
      </button>
      {saved && <p role="status" className="text-sm text-ok-txt">已送出</p>}
    </form>
  );
}

function Correction({ onPick }: { onPick: (o: Outcome) => void }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-14 rounded-lg border border-accent-line bg-transparent text-base font-bold text-accent-ink"
      >
        更正回報
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm text-ink-2">
        {CONFIG.correctionWindowMinutes} 分鐘內可以把「一切正常」更正為以下狀態，選一項就送出：
      </p>
      <OutcomeButton outcome="need" onClick={() => onPick('need')} />
      <OutcomeButton outcome="damage" onClick={() => onPick('damage')} />
      <button type="button" className="py-2 text-sm text-ink-2 underline" onClick={() => setOpen(false)}>
        不更正
      </button>
    </div>
  );
}
