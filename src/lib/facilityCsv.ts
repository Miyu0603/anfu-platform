import { FACILITY_TYPES } from '../data/facilities';
import type { Contact, Facility, FacilityType, Vulnerability } from '../types';
import { parseCsv, toCsv } from './csv';

export const CSV_HEADER = [
  'id', 'name', 'district', 'type', 'vulnerability', 'residents',
  'contact1_name', 'contact1_role', 'contact1_phone', 'contact1_email',
  'contact2_name', 'contact2_role', 'contact2_phone', 'contact2_email',
  'active', 'updatedAt',
] as const;

export function facilitiesToCsv(facilities: Facility[]): string {
  const rows = facilities.map((f) => {
    const [c1, c2] = f.contacts;
    const contact = (c?: Contact) => (c ? [c.name, c.role, c.phone, c.email] : ['', '', '', '']);
    return [
      f.id, f.name, f.district, f.type, f.vulnerability, f.residents,
      ...contact(c1), ...contact(c2),
      f.active ? 'true' : 'false', new Date(f.updatedAt).toISOString(),
    ];
  });
  return toCsv([[...CSV_HEADER], ...rows]);
}

export interface ImportResult {
  facilities: Facility[];
  errors: string[];
}

const PHONE = /^[0-9+\-() ]{6,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates every row; bad rows are reported by line number and skipped rather than half-imported. */
export function facilitiesFromCsv(text: string, now: number, nextId: (n: number) => string): ImportResult {
  const rows = parseCsv(text);
  const [header, ...body] = rows;
  if (!header) return { facilities: [], errors: ['檔案是空的'] };
  const col = new Map(header.map((h, i) => [h.trim(), i]));
  const missing = ['name', 'district', 'type', 'vulnerability', 'contact1_name', 'contact1_phone'].filter((h) => !col.has(h));
  if (missing.length) return { facilities: [], errors: [`缺少欄位：${missing.join('、')}`] };

  const facilities: Facility[] = [];
  const errors: string[] = [];
  body.forEach((r, i) => {
    const line = i + 2;
    const get = (k: (typeof CSV_HEADER)[number]) => (col.has(k) ? (r[col.get(k)!] ?? '').trim() : '');
    const problems: string[] = [];
    const name = get('name');
    const district = get('district');
    const type = get('type') as FacilityType;
    const vul = Number(get('vulnerability'));
    if (!name) problems.push('缺少機構名稱');
    if (!district) problems.push('缺少行政區');
    if (!FACILITY_TYPES.includes(type)) problems.push(`類型「${get('type')}」不在清單內`);
    if (![1, 2, 3].includes(vul)) problems.push('脆弱度須為 1、2、3');

    const contacts: Contact[] = [];
    for (const n of [1, 2] as const) {
      const cname = get(`contact${n}_name`);
      if (!cname) continue;
      const phone = get(`contact${n}_phone`);
      const email = get(`contact${n}_email`);
      if (!PHONE.test(phone)) problems.push(`聯絡人 ${n} 電話格式不正確`);
      if (email && !EMAIL.test(email)) problems.push(`聯絡人 ${n} 信箱格式不正確`);
      contacts.push({ name: cname, role: get(`contact${n}_role`), phone, email, isPrimary: n === 1 });
    }
    if (contacts.length === 0) problems.push('至少需要一位聯絡人');

    if (problems.length) {
      errors.push(`第 ${line} 行：${problems.join('；')}`);
      return;
    }
    const updated = Date.parse(get('updatedAt'));
    facilities.push({
      id: get('id') || nextId(facilities.length),
      name,
      district,
      type,
      vulnerability: vul as Vulnerability,
      residents: Math.max(0, Number(get('residents')) || 0),
      contacts,
      active: get('active') !== 'false',
      updatedAt: Number.isFinite(updated) ? updated : now,
    });
  });
  return { facilities, errors };
}
