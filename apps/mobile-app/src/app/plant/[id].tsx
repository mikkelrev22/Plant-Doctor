import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import type { PlantReportSummaryDto } from '@plant-doctor/api-types';
import { ApiError } from '@/api/client';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { HeroImage } from '@/components/ui/HeroImage';
import { InlineTextInput } from '@/components/ui/InlineTextInput';
import { ReportListItem } from '@/components/ui/ReportListItem';
import { Screen } from '@/components/ui/Screen';
import { Spinner } from '@/components/ui/Spinner';
import { theme } from '@/constants/theme';
import { usePlant, useReports, useUpdatePlantName } from '@/hooks/queries';
import { useRequireAuth } from '@/hooks/use-require-auth';

/** Plant page: latest-report hero, inline rename, report history, New report. */
export default function PlantScreen() {
  const user = useRequireAuth();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const plantId = Number(id);

  const { data: plant } = usePlant(plantId);
  const { data: reports, isLoading: reportsLoading } = useReports(plantId);
  const rename = useUpdatePlantName();

  const [editing, setEditing] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const goNewReport = useCallback(
    () =>
      router.push({ pathname: '/new-report/[plantId]', params: { plantId: String(plantId) } }),
    [plantId],
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderButton label="New report" onPress={goNewReport} />,
    });
  }, [navigation, goNewReport]);

  if (!user) return null;

  const latestReport = reports?.[0];
  const heroUrl = latestReport?.photo?.imageUrl ?? latestReport?.photo?.thumbnailUrl ?? null;

  const handleRename = async (name: string) => {
    setRenameError(null);
    try {
      await rename.mutateAsync({ id: plantId, name });
      setEditing(false);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not rename the plant.';
      // A duplicate name surfaces as a server error here.
      setRenameError(
        /unique|duplicate|exist/i.test(message)
          ? 'That name is already in use.'
          : message,
      );
    }
  };

  const renderItem: ListRenderItem<PlantReportSummaryDto> = ({ item }) => (
    <ReportListItem
      report={item}
      onPress={() => router.push({ pathname: '/report/[id]', params: { id: String(item.id) } })}
    />
  );

  return (
    <Screen style={styles.screen} bodyStyle={styles.screenBody}>
      <FlatList
        data={reports}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.scrollPad}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <HeroImage url={heroUrl} />
            {plant ? (
              <View style={styles.nameRow}>
                {editing ? (
                  <InlineTextInput
                    value={plant.name}
                    onSubmit={handleRename}
                    onCancel={() => {
                      setEditing(false);
                      setRenameError(null);
                    }}
                    error={renameError}
                  />
                ) : (
                  <Pressable
                    onPress={() => setEditing(true)}
                    style={({ pressed }) => pressed && styles.dimmed}
                  >
                    <View style={styles.nameRowInner}>
                      <Text style={styles.name}>{plant.name}</Text>
                      <Text style={styles.editHint}>✎ rename</Text>
                    </View>
                  </Pressable>
                )}
                {plant.species ? (
                  <Text style={styles.species} numberOfLines={1}>
                    {plant.species}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.nameRowPlaceholder} />
            )}
            <Text style={styles.sectionTitle}>Reports</Text>
          </View>
        }
        ListEmptyComponent={
          reportsLoading ? (
            <Spinner label="Loading reports…" />
          ) : (
            <EmptyState
              title="No reports yet"
              subtitle="Take a photo to diagnose this plant."
              actionLabel="New report"
              onAction={goNewReport}
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: theme.spacing.sm },
  screenBody: { paddingHorizontal: 0 },
  scrollPad: { paddingHorizontal: theme.spacing.lg },
  header: { gap: theme.spacing.md, paddingBottom: theme.spacing.md },
  nameRow: { paddingVertical: theme.spacing.xs },
  nameRowInner: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  name: { ...theme.typography.title, color: theme.colors.leafDark, flex: 1 },
  editHint: { ...theme.typography.caption, color: theme.colors.textMuted },
  species: { ...theme.typography.caption, fontStyle: 'italic', color: theme.colors.textMuted },
  nameRowPlaceholder: { height: 32 },
  sectionTitle: { ...theme.typography.subtitle, color: theme.colors.text, marginTop: theme.spacing.sm },
  separator: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.xs },
  dimmed: { opacity: 0.6 },
});