import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config';
import { facilityId } from '../data/facilities';
import { createInitialState, reducer, type Action, type AppState } from './reducer';
import { escalationsFor, selectKpis, selectQueue } from './selectors';

const run = (s: AppState, ...actions: Action[]) => actions.reduce(reducer, s);
const tick = (s: AppState, n: number) => run(s, ...Array.from({ length: n }, () => ({ type: 'SIM_TICK' }) as Action));
const fresh = () => createInitialState(Date.UTC(2026, 3, 3), 0);
const top = (s: AppState) => selectQueue(s)[0]!.facility.id;
const calloutOf = (s: AppState, fid: string) => s.callouts.find((c) => c.drillId === s.activeDrillId && c.facilityId === fid)!;

describe('demo run (規格書驗收條件)', () => {
  it('ends with 6–8 queued items, 3–4 of them pending', () => {
    const end = reducer(fresh(), { type: 'SIM_FAST_FORWARD' });
    const queue = selectQueue(end);
    const pending = queue.filter((r) => r.callout.status === 'pending').length;
    expect(queue.length).toBeGreaterThanOrEqual(6);
    expect(queue.length).toBeLessThanOrEqual(8);
    expect(pending).toBeGreaterThanOrEqual(3);
    expect(pending).toBeLessThanOrEqual(4);
  });

  it('re-ranks at minute 3 (need takes #1) and minute 11 (damage takes #1)', () => {
    const s2 = tick(fresh(), 2);
    const s3 = tick(s2, 1);
    expect(top(s2)).not.toBe(facilityId(2));
    expect(top(s3)).toBe(facilityId(2));
    const s11 = tick(s3, 8);
    expect(top(s11)).toBe(facilityId(1));
    expect(selectQueue(s11)[0]!.callout.status).toBe('damage');
  });

  it('moves ok replies out of the queue after one minute and counts them', () => {
    const s1 = tick(fresh(), 1);
    const leaving = selectQueue(s1).filter((r) => r.leaving);
    expect(leaving.length).toBeGreaterThan(0);
    expect(leaving.every((r) => r.rank === null)).toBe(true);
    const s2 = tick(s1, 1);
    const ids = selectQueue(s2).map((r) => r.callout.id);
    leaving.forEach((r) => expect(ids).not.toContain(r.callout.id));
    const kpis = selectKpis(s2, selectQueue(s2));
    expect(kpis.ok + kpis.pending + kpis.help).toBe(kpis.total);
  });

  it('fires escalations at the configured minutes', () => {
    const pendingId = facilityId(0); // never replies in the script
    const s = tick(fresh(), 20);
    expect(escalationsFor(calloutOf(s, pendingId), s.minute).map((e) => e.minute)).toEqual(
      CONFIG.escalation.map((e) => e.minute),
    );
    const s4 = tick(fresh(), 4);
    expect(escalationsFor(calloutOf(s4, pendingId), s4.minute)).toHaveLength(0);
  });
});

describe('reporting rules', () => {
  it('lets a token report once, then ignores repeats', () => {
    const s = tick(fresh(), 2);
    const { token, id } = calloutOf(s, facilityId(0));
    const after = run(s, { type: 'RESPOND', token, outcome: 'need' }, { type: 'RESPOND', token, outcome: 'ok' });
    const c = after.callouts.find((x) => x.id === id)!;
    expect(c.status).toBe('need');
    expect(c.reports).toHaveLength(1);
  });

  it('allows ok → need correction within the window and keeps both records', () => {
    const s = tick(fresh(), 2);
    const { token, id } = calloutOf(s, facilityId(0));
    const after = run(s, { type: 'RESPOND', token, outcome: 'ok' }, { type: 'RESPOND', token, outcome: 'damage' });
    const c = after.callouts.find((x) => x.id === id)!;
    expect(c.status).toBe('damage');
    expect(c.reports.map((r) => r.outcome)).toEqual(['ok', 'damage']);
  });

  it('city-side marks never change status', () => {
    const s = fresh();
    const { id } = calloutOf(s, facilityId(0));
    const after = run(s, { type: 'MARK_OPS', calloutId: id, opsNote: 'contacted' });
    const c = after.callouts.find((x) => x.id === id)!;
    expect(c.status).toBe('pending');
    expect(c.opsNote).toBe('contacted');
  });

  it('cancelled scripts stop a facility from auto-replying', () => {
    const s = fresh();
    const { id } = calloutOf(s, facilityId(2));
    const after = tick(run(s, { type: 'SIM_CANCEL_SCRIPT', calloutId: id }), 5);
    expect(after.callouts.find((x) => x.id === id)!.status).toBe('pending');
  });

  it('refuses a second concurrent drill and an empty scope', () => {
    const s = fresh();
    const scope = { districts: [], types: [], minVulnerability: 1 as const };
    expect(reducer(s, { type: 'START_DRILL', label: 'x', scope })).toBe(s);
    const ended = reducer(s, { type: 'END_DRILL' });
    expect(ended.activeDrillId).toBeNull();
    const none = { districts: ['不存在區'], types: [], minVulnerability: 1 as const };
    expect(reducer(ended, { type: 'START_DRILL', label: 'x', scope: none })).toBe(ended);
    expect(reducer(ended, { type: 'START_DRILL', label: 'x', scope }).activeDrillId).not.toBeNull();
  });
});

describe('priority ordering', () => {
  it('orders damage › need › pending, then vulnerability, then wait', () => {
    const end = reducer(fresh(), { type: 'SIM_FAST_FORWARD' });
    const order = { damage: 0, need: 1, pending: 2, ok: 3 };
    const queue = selectQueue(end);
    for (let i = 1; i < queue.length; i++) {
      const a = queue[i - 1]!;
      const b = queue[i]!;
      expect(order[a.callout.status]).toBeLessThanOrEqual(order[b.callout.status]);
      if (a.callout.status === b.callout.status && a.callout.status === 'pending') {
        expect(a.facility.vulnerability).toBeGreaterThanOrEqual(b.facility.vulnerability);
      }
    }
  });
});
