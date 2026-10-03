import { CONFIG, ESCALATION_TEXT } from '../config';
import { DAY_MS } from '../data/facilities';
import type { Callout, CalloutStatus, Drill, DrillScope, Escalation, Facility } from '../types';
import { matchesScope, type AppState } from './reducer';

/** All ordering and counting lives here; screens only render what these return. */

export const pad2 = (n: number) => String(n).padStart(2, '0');

export function activeDrill(state: AppState): Drill | null {
  return state.drills.find((d) => d.id === state.activeDrillId) ?? null;
}

export function facilityMap(state: AppState): Map<string, Facility> {
  return new Map(state.facilities.map((f) => [f.id, f]));
}

export function calloutsOf(state: AppState, drillId: string | null): Callout[] {
  return drillId ? state.callouts.filter((c) => c.drillId === drillId) : [];
}

// ── Escalation ────────────────────────────────────────────────────────────────

/** Escalations that fired for this callout: all reached so far while pending, or those before its first reply. */
export function escalationsFor(c: Callout, minute: number): Escalation[] {
  const firstReply = c.reports[0];
  const limit = firstReply ? Math.min(firstReply.at - 1, minute) : minute;
  return CONFIG.escalation.filter((e) => e.minute <= limit);
}

export interface EscalationProgress {
  fired: Escalation[];
  currentChannel: string;
  next: Escalation | null;
  /** 0–1 progress from the previous escalation (or start) to the next one. */
  progress: number;
  minutesToNext: number | null;
}

export function escalationProgress(c: Callout, minute: number): EscalationProgress {
  const fired = escalationsFor(c, minute);
  const last = fired[fired.length - 1];
  const next = CONFIG.escalation.find((e) => e.minute > minute) ?? null;
  const from = last ? last.minute : 0;
  return {
    fired,
    currentChannel: last ? ESCALATION_TEXT[last.level].now : CONFIG.baseChannel,
    next,
    progress: next ? (minute - from) / (next.minute - from) : 1,
    minutesToNext: next ? next.minute - minute : null,
  };
}

// ── Queue ─────────────────────────────────────────────────────────────────────

export function priorityOf(status: CalloutStatus, vulnerability: number, waitedMinutes: number): number {
  return CONFIG.priority[status] + vulnerability * CONFIG.vulnerabilityWeight + waitedMinutes;
}

export function waitedMinutes(c: Callout, minute: number): number {
  return c.status === 'pending' || c.respondedAt === null ? minute : minute - c.respondedAt;
}

export interface QueueRow {
  callout: Callout;
  facility: Facility;
  /** null while the row is on its way out (just reported ok this minute). */
  rank: number | null;
  leaving: boolean;
  priority: number;
}

/** A callout that reported ok during the current minute lingers one minute before folding away. */
function isLeaving(c: Callout, minute: number): boolean {
  return c.status === 'ok' && c.respondedAt === minute && minute > 0;
}

export function selectQueue(state: AppState): QueueRow[] {
  const facilities = facilityMap(state);
  const { minute } = state;
  const rows: QueueRow[] = [];
  for (const c of calloutsOf(state, state.activeDrillId)) {
    const facility = facilities.get(c.facilityId);
    if (!facility) continue;
    const leaving = isLeaving(c, minute);
    if (c.status === 'ok' && !leaving) continue;
    // A leaving row keeps the slot a pending row would have, so it fades out in place instead of jumping.
    const priority = leaving
      ? priorityOf('pending', facility.vulnerability, minute)
      : priorityOf(c.status, facility.vulnerability, waitedMinutes(c, minute));
    rows.push({ callout: c, facility, rank: null, leaving, priority });
  }
  rows.sort((a, b) => b.priority - a.priority || a.facility.id.localeCompare(b.facility.id));
  let rank = 0;
  return rows.map((r) => ({ ...r, rank: r.leaving ? null : ++rank }));
}

export interface BoardKpis {
  total: number;
  ok: number;
  pending: number;
  help: number;
  todo: number;
}

export function selectKpis(state: AppState, queue: QueueRow[]): BoardKpis {
  const callouts = calloutsOf(state, state.activeDrillId);
  const count = (s: CalloutStatus) => callouts.filter((c) => c.status === s).length;
  return {
    total: callouts.length,
    ok: count('ok'),
    pending: count('pending'),
    help: count('need') + count('damage'),
    todo: queue.filter((r) => !r.leaving).length,
  };
}

