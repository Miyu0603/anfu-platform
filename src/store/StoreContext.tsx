import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import { loadState, saveState } from './persist';
import { createInitialState, reducer, type Action, type AppState } from './reducer';

const StateContext = createContext<AppState | null>(null);
const DispatchContext = createContext<Dispatch<Action> | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState() ?? createInitialState());
  useEffect(() => saveState(state), [state]);
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useAppState(): AppState {
  const state = useContext(StateContext);
  if (!state) throw new Error('useAppState must be used inside <StoreProvider>');
  return state;
}

export function useDispatch(): Dispatch<Action> {
  const dispatch = useContext(DispatchContext);
  if (!dispatch) throw new Error('useDispatch must be used inside <StoreProvider>');
  return dispatch;
}
