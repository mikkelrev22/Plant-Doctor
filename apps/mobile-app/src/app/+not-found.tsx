import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { theme } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <Screen>
      <Text style={styles.title}>Not found</Text>
      <Text style={styles.body}>This screen doesn&apos;t exist.</Text>
      <Link href="/" style={styles.link}>
        Go home
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...theme.typography.title, color: theme.colors.text, marginBottom: 4 },
  body: { ...theme.typography.body, color: theme.colors.textMuted, marginBottom: 16 },
  link: { ...theme.typography.subtitle, color: theme.colors.leaf },
});