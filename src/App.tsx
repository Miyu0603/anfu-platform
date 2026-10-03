import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useSimClock } from './hooks/useSimClock';
import { Board } from './screens/Board';
import { DrillNew } from './screens/DrillNew';
import { Facilities } from './screens/Facilities';
import { History } from './screens/History';
import { Respond } from './screens/Respond';
import { StoreProvider } from './store/StoreContext';

function Routed() {
  useSimClock(); // ticks on every screen, including S3, so the demo keeps running while you report
  return (
    <Routes>
      <Route path="/board" element={<Board />} />
      <Route path="/drill/new" element={<DrillNew />} />
      <Route path="/r/:token" element={<Respond />} />
      <Route path="/facilities" element={<Facilities />} />
      <Route path="/history" element={<History />} />
      <Route path="/history/:id" element={<History />} />
      <Route path="*" element={<Navigate to="/board" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Routed />
      </HashRouter>
    </StoreProvider>
  );
}
