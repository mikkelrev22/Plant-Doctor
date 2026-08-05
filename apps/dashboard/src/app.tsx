import { useMemo } from 'react';
import { AppShell, Burger, Group, Title } from '@mantine/core';
import { Link, Outlet, Route, Routes } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import styles from './app.module.css';
import { Sidebar } from './components/Sidebar';
import { TopTabs } from './components/TopTabs';
import { HomePage } from './pages/HomePage';
import { PlantPage } from './pages/PlantPage';
import { ReportPage } from './pages/ReportPage';
import { EvalPage } from './pages/EvalPage';
import { EvalResultsPage } from './pages/EvalResultsPage';
import { usePlants } from './queries';

// Plant dashboard surface: existing AppShell with the left navbar + plant
// list. The header title is "Plants" and the shared TopTabs switches to Eval.
function PlantsLayout() {
  const [opened, { toggle }] = useDisclosure();
  const plantsQuery = usePlants();
  const plants = useMemo(() => plantsQuery.data ?? [], [plantsQuery.data]);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      className={styles.shell}
      padding="lg"
      withBorder
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title renderRoot={(props) => <Link to="/" {...props} />} c="dimmed" size={'xl'}>
              Plants
            </Title>
          </Group>
          <TopTabs />
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <Sidebar plants={plants} />
      </AppShell.Navbar>
      <AppShell.Main className={styles.main}>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

// Eval surface: header only, no left navbar, full width so wide result tables
// fit. Shares the same TopTabs so switching back to Plants is one click.
function EvalLayout() {
  return (
    <AppShell header={{ height: 60 }} padding="lg" withBorder>
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={3} c="dimmed" renderRoot={(props) => <Link to="/eval" {...props} />}>
            Evaluation
          </Title>
          <TopTabs />
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
      <Route element={<PlantsLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/plant/:id" element={<PlantPage />} />
        <Route path="/report/:id" element={<ReportPage />} />
      </Route>
      <Route element={<EvalLayout />}>
        <Route path="/eval" element={<EvalPage />} />
        <Route path="/eval/:plantId" element={<EvalResultsPage />} />
      </Route>
    </Routes>
  );
}

export default App;