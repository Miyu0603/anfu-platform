import type { AppState } from './reducer';

const STORAGE_KEY = 'anfu-state-v1';

/** Shape check for whatever is in storage: it may be stale, hand-edited or from an older build. */
function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<AppState>;
  return (
    s.version === 1 &&
    Array.isArray(s.facilities) &&
    Array.isArray(s.drills) &&
    Array.isArray(s.callouts) &&
    Array.isArray(s.scriptCancelled) &&
    typeof s.minute === 'number' &&
    typeof s.playing === 'boolean' &&
    (s.activeDrillId === null || typeof s.activeDrillId === 'string')
  );
}

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isAppState(parsed)) return parsed;
    console.warn('[anfu] stored state has an unexpected shape; starting fresh');
    return null;
  } catch (err) {
    console.warn('[anfu] could not read stored state; starting fresh', err);
    return null;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    // Private mode or a full quota: the demo keeps working, it just won't survive a reload.
    console.warn('[anfu] could not persist state', err);
  }
}
