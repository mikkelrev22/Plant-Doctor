import { useEffect, useState } from 'react';
import {
  Button,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Divider,
  Badge,
  Box,
} from '@mantine/core';
import { IconDeviceFloppy, IconRefresh, IconPlus, IconPencil } from '@tabler/icons-react';
import type { ArchEdge, ArchNode, NodeKind } from '../types';
import classes from './Sidebar.module.css';

interface AddNodeInput {
  type: NodeKind;
  label: string;
  parentId?: string;
}

interface SidebarProps {
  nodes: ArchNode[];
  edges: ArchEdge[];
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
  onAddNode: (input: AddNodeInput) => void;
  selectedNode: ArchNode | null;
  onRenameNode: (id: string, label: string) => void;
}

const LEGEND: { kind: NodeKind; label: string }[] = [
  { kind: 'app', label: 'Application' },
  { kind: 'feature', label: 'Feature / page' },
  { kind: 'endpoint', label: 'API endpoint' },
  { kind: 'lib', label: 'Shared library' },
];

const LEGEND_COLOR: Record<NodeKind, string> = {
  app: 'violet',
  feature: 'teal',
  endpoint: 'grape',
  lib: 'gray',
};

const TYPE_OPTIONS = [
  { value: 'feature', label: 'Feature / page' },
  { value: 'endpoint', label: 'API endpoint' },
  { value: 'lib', label: 'Shared library' },
  { value: 'app', label: 'Application group' },
];

export function Sidebar({
  nodes,
  edges,
  dirty,
  saving,
  onSave,
  onReset,
  onAddNode,
  selectedNode,
  onRenameNode,
}: SidebarProps) {
  const [type, setType] = useState<NodeKind>('feature');
  const [label, setLabel] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const appGroups = nodes.filter((n) => n.data?.kind === 'app');
  const parentOptions = appGroups.map((n) => ({
    value: n.id,
    label: (n.data as { label: string }).label,
  }));

  // Keep the rename input in sync with the currently selected node.
  useEffect(() => {
    setRenameValue(
      selectedNode ? (selectedNode.data as { label: string }).label : '',
    );
  }, [selectedNode]);

  const handleAdd = () => {
    if (!label.trim()) return;
    onAddNode({ type, label: label.trim(), parentId: parentId ?? undefined });
    setLabel('');
  };

  const handleRename = () => {
    if (!selectedNode || !renameValue.trim()) return;
    onRenameNode(selectedNode.id, renameValue);
  };

  return (
    <Stack gap="md" p="md" justify="flex-start" className={classes.sidebar}>
      
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Text size="sm" fw={600}>
            Status
          </Text>
          <Text size="xs" c={dirty ? 'orange' : 'dimmed'}>
            {dirty ? 'Unsaved changes' : 'Saved'}
          </Text>
        </Group>
        <Text size="xs" c="dimmed">
          {nodes.length} nodes · {edges.length} edges
        </Text>
        <Button
          leftSection={<IconDeviceFloppy size={16} />}
          onClick={onSave}
          loading={saving}
          disabled={!dirty}
          color="teal"
          size="sm"
        >
          Save
        </Button>
      </Stack>

      <Divider />

      <Stack gap="xs">
        <Text size="sm" fw={600}>
          Add node
        </Text>
        <Select
          label="Type"
          data={TYPE_OPTIONS}
          value={type}
          onChange={(v) => v && setType(v as NodeKind)}
          size="xs"
        />
        <TextInput
          label="Label"
          placeholder="e.g. GET /plants"
          value={label}
          onChange={(e) => setLabel(e.currentTarget.value)}
          size="xs"
        />
        {type !== 'app' && type !== 'lib' && (
          <Select
            label="Inside group"
            data={parentOptions}
            value={parentId}
            onChange={setParentId}
            placeholder="None"
            size="xs"
            clearable
          />
        )}
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={handleAdd}
          disabled={!label.trim()}
          size="sm"
          variant="light"
        >
          Add
        </Button>
      </Stack>

      <Divider />

      <Stack gap="xs">
        <Text size="sm" fw={600}>
          Rename node
        </Text>
        {selectedNode ? (
          <>
            <Text size="xs" c="dimmed">
              {selectedNode.data?.kind} ·{' '}
              {(selectedNode.data as { label: string }).label}
            </Text>
            <TextInput
              placeholder="New name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
              }}
              size="xs"
            />
            <Button
              leftSection={<IconPencil size={16} />}
              onClick={handleRename}
              disabled={!renameValue.trim()}
              size="sm"
              variant="light"
            >
              Rename
            </Button>
          </>
        ) : (
          <Text size="xs" c="dimmed">
            Select a node to rename it.
          </Text>
        )}
      </Stack>

      <Box className={classes.spacer} />
    </Stack>
  );
}