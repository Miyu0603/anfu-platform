import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { FACILITY_TYPES } from '../data/facilities';
import { VULNERABILITY_LABEL } from '../labels';
import { newId } from '../store/ids';
import { useDispatch } from '../store/StoreContext';
import type { Contact, Facility, FacilityType, Vulnerability } from '../types';

const EMPTY_CONTACT: Contact = { name: '', role: '', phone: '', email: '', isPrimary: false };
const PHONE = /^[0-9+\-() ]{6,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  facility: Facility | null; // null = 新增
  districts: string[];
  onClose: () => void;
}

/** Edit / create in a side panel so the roster stays in view (規格書：不要跳到新頁). */
export function FacilityPanel({ facility, districts, onClose }: Props) {
  const dispatch = useDispatch();
  const [draft, setDraft] = useState<Facility>(
    () =>
      facility ?? {
        id: newId('f'),
        name: '',
        district: districts[0] ?? '',
        type: '護理之家',
        vulnerability: 2,
        residents: 0,
        contacts: [{ ...EMPTY_CONTACT, isPrimary: true }, { ...EMPTY_CONTACT }],
        active: true,
        updatedAt: Date.now(),
      },
  );
  const [errors, setErrors] = useState<string[]>([]);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const contacts = [draft.contacts[0] ?? { ...EMPTY_CONTACT, isPrimary: true }, draft.contacts[1] ?? { ...EMPTY_CONTACT }];
  const setContact = (i: number, patch: Partial<Contact>) =>
    setDraft((d) => ({ ...d, contacts: contacts.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const problems: string[] = [];
    if (!draft.name.trim()) problems.push('請填寫機構名稱');
    if (!draft.district.trim()) problems.push('請填寫行政區');
    contacts.forEach((c, i) => {
      const who = i === 0 ? '主要聯絡人' : '第二聯絡人';
      if (i === 0 && !c.name.trim()) problems.push('請填寫主要聯絡人姓名');
      if (c.name.trim() && !PHONE.test(c.phone)) problems.push(`${who}的電話格式不正確，例：02-2960-0000`);
      if (c.email && !EMAIL.test(c.email)) problems.push(`${who}的信箱格式不正確`);
    });
    setErrors(problems);
    if (problems.length) return;
    dispatch({
      type: 'UPSERT_FACILITY',
      facility: {
        ...draft,
        name: draft.name.trim(),
        district: draft.district.trim(),
        contacts: contacts.filter((c) => c.name.trim()).map((c, i) => ({ ...c, isPrimary: i === 0 })),
        updatedAt: Date.now(),
      },
    });
    onClose();
  };

  const input = 'field w-full py-2 text-sm';
  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/30" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-[420px] flex-col border-l border-line bg-surface"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="panel-title" className="text-lg font-bold">
            {facility ? '編輯機構' : '新增機構'}
          </h2>
          <button type="button" className="btn-secondary" onClick={onClose}>
            關閉
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4 text-sm">
          {errors.length > 0 && (
            <ul role="alert" className="rounded-md border border-damage-txt px-3 py-2 text-damage-txt">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <Field label="機構名稱" id="fp-name">
            <input ref={firstField} id="fp-name" className={input} value={draft.name} maxLength={40}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="行政區" id="fp-district">
              <input id="fp-district" list="fp-districts" className={input} value={draft.district} maxLength={10}
                onChange={(e) => setDraft({ ...draft, district: e.target.value })} />
              <datalist id="fp-districts">
                {districts.map((d) => <option key={d} value={d} />)}
              </datalist>
            </Field>
            <Field label="類型" id="fp-type">
              <select id="fp-type" className={input} value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as FacilityType })}>
                {FACILITY_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="脆弱度" id="fp-vul">
              <select id="fp-vul" className={input} value={draft.vulnerability}
                onChange={(e) => setDraft({ ...draft, vulnerability: Number(e.target.value) as Vulnerability })}>
                {([3, 2, 1] as const).map((v) => <option key={v} value={v}>{VULNERABILITY_LABEL[v]}</option>)}
              </select>
            </Field>
            <Field label="收容人數" id="fp-res">
              <input id="fp-res" type="number" min={0} max={9999} className={input} value={draft.residents}
                onChange={(e) => setDraft({ ...draft, residents: Math.max(0, Number(e.target.value) || 0) })} />
            </Field>
          </div>
          {contacts.map((c, i) => (
            <fieldset key={i} className="grid grid-cols-2 gap-3 border-t border-line pt-3">
              <legend className="col-span-2 pr-2 font-bold">{i === 0 ? '主要聯絡人' : '第二聯絡人（建議填寫）'}</legend>
              <Field label="姓名" id={`fp-c${i}-name`}>
                <input id={`fp-c${i}-name`} className={input} value={c.name} onChange={(e) => setContact(i, { name: e.target.value })} />
              </Field>
              <Field label="職稱" id={`fp-c${i}-role`}>
                <input id={`fp-c${i}-role`} className={input} value={c.role} onChange={(e) => setContact(i, { role: e.target.value })} />
              </Field>
              <Field label="電話" id={`fp-c${i}-phone`}>
                <input id={`fp-c${i}-phone`} type="tel" className={`${input} font-mono`} value={c.phone}
                  onChange={(e) => setContact(i, { phone: e.target.value })} />
              </Field>
              <Field label="電子郵件" id={`fp-c${i}-email`}>
                <input id={`fp-c${i}-email`} type="email" className={input} value={c.email}
                  onChange={(e) => setContact(i, { email: e.target.value })} />
              </Field>
            </fieldset>
          ))}
          {facility && (
            <div className="flex items-center justify-between border-t border-line pt-3">
              <span>
                目前狀態：<b>{draft.active ? '啟用' : '停用'}</b>
                <span className="block text-xs text-ink-2">停用後不會被點名，但保留歷史紀錄。</span>
              </span>
              <button type="button" className="btn-secondary" onClick={() => setDraft({ ...draft, active: !draft.active })}>
                {draft.active ? '停用' : '重新啟用'}
              </button>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <button type="button" className="btn-secondary" onClick={onClose}>取消</button>
          <button type="submit" className="btn-primary">儲存</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-ink-2">{label}</label>
      {children}
    </div>
  );
}
