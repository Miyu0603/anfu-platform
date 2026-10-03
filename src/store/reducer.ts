import { CONFIG } from '../config';
import { createArchive } from '../data/archive';
import { createSeedFacilities } from '../data/facilities';
import { REPLY_SCRIPT } from '../data/script';
import type { Callout, Drill, DrillScope, Facility, OpsNote, Outcome } from '../types';
import { newId, newToken } from './ids';

export interface AppState {
  version: 1;
  facilities: Facility[];
  drills: Drill[];
  callouts: Callout[];
  activeDrillId: string | null;
  /** Simulated minutes since the active drill started. */
  minute: number;
  playing: boolean;
  /** Demo only: callouts whose scripted reply was cancelled because someone opened their 回報頁. */
  scriptCancelled: string[];
}

export type Action =
  // Demo simulator (stands in for the passage of time and for facilities replying on their own).
  | { type: 'SIM_TICK' }
  | { type: 'SIM_SET_PLAYING'; playing: boolean }
  | { type: 'SIM_FAST_FORWARD' }
  | { type: 'SIM_RESET' }
  | { type: 'SIM_CANCEL_SCRIPT'; calloutId: string }
  // Facility side — only reachable from /r/:token. The only actions allowed to write callout.status.
  | { type: 'RESPOND'; token: string; outcome: Outcome }
  | { type: 'ADD_NOTE'; token: string; note: string }
  // City side — must never write callout.status (市府無權代替機構回報).
  | { type: 'START_DRILL'; label: string; scope: DrillScope }
  | { type: 'END_DRILL' }
  | { type: 'MARK_OPS'; calloutId: string; opsNote: OpsNote }
  | { type: 'UPSERT_FACILITY'; facility: Facility }
  | { type: 'IMPORT_FACILITIES'; facilities: Facility[] };

const SEED_DRILL_ID = 'd-20260403';

export function matchesScope(f: Facility, scope: DrillScope): boolean {
  return (
    f.active &&
    f.vulnerability >= scope.minVulnerability &&
    (scope.districts.length === 0 || scope.districts.includes(f.district)) &&
    (scope.types.length === 0 || scope.types.includes(f.type))
  );
}

function createCallouts(drillId: string, facilities: Facility[], scope: DrillScope): Callout[] {
  return facilities
    .filter((f) => matchesScope(f, scope))
    .map((f) => ({
      id: `${drillId}-${f.id}`,
      drillId,
      facilityId: f.id,
      token: newToken(),
      tokenExpiresAt: CONFIG.tokenTtlMinutes,
      status: 'pending',
      respondedAt: null,
      reports: [],
      note: null,
      opsNote: null,
    }));
}

/** Writes a facility's report. Shared by RESPOND and the demo simulator, never by city-side actions. */
function recordReport(c: Callout, outcome: Outcome, at: number, note?: string | null): Callout {
  return {
    ...c,
    status: outcome,
    respondedAt: at,
    reports: [...c.reports, { outcome, at }],
    note: note ?? c.note,
  };
}

export function canCorrect(c: Callout, minute: number): boolean {
  const first = c.reports[0];
  return c.status === 'ok' && c.reports.length === 1 && !!first && minute - first.at <= CONFIG.correctionWindowMinutes;
}

/** Demo only: lets scripted facilities reply once the clock reaches their minute. */
function applyScript(state: AppState): AppState {
  if (!state.activeDrillId) return state;
  let changed = false;
  const callouts = state.callouts.map((c) => {
    if (c.drillId !== state.activeDrillId || c.status !== 'pending') return c;
    if (state.scriptCancelled.includes(c.id)) return c;
    const reply = REPLY_SCRIPT[c.facilityId];
    if (!reply || reply.at > state.minute) return c;
    changed = true;
    return recordReport(c, reply.outcome, reply.at, reply.note);
  });
  return changed ? { ...state, callouts } : state;
}

function activeCallouts(state: AppState): Callout[] {
  return state.callouts.filter((c) => c.drillId === state.activeDrillId);
}

function updateCallout(state: AppState, match: (c: Callout) => boolean, fn: (c: Callout) => Callout): AppState {
  return { ...state, callouts: state.callouts.map((c) => (match(c) ? fn(c) : c)) };
}

