import { useEffect } from 'react';
import { CONFIG } from '../config';
import { useAppState, useDispatch } from '../store/StoreContext';

/** Demo only: advances the integer minute while playing. The interval only exists while it is needed. */
export function useSimClock() {
  const { playing, activeDrillId } = useAppState();
  const dispatch = useDispatch();
  useEffect(() => {
    if (!playing || !activeDrillId) return;
    const id = window.setInterval(() => dispatch({ type: 'SIM_TICK' }), CONFIG.simTickMs);
    return () => window.clearInterval(id);
  }, [playing, activeDrillId, dispatch]);
}
