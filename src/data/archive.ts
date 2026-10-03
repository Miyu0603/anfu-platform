import { CONFIG } from '../config';
import type { Callout, Drill, Facility, Outcome } from '../types';
import { newToken } from '../store/ids';

/**
 * Two finished drills so 點名紀錄 has history on first open. Replies are generated deterministically
 * (no Math.random) so every visitor sees the same archive.
 */
interface ArchiveSpec {
  id: string;
  label: string;
  startedAt: number;
  durationMinutes: number;
  pick: (f: Facility) => boolean;
  replyRate: number;
  needEvery: number; // every Nth replier reports 需要支援
}

const SPECS: ArchiveSpec[] = [
  {
    id: 'd-20251205',
    label: '1205 年度全市演練',
    startedAt: new Date(2025, 11, 5, 10, 0).getTime(),
    durationMinutes: 40,
    pick: (f) => f.active,
    replyRate: 0.93,
    needEvery: 0,
  },
  {
    id: 'd-20250918',
    label: '0918 颱風前整備確認',
    startedAt: new Date(2025, 8, 18, 16, 30).getTime(),
    durationMinutes: 15,
    pick: (f) => f.active && f.vulnerability === 3,
    replyRate: 1,
    needEvery: 9,
  },
];

export function createArchive(facilities: Facility[]): { drills: Drill[]; callouts: Callout[] } {
  const drills: Drill[] = [];
  const callouts: Callout[] = [];
  for (const spec of SPECS) {
    const targets = facilities.filter(spec.pick);
    const replyCount = Math.round(targets.length * spec.replyRate);
    const lastReply = Math.max(1, spec.durationMinutes - 3);
    drills.push({
      id: spec.id,
      label: spec.label,
      startedAt: spec.startedAt,
      endedAt: spec.startedAt + spec.durationMinutes * 60_000,
      durationMinutes: spec.durationMinutes,
      scope: { districts: [], types: [], minVulnerability: 1 },
    });
    targets.forEach((f, i) => {
      const replied = i < replyCount;
      // Front-loaded curve: most replies early, a long tail toward the end.
      const at = replied ? Math.max(1, Math.round(lastReply * Math.pow((i + 1) / replyCount, 2))) : null;
      const outcome: Outcome = spec.needEvery && (i + 1) % spec.needEvery === 0 ? 'need' : 'ok';
      callouts.push({
        id: `${spec.id}-${f.id}`,
        drillId: spec.id,
        facilityId: f.id,
        token: newToken(),
        tokenExpiresAt: CONFIG.tokenTtlMinutes,
        status: at === null ? 'pending' : outcome,
        respondedAt: at,
        reports: at === null ? [] : [{ outcome, at }],
        note: null,
        opsNote: null,
      });
    });
  }
  return { drills, callouts };
}
