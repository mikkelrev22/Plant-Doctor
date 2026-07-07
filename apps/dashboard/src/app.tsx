import { useMemo } from 'react';
import { AppShell, Burger, Group, Title } from '@mantine/core';
import { Link, Route, Routes } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import styles from './app.module.css';
import { Sidebar } from './components/Sidebar';
import { HomePage } from './pages/HomePage';
import { PlantPage } from './pages/PlantPage';
import { ReportPage } from './pages/ReportPage';
import { usePlants } from './queries';

export function App() {
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
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Title renderRoot={(props) => <Link to="/" {...props} />} c="dimmed" size={'xl'}>
            Plant Doctor{' '}
            <span role={'img'} aria-label={'plant'}>
              🌱
            </span>{' '}
            Tech Dashboard
          </Title>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <Sidebar plants={plants} />
      </AppShell.Navbar>
      <AppShell.Main className={styles.main}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/plant/:id" element={<PlantPage />} />
          <Route path="/report/:id" element={<ReportPage />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
