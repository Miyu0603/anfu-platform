import { useEffect, useState } from 'react';
import { useDispatch } from '../store/StoreContext';

/** Ending a drill is hard to undo, so it takes two presses; the armed state times out on its own. */
export function EndDrillButton() {
  const dispatch = useDispatch();
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(id);
  }, [armed]);
  return (
    <button
      type="button"
      className={armed ? 'btn-primary' : 'btn-secondary'}
      onClick={() => (armed ? dispatch({ type: 'END_DRILL' }) : setArmed(true))}
    >
      {armed ? '再按一次確認結束' : '結束點名'}
    </button>
  );
}
