import { Tabs } from '@mantine/core';
import { Link, useLocation } from 'react-router-dom';

// Shared top tab bar rendered in both the Plants and Eval layout headers so
// navigation between the two surfaces is identical. "Plants" covers the plant
// dashboard routes, "Eval" covers the eval runner and results routes. Each tab
// is a real link so middle-click / ⌘-click opens the surface in a new tab and
// keyboard Tab reaches it; the active tab is derived from the current route.
export function TopTabs() {
  const location = useLocation();
  const value = location.pathname.startsWith('/eval') ? '/eval' : '/';

  return (
    <Tabs value={value}>
      <Tabs.List>
        <Tabs.Tab value="/" renderRoot={(props) => <Link to="/" {...props} />}>Plants</Tabs.Tab>
        <Tabs.Tab value="/eval" renderRoot={(props) => <Link to="/eval" {...props} />}>Eval</Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
}