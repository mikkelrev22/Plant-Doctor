import { Tabs } from '@mantine/core';
import { useLocation, useNavigate } from 'react-router-dom';

// Shared top tab bar rendered in both the Plants and Eval layout headers so
// navigation between the two surfaces is identical. "Plants" covers the plant
// dashboard routes, "Eval" covers the eval runner and results routes.
export function TopTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const value = location.pathname.startsWith('/eval') ? '/eval' : '/';

  return (
    <Tabs
      value={value}
      onChange={(tab) => typeof tab === 'string' && navigate(tab)}
    >
      <Tabs.List>
        <Tabs.Tab value="/">Plants</Tabs.Tab>
        <Tabs.Tab value="/eval">Eval</Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
}