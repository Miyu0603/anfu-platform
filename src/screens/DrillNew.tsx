import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { CONFIG } from '../config';
import { FACILITY_TYPES } from '../data/facilities';
import { activeDrill, selectDistricts, selectScopePreview } from '../store/selectors';
import { useAppState, useDispatch } from '../store/StoreContext';
import type { DrillScope, FacilityType, Vulnerability } from '../types';

const VUL_OPTIONS: [Vulnerability, string][] = [
  [1, '全部'],
  [2, '中以上'],
  [3, '僅高'],
];

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** S1 — the count on the right is the screen's only feedback, so it updates on every change. */
export function DrillNew() {
  const state = useAppState();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const running = activeDrill(state);
  const [label, setLabel] = useState('');
  const [scope, setScope] = useState<DrillScope>({
    districts: [],
    types: [],
    minVulnerability: CONFIG.defaultMinVulnerability,
  });
  const { count, highCount } = selectScopePreview(state, scope);

  const start = () => {
    if (running || count === 0) return;
    dispatch({ type: 'START_DRILL', label, scope });
    navigate('/board');
  };

  return (
    <AppShell>
      <div className="grid flex-1 md:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-[22px] px-4 py-6 md:px-10 md:py-8">
          <h1 className="text-[22px] font-bold">發起點名</h1>
          {running && (
            <p role="status" className="rounded-md border border-pending-bd bg-kpi-pending-bg px-4 py-3 text-sm text-kpi-pending-note">
              「{running.label}」仍在進行中，一次只能進行一場點名。請先到看板結束目前的點名。
            </p>
          )}
          <div>
            <label htmlFor="drill-label" className="label block">
              事件描述（選填）
            </label>
            <input
              id="drill-label"
              value={label}
              maxLength={60}
              placeholder="例：0403 地震 規模 6.2"
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-md border border-input-bd bg-input px-3 py-2.5 text-[15px]"
            />
          </div>
          <ChipGroup
            label="行政區"
            options={selectDistricts(state)}
            selected={scope.districts}
            onAll={() => setScope((s) => ({ ...s, districts: [] }))}
            onToggle={(d) => setScope((s) => ({ ...s, districts: toggle(s.districts, d) }))}
          />
          <ChipGroup
            label="機構類型"
            options={FACILITY_TYPES}
            selected={scope.types}
            onAll={() => setScope((s) => ({ ...s, types: [] }))}
            onToggle={(t) => setScope((s) => ({ ...s, types: toggle(s.types, t as FacilityType) }))}
          />
          <fieldset>
            <legend className="label">脆弱度</legend>
            <div className="flex gap-1.5">
              {VUL_OPTIONS.map(([v, text]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={scope.minVulnerability === v}
                  onClick={() => setScope((s) => ({ ...s, minVulnerability: v }))}
                  className="chip px-3.5 py-1.5 text-sm"
                >
                  {text}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <aside className="flex flex-col gap-3 border-t border-line bg-surface px-4 py-8 md:border-t-0 md:border-l md:px-8 md:py-10">
          <div className="text-sm text-ink-2">將對</div>
          <output aria-live="polite" className="font-mono text-[96px] leading-none font-bold text-big-count md:text-[120px]">
            {count}
          </output>
          <div className="text-lg">家機構送出回報連結</div>
          <div className="mt-2 border-t border-line pt-3 text-[13px] leading-[1.7] text-ink-2">
            通道：{CONFIG.baseChannel}
            <br />
            {count === 0 ? '目前條件沒有符合的機構，請放寬範圍。' : `其中脆弱度高 ${highCount} 家`}
          </div>
          {running ? (
            <Link to="/board" className="btn-primary mt-auto flex h-16 items-center justify-center rounded-lg text-[19px]">
              前往看板
            </Link>
          ) : (
            <button
              type="button"
              disabled={count === 0}
              onClick={start}
              className="btn-primary mt-6 h-16 rounded-lg text-[19px] md:mt-auto"
            >
              發起點名
            </button>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

interface ChipGroupProps {
  label: string;
  options: string[];
  selected: string[];
  onAll: () => void;
  onToggle: (v: string) => void;
}

/** 「全部」is selected exactly when nothing else is, so the group can never be in an empty state. */
function ChipGroup({ label, options, selected, onAll, onToggle }: ChipGroupProps) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className="chip" aria-pressed={selected.length === 0} onClick={onAll}>
          全部
        </button>
        {options.map((o) => (
          <button key={o} type="button" className="chip" aria-pressed={selected.includes(o)} onClick={() => onToggle(o)}>
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
