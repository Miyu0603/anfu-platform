import { STATUS_LABEL, toneClass } from '../labels';
import type { CalloutStatus } from '../types';

export function StatusPill({ status }: { status: CalloutStatus }) {
  return (
    <span
      className={`${toneClass(status)} inline-block whitespace-nowrap rounded-[5px] border px-2 py-0.5 text-xs font-bold`}
      style={{ background: 'var(--t-bg)', color: 'var(--t-fg)', borderColor: 'var(--t-bd)' }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
