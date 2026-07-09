import { Routes, Route } from 'react-router-dom';
import { ArchitecturePage } from './pages/ArchitecturePage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<ArchitecturePage />} />
    </Routes>
  );
}

export default App;