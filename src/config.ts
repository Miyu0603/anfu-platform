import type { Escalation, Vulnerability } from './types';

/**
 * Every timing and weight the product depends on. Nothing else in the codebase may hard-code
 * these numbers — changing escalation minute 5 → 2 here must be enough to change behaviour.
 */
export const CONFIG = {
  escalation: [
    { minute: 5, level: 1, channel: '電子郵件' },
    { minute: 10, level: 2, channel: '第二聯絡人' },
    { minute: 20, level: 3, channel: '建議現地確認' },
  ] satisfies Escalation[] as Escalation[],
  baseChannel: '網頁連結 · Web Push',
  priority: { damage: 3000, need: 2000, pending: 1000, ok: 0 },
  vulnerabilityWeight: 20,
  tokenTtlMinutes: 60,
  correctionWindowMinutes: 60,
  staleFacilityDays: 180,
  /** Demo only: the simulated clock stops here. */
  simEndMinute: 25,
  /** Demo only: real milliseconds per simulated minute. */
  simTickMs: 1000,
  /** Demo only: where a freshly loaded demo starts playing. */
  simStartMinute: 12,
  defaultMinVulnerability: 2 as Vulnerability,
  helpPhone: '02-2960-0000',
  issuer: '新北市政府',
};

/** Wording for each escalation level, keyed by level so CONFIG stays the single source of timing. */
export const ESCALATION_TEXT: Record<Escalation['level'], { did: string; now: string }> = {
  1: { did: '加送電子郵件', now: '已加送電子郵件' },
  2: { did: '通知第二聯絡人', now: '已轉第二聯絡人' },
  3: { did: '標記建議現地確認', now: '建議現地確認' },
};
