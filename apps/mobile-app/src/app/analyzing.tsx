import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Spinner } from '@/components/ui/Spinner';
import { theme } from '@/constants/theme';
import { useAnalyzeReport } from '@/hooks/queries';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { clearAnalyzingContext, getAnalyzingContext } from '@/state/analyzing-holder';

/** Map backend error codes to friendly messages. */
function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 400) return 'That image couldn’t be processed. Try another photo.';
    if (err.status === 404) return 'That plant wasn’t found.';
    if (err.status === 502) return 'Diagnosis failed on the server. Please retry.';
    return err.message;
  }
  return 'Something went wrong. Please retry.';
}

/**
 * Analyzing splash: reads the captured image from the analyzing-holder, fires
 * the analyze mutation once on mount, and navigates to the report on success.
 * On error the holder is kept so "Retry" can re-fire.
 */
export default function AnalyzingScreen() {
  const user = useRequireAuth();
  const analyze = useAnalyzeReport();
  const startedRef = useRef(false);
  const [left, setLeft] = useState(false);

  useEffect(() => {
    if (!user || startedRef.current) return;
    const ctx = getAnalyzingContext();
    if (!ctx) {
      // Deep-linked without a captured image — bail to home.
      router.replace('/');
      return;
    }
    startedRef.current = true;
    void analyze.mutateAsync(ctx).then((data) => {
      clearAnalyzingContext();
      setLeft(true);
      router.replace({ pathname: '/report/[id]', params: { id: String(data.report.id) } });
    });
  }, [user, analyze]);

  if (!user) return null;

  if (left) {
    return (
      <Screen>
        <Spinner label="Opening report…" />
      </Screen>
    );
  }

  if (analyze.isError) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Couldn’t complete the diagnosis</Text>
          <Text style={styles.errorBody}>{friendlyError(analyze.error)}</Text>
          <View style={styles.actions}>
            <Button
              title="Retry"
              variant="primary"
              onPress={() => {
                const ctx = getAnalyzingContext();
                if (ctx) void analyze.mutateAsync(ctx);
              }}
            />
            <Button title="Back to plants" variant="ghost" onPress={() => router.replace('/')} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.center}>
        <Spinner label="Analyzing your plant…" />
        <Card style={styles.tips}>
          <Text style={styles.tipsTitle}>Care tips</Text>
          <Text style={styles.tipsBody}>Care tips will appear here soon.</Text>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg },
  errorTitle: { ...theme.typography.subtitle, color: theme.colors.danger },
  errorBody: { ...theme.typography.body, color: theme.colors.textMuted, textAlign: 'center' },
  actions: { gap: theme.spacing.sm, alignItems: 'center' },
  tips: { width: '100%' },
  tipsTitle: { ...theme.typography.subtitle, color: theme.colors.leafDark, marginBottom: 4 },
  tipsBody: { ...theme.typography.body, color: theme.colors.textMuted },
});