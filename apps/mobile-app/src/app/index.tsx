import { router } from 'expo-router';
import { useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import type { PlantListItemDto } from '@plant-doctor/api-types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlantListItem } from '@/components/ui/PlantListItem';
import { Screen } from '@/components/ui/Screen';
import { Spinner } from '@/components/ui/Spinner';
import { theme } from '@/constants/theme';
import { usePlants } from '@/hooks/queries';
import { useRequireAuth } from '@/hooks/use-require-auth';

/** Home: list of plants with thumbnail + report count, plus "Add plant". */
export default function HomeScreen() {
  const user = useRequireAuth();
  const { data: plants, isLoading, error, refetch, isRefetching } = usePlants();

  const openPlant = useCallback(
    (id: number) => router.push({ pathname: '/plant/[id]', params: { id: String(id) } }),
    [],
  );

  const renderItem: ListRenderItem<PlantListItemDto> = useCallback(
    ({ item }) => <PlantListItem plant={item} onPress={() => openPlant(item.id)} />,
    [openPlant],
  );

  if (!user) return null;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>My Plants</Text>
        <Button
          title="Add plant"
          variant="secondary"
          onPress={() => router.push('/add-plant')}
        />
      </View>
      <FlatList
        data={plants}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={plants ? styles.list : styles.center}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.colors.leaf} />}
        ListEmptyComponent={
          error ? (
            <EmptyState
              title="Couldn't load plants"
              subtitle={error.message}
              actionLabel="Retry"
              onAction={() => refetch()}
            />
          ) : isLoading ? (
            <Spinner label="Loading plants…" />
          ) : (
            <EmptyState
              title="No plants yet"
              subtitle="Add your first plant to get a diagnosis."
              actionLabel="Add plant"
              onAction={() => router.push('/add-plant')}
            />
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.lg,
  },
  title: { ...theme.typography.title, color: theme.colors.leafDark },
  list: { paddingBottom: theme.spacing.xl },
  center: { flex: 1 },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
});