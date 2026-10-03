export type Vulnerability = 1 | 2 | 3; // 1 低、2 中、3 高
export type FacilityType = '護理之家' | '長照機構' | '養護中心' | '日照中心' | '身障機構' | '醫院';
export type Outcome = 'ok' | 'need' | 'damage';
export type CalloutStatus = 'pending' | Outcome;
export type OpsNote = 'contacted' | 'site-check';

export interface Contact {
  name: string;
  role: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

export interface Facility {
  id: string;
  name: string;
  district: string;
  type: FacilityType;
  vulnerability: Vulnerability;
  residents: number;
  contacts: Contact[];
  active: boolean;
  updatedAt: number; // epoch ms
}

export interface DrillScope {
  districts: string[]; // 空陣列 = 全部
  types: FacilityType[]; // 空陣列 = 全部
  minVulnerability: Vulnerability;
}

export interface Drill {
  id: string;
  label: string;
  startedAt: number; // epoch ms
  endedAt: number | null;
  /** Simulated minutes the drill ran for; set when it ends. */
  durationMinutes: number | null;
  scope: DrillScope;
}

/** One report the facility sent. A correction appends a second record instead of overwriting. */
export interface ReportRecord {
  outcome: Outcome;
  at: number; // minutes since drill start
}

export interface Callout {
  id: string;
  drillId: string;
  facilityId: string;
  token: string;
  tokenExpiresAt: number; // minutes since drill start
  status: CalloutStatus;
  respondedAt: number | null; // minutes since drill start, of the latest report
  reports: ReportRecord[];
  note: string | null;
  opsNote: OpsNote | null;
}

export interface Escalation {
  minute: number;
  level: 1 | 2 | 3;
  channel: string;
}
