import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from '../app.module.css';

// A link meant to sit inside a `<Table.Tr className={styles.linkRow}>` cell.
// Its `::after` pseudo-element stretches across the whole row, so the entire
// row is a single link target: middle-click / ⌘-click opens a new tab and the
// link is reachable via keyboard Tab. The link's children are its visible text
// (the row's accessible name), so no aria-label is required.
export function RowLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className={styles.rowLink}>
      {children}
    </Link>
  );
}