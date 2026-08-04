import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getHealth } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';
import { useSessionStore } from '@/state/session-store';

/**
 * Fake login for the prototype. The "Test login" button pulls the single
 * Research User (id=1) into the store; the auth gate then redirects to Home.
 */
export default function LoginScreen() {
  const login = useSessionStore((s) => s.login);
  const user = useSessionStore((s) => s.user);
  const router = useRouter();

  // App ver comes from the OTA update's app.json (expo-constants); backend ver is
  // fetched via the API-key-exempt GET /. Both fall back to '—' if unavailable.
  const appVersion = Constants.expoConfig?.version ?? '—';
  const { data } = useQuery({ queryKey: ['health'], queryFn: getHealth });
  const backendVersion = data?.version ?? '—';

  useEffect(() => {
    if (user) router.replace('/');
  }, [user, router]);

  return (
    <Screen>
      <View style={styles.body}>
        <Logo width={200} height={200} />
        <Text style={styles.title}>Plant Doctor</Text>
        <Text style={styles.subtitle}>
          Snap a photo of your houseplant and get an instant AI diagnosis.
        </Text>
      </View>
      <View style={styles.footer}>
        <Button title="Test login" variant="primary" fullWidth onPress={login} />
        <Text style={styles.hint}>
          Prototype mode — signs in as the single Research User.
        </Text>
        <Text style={styles.version}>
          App ver {appVersion} · Backend ver {backendVersion}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg },
  title: { ...theme.typography.title, color: theme.colors.leafDark },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  footer: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  hint: { ...theme.typography.caption, color: theme.colors.textMuted, textAlign: 'center' },
  version: { ...theme.typography.caption, color: theme.colors.textMuted, textAlign: 'center' },
});