export function createInitialState(now = Date.now(), startMinute = CONFIG.simStartMinute): AppState {
  const facilities = createSeedFacilities(now);
  const archive = createArchive(facilities);
  const scope: DrillScope = { districts: [], types: [], minVulnerability: CONFIG.defaultMinVulnerability };
  const drill: Drill = {
    id: SEED_DRILL_ID,
    label: '0403 地震 規模 6.2',
    startedAt: new Date(2026, 3, 3, 9, 14).getTime(),
    endedAt: null,
    durationMinutes: null,
    scope,
  };
  const state: AppState = {
    version: 1,
    facilities,
    drills: [drill, ...archive.drills],
    callouts: [...createCallouts(drill.id, facilities, scope), ...archive.callouts],
    activeDrillId: drill.id,
    minute: startMinute,
    playing: true,
    scriptCancelled: [],
  };
  return applyScript(state);
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SIM_TICK': {
      if (!state.activeDrillId || !state.playing || state.minute >= CONFIG.simEndMinute) return state;
      const minute = state.minute + 1;
      return applyScript({ ...state, minute, playing: minute < CONFIG.simEndMinute });
    }
    case 'SIM_SET_PLAYING':
      if (!state.activeDrillId) return state;
      return { ...state, playing: action.playing && state.minute < CONFIG.simEndMinute };
    case 'SIM_FAST_FORWARD':
      if (!state.activeDrillId) return state;
      return applyScript({ ...state, minute: CONFIG.simEndMinute, playing: false });
    case 'SIM_RESET':
      return createInitialState(Date.now(), 0);
    case 'SIM_CANCEL_SCRIPT':
      if (state.scriptCancelled.includes(action.calloutId)) return state;
      return { ...state, scriptCancelled: [...state.scriptCancelled, action.calloutId] };

    case 'RESPOND': {
      const target = activeCallouts(state).find((c) => c.token === action.token);
      if (!target || state.minute > target.tokenExpiresAt) return state;
      const firstReport = target.status === 'pending';
      const correction = canCorrect(target, state.minute) && action.outcome !== 'ok';
      if (!firstReport && !correction) return state;
      return updateCallout(state, (c) => c.id === target.id, (c) => recordReport(c, action.outcome, state.minute));
    }
    case 'ADD_NOTE': {
      const note = action.note.trim().slice(0, 500);
      return updateCallout(
        state,
        (c) => c.drillId === state.activeDrillId && c.token === action.token && c.status !== 'pending',
        (c) => ({ ...c, note: note || null }),
      );
    }

    case 'START_DRILL': {
      if (state.activeDrillId) return state; // 不允許同時開兩場
      const drill: Drill = {
        id: newId('d'),
        label: action.label.trim() || '未命名點名',
        startedAt: Date.now(),
        endedAt: null,
        durationMinutes: null,
        scope: action.scope,
      };
      const callouts = createCallouts(drill.id, state.facilities, action.scope);
      if (callouts.length === 0) return state;
      return {
        ...state,
        drills: [drill, ...state.drills],
        callouts: [...callouts, ...state.callouts],
        activeDrillId: drill.id,
        minute: 0,
        playing: true,
        scriptCancelled: [],
      };
    }
    case 'END_DRILL': {
      if (!state.activeDrillId) return state;
      const endedAt = Date.now();
      return {
        ...state,
        drills: state.drills.map((d) =>
          d.id === state.activeDrillId ? { ...d, endedAt, durationMinutes: state.minute } : d,
        ),
        activeDrillId: null,
        playing: false,
        minute: 0,
      };
    }
    case 'MARK_OPS':
      return updateCallout(
        state,
        (c) => c.id === action.calloutId,
        (c) => ({ ...c, opsNote: c.opsNote === action.opsNote ? null : action.opsNote }),
      );

    case 'UPSERT_FACILITY': {
      const exists = state.facilities.some((f) => f.id === action.facility.id);
      return {
        ...state,
        facilities: exists
          ? state.facilities.map((f) => (f.id === action.facility.id ? action.facility : f))
          : [...state.facilities, action.facility],
      };
    }
    case 'IMPORT_FACILITIES': {
      const byId = new Map(state.facilities.map((f) => [f.id, f]));
      action.facilities.forEach((f) => byId.set(f.id, f));
      return { ...state, facilities: [...byId.values()] };
    }
  }
}
