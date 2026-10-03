import type { Outcome } from '../types';
import { facilityId } from './facilities';

/**
 * Demo-only reply script: when each seeded facility "replies" and with what. Designed so that with the
 * default scope (vulnerability ≥ 中, 30 facilities) the run ends with 23 ok, 2 need, 1 damage, 4 pending,
 * and three visible moments: need jumps to #1 at minute 3, escalations at 5 and 10, damage takes #1 at 11.
 */
export interface ScriptedReply {
  at: number;
  outcome: Outcome;
  note?: string;
}

const OK_MINUTES = [1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 9, 10, 12, 13, 15, 18, 22];

export const REPLY_SCRIPT: Record<string, ScriptedReply> = {
  [facilityId(1)]: { at: 11, outcome: 'damage', note: 'B 棟外牆龜裂，住民 64 人需移往 A 棟，請求撤離協助' },
  [facilityId(2)]: { at: 3, outcome: 'need', note: '夜班人力不足，需 2 名照服員支援' },
  [facilityId(4)]: { at: 8, outcome: 'need', note: '停水，飲用水剩一日份' },
};
OK_MINUTES.forEach((at, k) => {
  REPLY_SCRIPT[facilityId(7 + k)] = { at, outcome: 'ok' };
});
