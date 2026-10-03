import { useState } from 'react';
import type { Callout, Facility } from '../types';
import { pad2 } from '../store/selectors';

/** Facilities that replied 一切正常 leave the queue and fold in here — only the count stays visible. */
export function OkDrawer({ items }: { items: { callout: Callout; facility: Facility }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex-none border-t border-line bg-ok-drawer text-sm text-ok-txt">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="ok-drawer"
        aria-label={`${items.length} 家已回報一切正常，不佔用市府人力`}
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 text-left"
      >
        <span className="font-mono" aria-hidden>
          {open ? '▾' : '▸'}
        </span>{' '}
        <span className="font-mono font-bold">{items.length}</span> 家已回報一切正常，不佔用市府人力
      </button>
      {open && (
        <ul id="ok-drawer" className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto px-4 pb-3">
          {items.map(({ callout, facility }) => (
            <li key={callout.id} className="rounded-[5px] border border-ok-chip-bd px-2 py-[3px] text-xs text-ok-chip-ink">
              {facility.name} <span className="font-mono text-ok-chip-time">{pad2(callout.respondedAt ?? 0)}′</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