export function selectOkList(state: AppState): { callout: Callout; facility: Facility }[] {
  const facilities = facilityMap(state);
  return calloutsOf(state, state.activeDrillId)
    .filter((c) => c.status === 'ok')
    .sort((a, b) => (a.respondedAt ?? 0) - (b.respondedAt ?? 0))
    .flatMap((c) => {
      const facility = facilities.get(c.facilityId);
      return facility ? [{ callout: c, facility }] : [];
    });
}

// ── S1 ────────────────────────────────────────────────────────────────────────

export function selectScopePreview(state: AppState, scope: DrillScope) {
  const picked = state.facilities.filter((f) => matchesScope(f, scope));
  return { count: picked.length, highCount: picked.filter((f) => f.vulnerability === 3).length };
}

export function selectDistricts(state: AppState): string[] {
  return [...new Set(state.facilities.map((f) => f.district))];
}

// ── S4 ────────────────────────────────────────────────────────────────────────

export function isStale(f: Facility, now: number): boolean {
  return now - f.updatedAt > CONFIG.staleFacilityDays * DAY_MS;
}

export interface FacilityFilter {
  district: string;
  type: string;
  minVulnerability: number;
  keyword: string;
}

export function selectFacilities(state: AppState, filter: FacilityFilter): Facility[] {
  const kw = filter.keyword.trim().toLowerCase();
  return state.facilities.filter(
    (f) =>
      (!filter.district || f.district === filter.district) &&
      (!filter.type || f.type === filter.type) &&
      f.vulnerability >= filter.minVulnerability &&
      (!kw ||
        f.name.toLowerCase().includes(kw) ||
        f.contacts.some((c) => c.name.includes(kw) || c.phone.includes(kw))),
  );
}

// ── S5 ────────────────────────────────────────────────────────────────────────

export interface DrillSummary {
  drill: Drill;
  isActive: boolean;
  total: number;
  replied: number;
  rate: number; // 0–1
  medianMinute: number | null;
  lastReplyMinute: number | null;
  /** Minutes on the chart's x-axis; at least the demo length so short drills stay comparable. */
  spanMinutes: number;
  elapsedMinutes: number;
  /** Cumulative replies at each minute 0..elapsedMinutes. */
  curve: number[];
}

export function summarizeDrill(state: AppState, drill: Drill): DrillSummary {
  const isActive = drill.id === state.activeDrillId;
  const elapsed = isActive ? state.minute : (drill.durationMinutes ?? 0);
  const callouts = calloutsOf(state, drill.id);
  const replyMinutes = callouts
    .map((c) => c.reports[0]?.at)
    .filter((m): m is number => m !== undefined)
    .sort((a, b) => a - b);
  const mid = Math.floor(replyMinutes.length / 2);
  const median =
    replyMinutes.length === 0
      ? null
      : replyMinutes.length % 2
        ? replyMinutes[mid]!
        : (replyMinutes[mid - 1]! + replyMinutes[mid]!) / 2;
  const curve = Array.from({ length: elapsed + 1 }, (_, m) => replyMinutes.filter((a) => a <= m).length);
  return {
    drill,
    isActive,
    total: callouts.length,
    replied: replyMinutes.length,
    rate: callouts.length ? replyMinutes.length / callouts.length : 0,
    medianMinute: median,
    lastReplyMinute: replyMinutes.length ? replyMinutes[replyMinutes.length - 1]! : null,
    spanMinutes: Math.max(CONFIG.simEndMinute, elapsed),
    elapsedMinutes: elapsed,
    curve,
  };
}

export function selectHistory(state: AppState): DrillSummary[] {
  return [...state.drills].sort((a, b) => b.startedAt - a.startedAt).map((d) => summarizeDrill(state, d));
}

export interface HistoryRow {
  callout: Callout;
  facility: Facility;
  escalations: Escalation[];
}

export function selectHistoryRows(state: AppState, summary: DrillSummary): HistoryRow[] {
  const facilities = facilityMap(state);
  return calloutsOf(state, summary.drill.id)
    .flatMap((c) => {
      const facility = facilities.get(c.facilityId);
      return facility ? [{ callout: c, facility, escalations: escalationsFor(c, summary.elapsedMinutes) }] : [];
    })
    .sort(
      (a, b) =>
        (a.callout.reports[0]?.at ?? Infinity) - (b.callout.reports[0]?.at ?? Infinity) ||
        a.facility.id.localeCompare(b.facility.id),
    );
}

// ── Formatting shared by screens ─────────────────────────────────────────────

export function wallClock(drill: Drill, minute: number): string {
  const d = new Date(drill.startedAt + minute * 60_000);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
}

export function formatDateTime(ms: number): string {
  const d = new Date(ms);
  return `${formatDate(ms)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
