import { useEffect, useState } from 'react';
import { ActionIcon, Group, Stack, Text, TextInput, Title } from '@mantine/core';
import { IconCheck, IconEdit, IconX } from '@tabler/icons-react';
import { useUpdatePlantName } from '../queries';

interface PlantNameEditorProps {
  plantId: number;
  initialName: string;
  species?: string | null;
  onMutationError?: (error: string | null) => void;
}

export function PlantNameEditor({
  plantId,
  initialName,
  species,
  onMutationError,
}: PlantNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(initialName);

  const updateNameMutation = useUpdatePlantName();

  useEffect(() => {
    setEditedName(initialName);
  }, [initialName]);

  useEffect(() => {
    if (onMutationError) {
      onMutationError(updateNameMutation.error?.message ?? null);
    }
  }, [updateNameMutation.error, onMutationError]);

  function handleSaveName() {
    if (!plantId || !editedName.trim()) return;
    updateNameMutation.mutate(
      { id: plantId, name: editedName.trim() },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      },
    );
  }

  function handleCancel() {
    setIsEditing(false);
    setEditedName(initialName);
  }

  if (isEditing) {
    return (
      <Group gap="xs">
        <TextInput
          value={editedName}
          onChange={(e) => setEditedName(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveName();
            if (e.key === 'Escape') handleCancel();
          }}
          autoFocus
          size="lg"
          style={{ flex: 1 }}
        />
        <ActionIcon
          onClick={handleSaveName}
          loading={updateNameMutation.isPending}
          variant="light"
          color="green"
          size="lg"
        >
          <IconCheck size={20} />
        </ActionIcon>
        <ActionIcon
          onClick={handleCancel}
          variant="light"
          color="red"
          size="lg"
        >
          <IconX size={20} />
        </ActionIcon>
      </Group>
    );
  }

  return (
    <Stack gap={2}>
      <Group gap="xs" align="center">
        <Title order={1}>{initialName}</Title>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => setIsEditing(true)}
        >
          <IconEdit size={20} />
        </ActionIcon>
      </Group>
      {species ? (
        <Text size="md">
          Species: <b>{species}</b>
        </Text>
      ) : null}
    </Stack>
  );
}
