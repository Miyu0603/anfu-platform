import { useCallback, useRef, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { FacilityPanel } from '../components/FacilityPanel';
import { CONFIG } from '../config';
import { FACILITY_TYPES } from '../data/facilities';
import { downloadFile } from '../lib/csv';
import { facilitiesFromCsv, facilitiesToCsv } from '../lib/facilityCsv';
import { VULNERABILITY_LABEL } from '../labels';
import { newId } from '../store/ids';
import { formatDate, isStale, selectDistricts, selectFacilities, type FacilityFilter } from '../store/selectors';
import { useAppState, useDispatch } from '../store/StoreContext';
import type { Facility } from '../types';

const COLUMNS = 'md:grid-cols-[1.4fr_.7fr_.8fr_.6fr_1.1fr_1.1fr_1fr_.6fr]';

/** S4 — the roster decays over time, so stale rows are flagged rather than hidden. */
export function Facilities() {
  const state = useAppState();
  const dispatch = useDispatch();
  const [filter, setFilter] = useState<FacilityFilter>({ district: '', type: '', minVulnerability: 1, keyword: '' });
  const [editing, setEditing] = useState<Facility | 'new' | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; lines: string[] } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const now = Date.now();
  const districts = selectDistricts(state);
  const rows = selectFacilities(state, filter);
  const staleCount = state.facilities.filter((f) => isStale(f, now)).length;
  const closePanel = useCallback(() => setEditing(null), []);

  const importCsv = async (file: File) => {
    try {
      const text = await file.text();
      const result = facilitiesFromCsv(text, Date.now(), () => newId('f'));
      if (result.facilities.length) dispatch({ type: 'IMPORT_FACILITIES', facilities: result.facilities });
      setNotice({
        tone: result.errors.length ? 'error' : 'ok',
        lines: [`匯入 ${result.facilities.length} 家，略過 ${result.errors.length} 筆。`, ...result.errors.slice(0, 8)],
      });
    } catch (err) {
      console.error('[anfu] CSV import failed', err);
      setNotice({ tone: 'error', lines: ['無法讀取這個檔案，請確認是 UTF-8 編碼的 CSV。'] });
    }
  };

  const stamp = formatDate(now).replace(/\//g, '');
  const actions = (
    <>
      <button type="button" className="btn-secondary" onClick={() => fileInput.current?.click()}>
        匯入 CSV
      </button>
      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        aria-label="選擇要匯入的 CSV 檔"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importCsv(file);
          e.target.value = '';
        }}
      />
      <details className="relative">
        <summary className="btn-secondary list-none">匯出</summary>
        <div className="absolute right-0 z-10 mt-1 flex w-32 flex-col rounded-md border border-line bg-surface p-1 text-[13px]">
          <button type="button" className="rounded px-3 py-2 text-left hover:bg-hover"
            onClick={() => downloadFile(`facilities-${stamp}.csv`, facilitiesToCsv(state.facilities), 'text/csv;charset=utf-8')}>
            CSV
          </button>
          <button type="button" className="rounded px-3 py-2 text-left hover:bg-hover"
            onClick={() => downloadFile(`facilities-${stamp}.json`, JSON.stringify(state.facilities, null, 2), 'application/json')}>
            JSON
          </button>
        </div>
      </details>
      <button type="button" className="btn-primary" onClick={() => setEditing('new')}>
        新增機構
      </button>
    </>
  );

  const select = 'field';
  return (
    <AppShell actions={actions}>
      <h1 className="sr-only">機構名冊</h1>
      <div className="flex flex-none flex-wrap items-center gap-2 border-b border-line px-4 py-3 md:px-5">
        <select aria-label="行政區" className={select} value={filter.district} onChange={(e) => setFilter({ ...filter, district: e.target.value })}>
          <option value="">行政區 全部</option>
          {districts.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select aria-label="類型" className={select} value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}>
          <option value="">類型 全部</option>
          {FACILITY_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select aria-label="脆弱度" className={select} value={filter.minVulnerability}
          onChange={(e) => setFilter({ ...filter, minVulnerability: Number(e.target.value) })}>
          <option value={1}>脆弱度 全部</option>
          <option value={2}>脆弱度 中以上</option>
          <option value={3}>脆弱度 僅高</option>
        </select>
        <input type="search" aria-label="關鍵字" placeholder="關鍵字：機構、聯絡人、電話" className={`${select} w-full sm:w-[280px]`}
          value={filter.keyword} onChange={(e) => setFilter({ ...filter, keyword: e.target.value })} />
        <span className="text-[13px] text-pending-txt md:ml-auto">
          {staleCount} 家逾 {CONFIG.staleFacilityDays} 天未更新
        </span>
      </div>
      {notice && (
        <div role="status" className={`flex items-start gap-3 border-b border-line px-5 py-2 text-[13px] ${notice.tone === 'ok' ? 'text-ok-txt' : 'text-damage-txt'}`}>
          <ul className="flex-1">{notice.lines.map((l) => <li key={l}>{l}</li>)}</ul>
          <button type="button" className="text-ink-2 underline" onClick={() => setNotice(null)}>關閉</button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto text-[13px]">
        <div aria-hidden className={`sticky top-0 hidden gap-3 border-b border-line bg-page px-5 py-2 text-xs text-ink-2 md:grid ${COLUMNS}`}>
          <span>機構名稱</span><span>行政區</span><span>類型</span><span>脆弱度</span>
          <span>主要聯絡人</span><span>第二聯絡人</span><span>最後更新</span><span>狀態</span>
        </div>
        {rows.length === 0 && <p className="p-10 text-center text-ink-2">沒有符合條件的機構，請調整篩選。</p>}
        <ul>
          {rows.map((f) => {
            const stale = isStale(f, now);
            const [c1, c2] = f.contacts;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setEditing(f)}
                  aria-label={`編輯 ${f.name}${stale ? '，逾期未更新' : ''}${f.active ? '' : '，已停用'}`}
                  className={`grid w-full grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 border-b border-line-row px-4 py-2 text-left hover:bg-hover md:h-9 md:items-center md:gap-3 md:px-5 md:py-0 ${COLUMNS} ${
                    stale ? 'bg-[var(--need-tint)]' : 'bg-surface md:bg-transparent'
                  } ${f.active ? '' : 'text-ink-faint'}`}
                >
                  <span className="truncate font-bold">{f.name}</span>
                  <span className="text-right md:hidden">{f.active ? '' : '停用'}</span>
                  <span className="col-span-2 text-xs text-ink-2 md:hidden">
                    {f.district} · {f.type} · 脆弱度 {VULNERABILITY_LABEL[f.vulnerability]} · {c1?.name ?? '—'}
                  </span>
                  <span className="hidden md:block">{f.district}</span>
                  <span className="hidden md:block">{f.type}</span>
                  <span className="hidden md:block">{VULNERABILITY_LABEL[f.vulnerability]}</span>
                  <span className="hidden truncate md:block">{c1 ? `${c1.name} ${c1.role}` : '—'}</span>
                  <span className="hidden truncate md:block">{c2 ? `${c2.name} ${c2.role}` : '—'}</span>
                  <span className={`col-span-2 font-mono text-xs md:col-span-1 md:text-[13px] ${stale ? 'text-pending-txt' : ''}`}>
                    <span className="md:hidden">最後更新 </span>
                    {formatDate(f.updatedAt)}
                    {stale && <span className="ml-1 font-sans">逾期</span>}
                  </span>
                  <span className="hidden md:block">{f.active ? '啟用' : '停用'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {editing && (
        <FacilityPanel facility={editing === 'new' ? null : editing} districts={districts} onClose={closePanel} />
      )}
    </AppShell>
  );
}
