import { Link, useLocation } from 'react-router-dom';
import { ScrollArea, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import type { PlantDto } from '@plant-doctor/api-types';
import styles from '../app.module.css';

interface SidebarProps {
  plants: PlantDto[];
}

export function Sidebar({ plants }: SidebarProps) {
  const location = useLocation();

  return (
    <ScrollArea h="100%">
      <Stack gap="md">
        <Stack gap={4}>
          <Title order={3}>Plants</Title>
        </Stack>
        <Stack gap="0">
          {plants.length ? (
            plants.map((plant) => {
              const to = `/plant/${plant.id}`;
              const isActive = location.pathname === to;

              return (
                <UnstyledButton
                  component={Link}
                  key={plant.id}
                  to={to}
                  className={styles.navButton}
                  data-active={isActive || undefined}
                >
                  <Text size="sm">{plant.name}</Text>
                </UnstyledButton>
              );
            })
          ) : (
            <Text c="dimmed" size="sm">
              No plants saved yet.
            </Text>
          )}
        </Stack>
      </Stack>
    </ScrollArea>
  );
}
