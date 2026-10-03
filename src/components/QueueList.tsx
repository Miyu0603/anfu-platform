import { useLayoutEffect, useRef } from 'react';
import { prefersReducedMotion } from '../hooks/useReducedMotion';
import type { QueueRow as Row } from '../store/selectors';
import { QueueRow } from './QueueRow';

const MOVE = { duration: 220, easing: 'cubic-bezier(.2,.7,.3,1)' };
const ENTER = { duration: 200 };

interface Props {
  rows: Row[];
  minute: number;
  openId: string | null;
  onToggle: (id: string) => void;
}

/**
 * FLIP: after each render, compare every row's new offsetTop with where it was last time and animate the
 * difference, so re-ranking is visible (規格書「排名被擠下去」). Stable keys keep the DOM nodes alive.
 */
export function QueueList({ rows, minute, openId, onToggle }: Props) {
  const nodes = useRef(new Map<string, HTMLLIElement>());
  const lastTops = useRef<Map<string, number> | null>(null);

  useLayoutEffect(() => {
    const tops = new Map<string, number>();
    nodes.current.forEach((el, id) => tops.set(id, el.offsetTop));
    const prev = lastTops.current;
    lastTops.current = tops;
    if (!prev || prefersReducedMotion()) return;
    tops.forEach((top, id) => {
      const el = nodes.current.get(id);
      const before = prev.get(id);
      if (!el || typeof el.animate !== 'function') return;
      if (before === undefined) el.animate([{ opacity: 0 }, { opacity: 1 }], ENTER);
      else if (before !== top) el.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'none' }], MOVE);
    });
  });

  return (
    <ol aria-label="未回報優先佇列" className="relative">
      {rows.map((row) => (
        <QueueRow
          key={row.callout.id}
          ref={(el) => {
            if (el) nodes.current.set(row.callout.id, el);
            else nodes.current.delete(row.callout.id);
          }}
          row={row}
          minute={minute}
          open={openId === row.callout.id}
          onToggle={() => onToggle(row.callout.id)}
        />
      ))}
    </ol>
  );
}
