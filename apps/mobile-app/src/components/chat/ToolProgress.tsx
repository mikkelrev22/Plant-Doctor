import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

/**
 * Progress card for one agent tool call. The agent runs its tools server-side,
 * so `useChat` surfaces them as `dynamic-tool` parts (no `tools` option on the
 * hook). This renders the three states we care about: running (spinner + label),
 * done (check + label), and errored (warning + label + message).
 */

export type ToolState =
  | 'input-streaming'
  | 'input-available'
  | 'output-available'
  | 'output-error'
  | 'approval-requested'
  | 'approval-responded'
  | 'output-denied';

export interface ToolProgressPart {
  toolName: string;
  state: ToolState;
  /** Plain-text gateway result, present once `state === 'output-available'`. */
  output?: unknown;
  errorText?: string;
}

/** Friendly labels for the four gateway tools + the demo yes/no tool. */
const LABELS: Record<string, string> = {
  get_recent_reports: 'Fetching recent reports',
  get_report_history: 'Reading report history',
  list_user_plants: 'Listing your plants',
  look_at_photo: 'Looking at the photo',
  ask_yes_no: 'Asking a yes/no question',
};

const prettify = (name: string) =>
  name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const labelFor = (name: string) => LABELS[name] ?? prettify(name);

export function ToolProgress({ part }: { part: ToolProgressPart }) {
  const running =
    part.state === 'input-streaming' || part.state === 'input-available';
  const failed = part.state === 'output-error';
  const label = labelFor(part.toolName);

  return (
    <View style={styles.card}>
      {running ? (
        <>
          <ActivityIndicator size="small" color={theme.colors.leaf} />
          <Text style={styles.running}>{label}…</Text>
        </>
      ) : failed ? (
        <>
          <Text style={styles.warn}>⚠</Text>
          <Text style={styles.failed} numberOfLines={2}>
            {label} failed{part.errorText ? `: ${part.errorText}` : ''}
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.check}>✓</Text>
          <Text style={styles.done}>{label}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.creamSurface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  running: { ...theme.typography.caption, color: theme.colors.leafDark },
  done: { ...theme.typography.caption, color: theme.colors.textMuted },
  check: { ...theme.typography.caption, color: theme.colors.leaf, fontWeight: '700' },
  warn: { ...theme.typography.caption, color: theme.colors.coral, fontWeight: '700' },
  failed: { ...theme.typography.caption, color: theme.colors.coral, flex: 1 },
});