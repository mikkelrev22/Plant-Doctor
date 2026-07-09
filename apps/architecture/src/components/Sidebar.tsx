import { useState } from 'react';
import {
  Button,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Divider,
  Badge,
  Box,
} from '@mantine/core';
import { IconDeviceFloppy, IconRefresh, IconPlus } from '@tabler/icons-react';
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
}: SidebarProps) {
  const [type, setType] = useState<NodeKind>('feature');
  const [label, setLabel] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);

  const appGroups = nodes.filter((n) => n.data?.kind === 'app');
  const parentOptions = appGroups.map((n) => ({
    value: n.id,
    label: (n.data as { label: string }).label,
  }));

  const handleAdd = () => {
    if (!label.trim()) return;
    onAddNode({ type, label: label.trim(), parentId: parentId ?? undefined });
    setLabel('');
  };

  return (
    <Stack gap="md" p="md" justify="flex-start" className={classes.sidebar}>
      <div>
        <Title order={4}>Plant Doctor</Title>
        <Text size="xs" c="dimmed">
          Architecture map — drag, connect, and save.
        </Text>
      </div>

      <Divider />

      <Stack gap="xs">
        <Text size="sm" fw={600}>
          Legend
        </Text>
        {LEGEND.map((item) => (
          <Group key={item.kind} gap="xs" align="center">
            <Badge color={LEGEND_COLOR[item.kind]} variant="filled" size="sm">
              {item.label}
            </Badge>
          </Group>
        ))}
      </Stack>

      <Divider />

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
        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={onReset}
          disabled={dirty}
          variant="light"
          size="sm"
        >
          Reset
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
        <Text size="xs" c="dimmed">
          Tip: drag from a node&rsquo;s right handle to another&rsquo;s left
          handle to connect them.
        </Text>
      </Stack>

      <Box className={classes.spacer} />
    </Stack>
  );
}