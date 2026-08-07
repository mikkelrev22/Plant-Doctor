import { AppShell, Group, Title } from '@mantine/core';
import { Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { EvalPage } from './pages/EvalPage';
import { EvalResultsPage } from './pages/EvalResultsPage';
import { ReportPage } from './pages/ReportPage';

// Single dashboard surface: header only, no left navbar, full width so wide
// result tables fit. The "Evaluation" title links back to the home (/) route,
// which renders the EvalPage runner.
function EvalLayout() {
  return (
    <AppShell header={{ height: 60 }} padding="lg" withBorder>
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={3} c="dimmed" renderRoot={(props) => <Link to="/" {...props} />}>
            Evaluation
          </Title>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<EvalLayout />}>
        <Route path="/" element={<EvalPage />} />
        <Route path="/eval" element={<Navigate to="/" replace />} />
        <Route path="/eval/:plantId" element={<EvalResultsPage />} />
        <Route path="/report/:id" element={<ReportPage />} />
      </Route>
    </Routes>
  );
}

export default App;