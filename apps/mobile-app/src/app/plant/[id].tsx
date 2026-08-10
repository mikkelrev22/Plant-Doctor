import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import type { PlantReportExtendedDto } from '@plant-doctor/api-types';
import { ApiError } from '@/api/client';
import { ChatsSheet } from '@/components/chat/ChatsSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { HeroImage } from '@/components/ui/HeroImage';
import { InlineTextInput } from '@/components/ui/InlineTextInput';
import { ReportListItem } from '@/components/ui/ReportListItem';
import { Screen } from '@/components/ui/Screen';
import { Spinner } from '@/components/ui/Spinner';
import { theme } from '@/constants/theme';
import { usePlant, usePlantChats, useReportsExtended, useUpdatePlantName, useUpdatePlantNotes } from '@/hooks/queries';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { useChatHolder } from '@/state/chat-holder';

/** Plant page: latest-report hero, inline rename, report history, New report. */
export default function PlantScreen() {
  const user = useRequireAuth();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const plantId = Number(id);

  const { data: plant } = usePlant(plantId);
  const { data: reports, isLoading: reportsLoading } = useReportsExtended(plantId);
  const { data: chats } = usePlantChats(plantId);
  const rename = useUpdatePlantName();
  const updateNotes = useUpdatePlantNotes();

  const [editing, setEditing] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [askText, setAskText] = useState("What's wrong with my plant?");
  const [chatsSheetOpen, setChatsSheetOpen] = useState(false);

  const goNewReport = useCallback(
    () =>
      router.push({ pathname: '/new-report/[plantId]', params: { plantId: String(plantId) } }),
    [plantId],
  );

  // Ask starts a fresh consultation: clear the plant's active thread so the first
  // turn has no `thread_id` and the agent mints a new chat, then push to the chat
  // screen with the (editable) prefilled question so it auto-sends on mount.
  const onAsk = useCallback(() => {
    const text = askText.trim();
    if (!text) return;
    useChatHolder.getState().clear(plantId);
    router.push({
      pathname: '/chat/[plantId]',
      params: { plantId: String(plantId), q: text },
    });
  }, [askText, plantId]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRight}>
          <HeaderButton label="New report" onPress={goNewReport} />
        </View>
      ),
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

  const handleSaveNotes = async (value: string) => {
    setNotesError(null);
    try {
      await updateNotes.mutateAsync({ id: plantId, notes: value || null });
      setEditingNotes(false);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not save notes.';
      setNotesError(message);
    }
  };

  const renderItem: ListRenderItem<PlantReportExtendedDto> = ({ item }) => (
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
              <>
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
                {editingNotes ? (
                  <InlineTextInput
                    value={plant.notes ?? ''}
                    multiline
                    allowClear
                    onSubmit={handleSaveNotes}
                    onCancel={() => {
                      setEditingNotes(false);
                      setNotesError(null);
                    }}
                    error={notesError}
                    placeholder="Notes about this plant…"
                  />
                ) : (
                  <Pressable
                    onPress={() => setEditingNotes(true)}
                    style={({ pressed }) => pressed && styles.dimmed}
                  >
                    <View style={styles.notesRow}>
                      {plant.notes ? (
                        <Text style={styles.notes}>{plant.notes}</Text>
                      ) : (
                        <Text style={styles.notesHint}>✎ Add notes</Text>
                      )}
                      {plant.notes ? (
                        <Text style={styles.editHint}>✎ edit</Text>
                      ) : null}
                    </View>
                  </Pressable>
                )}
              </>
            ) : (
              <View style={styles.nameRowPlaceholder} />
            )}
            <View style={styles.askBlock}>
              <TextInput
                value={askText}
                onChangeText={setAskText}
                multiline
                style={styles.askInput}
                placeholder="Ask the plant doctor anything…"
                placeholderTextColor={theme.colors.textMuted}
                maxLength={500}
              />
              <Pressable
                onPress={onAsk}
                disabled={!askText.trim()}
                style={({ pressed }) => [styles.askButton, !askText.trim() && styles.askButtonDisabled, pressed && styles.dimmed]}
              >
                <Text style={styles.askButtonLabel}>Ask</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => setChatsSheetOpen(true)}
              style={({ pressed }) => pressed && styles.dimmed}
            >
              <Text style={styles.allChatsLink}>All chats ({chats?.length ?? 0})</Text>
            </Pressable>
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
      <ChatsSheet plantId={plantId} visible={chatsSheetOpen} onClose={() => setChatsSheetOpen(false)} />
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
  notesRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  notes: { ...theme.typography.body, color: theme.colors.text, flex: 1 },
  notesHint: { ...theme.typography.body, color: theme.colors.textMuted },
  nameRowPlaceholder: { height: 32 },
  sectionTitle: { ...theme.typography.subtitle, color: theme.colors.text, marginTop: theme.spacing.sm },
  separator: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.xs },
  headerRight: { flexDirection: 'row', gap: 12 },
  askBlock: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm },
  askInput: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
    borderWidth: 1.5,
    borderColor: theme.colors.leaf,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
  },
  askButton: {
    backgroundColor: theme.colors.leaf,
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  askButtonDisabled: { backgroundColor: theme.colors.border },
  askButtonLabel: { ...theme.typography.body, color: theme.colors.creamSurface, fontWeight: '700' },
  allChatsLink: { ...theme.typography.body, color: theme.colors.leaf, fontWeight: '600', paddingVertical: theme.spacing.xs },
  dimmed: { opacity: 0.6 },
});