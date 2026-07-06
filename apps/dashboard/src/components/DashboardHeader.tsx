import { Group, Loader, Stack, Text, Title } from '@mantine/core';

interface DashboardHeaderProps {
  booting: boolean;
  loading: boolean;
}

export function DashboardHeader({ booting, loading }: DashboardHeaderProps) {
  return (
    <Group justify="space-between" align="flex-start">
      <Stack gap={4}>
        <Title order={1}>
          Plant Doctor <span role={'img'}>🌱</span> Dashboard
        </Title>
        <Text c="dimmed">
          Upload a houseplant photo, log the model interaction, and save a
          longitudinal health report.
        </Text>
      </Stack>
      {booting || loading ? <Loader color="teal" /> : null}
    </Group>
  );
}
