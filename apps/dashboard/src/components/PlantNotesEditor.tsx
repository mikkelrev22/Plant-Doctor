import { useEffect, useState } from 'react';
import {
  ActionIcon, Flex,
  Group,
  Stack,
  Text,
  Textarea,
  Title
} from '@mantine/core';
import { IconCheck, IconEdit, IconX } from '@tabler/icons-react';
import { useUpdatePlantNotes } from '../queries';

interface PlantNotesEditorProps {
  plantId: number;
  initialNotes: string | null;
  onMutationError?: (error: string | null) => void;
}

/** Inline editor for a plant's free-text notes. Mirrors PlantNameEditor, but
 * uses a multi-line Textarea and allows clearing the notes back to null. */
export function PlantNotesEditor({
  plantId,
  initialNotes,
  onMutationError,
}: PlantNotesEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(initialNotes ?? '');

  const updateNotesMutation = useUpdatePlantNotes();

  useEffect(() => {
    setEditedNotes(initialNotes ?? '');
  }, [initialNotes]);

  useEffect(() => {
    if (onMutationError) {
      onMutationError(updateNotesMutation.error?.message ?? null);
    }
  }, [updateNotesMutation.error, onMutationError]);

  function handleSaveNotes() {
    if (!plantId) return;
    updateNotesMutation.mutate(
      { id: plantId, notes: editedNotes.trim() || null },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      },
    );
  }

  function handleCancel() {
    setIsEditing(false);
    setEditedNotes(initialNotes ?? '');
  }

  if (isEditing) {
    return (
      <Flex gap="xs">
        <Textarea
          value={editedNotes}
          onChange={(e) => setEditedNotes(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancel();
          }}
          autosize
          minRows={2}
          w="100%"
          autoFocus
          placeholder="Notes about this plant — context the analysis will weigh…"
        />
        <Group gap="xs">
          <ActionIcon
            onClick={handleSaveNotes}
            loading={updateNotesMutation.isPending}
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
      </Flex>
    );
  }

  if (initialNotes === null) {
    return (
      <Group gap="xs" align="center">
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => setIsEditing(true)}
        >
          <IconEdit size={20} />
        </ActionIcon>
        <Text
          c="dimmed"
          size="sm"
          component="button"
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
          onClick={() => setIsEditing(true)}
        >
          Add notes
        </Text>
      </Group>
    );
  }

  return (
    <Stack gap={2}>
      <Group gap="xs" align="flex-start">
        <Title order={6} c="dimmed">
          Notes
        </Title>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={() => setIsEditing(true)}
          mt={-2}
        >
          <IconEdit size={18} />
        </ActionIcon>
      </Group>
      <Text
        size="sm"
        c="dimmed"
        style={{ whiteSpace: 'pre-wrap' }}
      >
        {initialNotes}
      </Text>
    </Stack>
  );
}