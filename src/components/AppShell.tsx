import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { DemoBar } from './DemoBar';

const TABS = [
  { to: '/board', label: '未回報優先佇列' },
  { to: '/drill/new', label: '發起點名' },
  { to: '/facilities', label: '機構名冊' },
  { to: '/history', label: '點名紀錄' },
];

/** City-side frame shared by S1/S2/S4/S5. The facility page (S3) deliberately does not use it. */
export function AppShell({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  const [theme, toggleTheme] = useTheme();
  return (
    <div className="flex min-h-dvh flex-col md:h-dvh">
      <DemoBar />
      <header className="flex flex-none flex-wrap items-center gap-x-1 gap-y-1 border-b border-line bg-surface px-4 py-2 md:min-h-[52px] md:px-5 md:py-0">
        <span className="mr-6 text-[17px] font-black tracking-[.06em]">安否通</span>
        <nav aria-label="主要導覽" className="order-last -mx-1 flex w-full overflow-x-auto md:order-none md:mx-0 md:w-auto">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-2 text-sm ${
                  isActive
                    ? 'font-bold text-ink-strong shadow-[inset_0_-2px_0_var(--accent-line)]'
                    : 'text-ink-2 hover:text-ink'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {actions}
          <button
            type="button"
            className="btn-secondary"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? '切換為亮色模式' : '切換為深色模式'}
          >
            {theme === 'dark' ? '亮色' : '深色'}
          </button>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
