import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeroImage } from '@/components/ui/HeroImage';
import { ReportListItem } from '@/components/ui/ReportListItem';
import { Screen } from '@/components/ui/Screen';
import { Spinner } from '@/components/ui/Spinner';
import { theme } from '@/constants/theme';
import { useReport, useReports } from '@/hooks/queries';
import { useRequireAuth } from '@/hooks/use-require-auth';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

const STATUS_COLOR: Record<string, string> = {
  present: theme.colors.coral,
  absent: theme.colors.success,
  unknown: theme.colors.textMuted,
};

/** Report page: full report content plus links to the plant's other reports. */
export default function ReportScreen() {
  const user = useRequireAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reportId = Number(id);
  const { data: report, isLoading, error } = useReport(reportId);
  const { data: plantReports } = useReports(report?.plantId ?? -1);

  // Sibling reports, excluding the current one.
  const otherReports = useMemo(
    () => (plantReports ?? []).filter((r) => r.id !== reportId),
    [plantReports, reportId],
  );

  if (!user) return null;

  if (isLoading) return <Screen><Spinner label="Loading report…" /></Screen>;
  if (error || !report) {
    return (
      <Screen>
        <EmptyState
          title="Couldn't load report"
          subtitle={error?.message ?? 'Report not found.'}
          actionLabel="Back to plants"
          onAction={() => router.replace('/')}
        />
      </Screen>
    );
  }

  return (
    <Screen bodyStyle={styles.screenBody}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <HeroImage url={report.photo?.imageUrl ?? report.photo?.thumbnailUrl ?? null} />

        <View style={styles.identity}>
          <Text style={styles.identName}>{report.identifiedPlantName ?? 'Unidentified'}</Text>
          {report.scientificName ? (
            <Text style={styles.scientific}>{report.scientificName}</Text>
          ) : null}
          {report.identificationConfidence != null ? (
            <Text style={styles.confidence}>
              {Math.round(report.identificationConfidence)}% confidence
            </Text>
          ) : null}
        </View>

        <View style={styles.stressors}>
          {report.likelyStressors.map((s, i) => (
            <Chip key={`${s}-${i}`} label={s} />
          ))}
        </View>

        <Section title="Summary">
          <Text style={styles.body}>{report.summary}</Text>
        </Section>
        <Section title="Recommendations">
          <Text style={styles.body}>{report.recommendations}</Text>
        </Section>

        {report.stressSigns.length > 0 ? (
          <Section title="Stress signs">
            {report.stressSigns.map((sign) => (
              <View key={sign.stressSignId} style={styles.signRow}>
                <View style={styles.signHead}>
                  <Text style={styles.signName}>{sign.name}</Text>
                  <Text style={[styles.signStatus, { color: STATUS_COLOR[sign.status] ?? theme.colors.text }]}>
                    {sign.status}
                    {sign.status !== 'absent' && sign.severity !== 'none' ? ` · ${sign.severity}` : ''}
                  </Text>
                </View>
                {sign.notes ? <Text style={styles.signNotes}>{sign.notes}</Text> : null}
              </View>
            ))}
          </Section>
        ) : null}

        <Text style={styles.meta}>
          Reported {formatDate(report.reportedAt)}
        </Text>

        {otherReports.length > 0 ? (
          <Section title="Other reports for this plant">
            {otherReports.map((r) => (
              <ReportListItem
                key={r.id}
                report={r}
                onPress={() =>
                  router.push({ pathname: '/report/[id]', params: { id: String(r.id) } })
                }
              />
            ))}
          </Section>
        ) : null}

        <Pressable
          onPress={() => router.push({ pathname: '/plant/[id]', params: { id: String(report.plantId) } })}
          style={({ pressed }) => [styles.backLink, pressed && styles.dimmed]}
        >
          <Text style={styles.backText}>← Back to {report.plantName}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screenBody: { paddingHorizontal: 0 },
  scroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  identity: { paddingTop: theme.spacing.md, gap: 2 },
  identName: { ...theme.typography.title, color: theme.colors.leafDark },
  scientific: { ...theme.typography.body, fontStyle: 'italic', color: theme.colors.textMuted },
  confidence: { ...theme.typography.caption, color: theme.colors.textMuted },
  stressors: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  section: { paddingTop: theme.spacing.lg, gap: theme.spacing.sm },
  sectionTitle: { ...theme.typography.subtitle, color: theme.colors.text },
  body: { ...theme.typography.body, color: theme.colors.text },
  signRow: { paddingVertical: theme.spacing.xs, borderBottomWidth: 1, borderColor: theme.colors.border },
  signHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  signName: { ...theme.typography.body, color: theme.colors.text, fontWeight: '500' },
  signStatus: { ...theme.typography.caption, textTransform: 'capitalize' },
  signNotes: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: 2 },
  meta: { ...theme.typography.caption, color: theme.colors.textMuted, paddingTop: theme.spacing.lg },
  backLink: { paddingTop: theme.spacing.xl },
  backText: { ...theme.typography.subtitle, color: theme.colors.leaf },
  dimmed: { opacity: 0.6 },
});