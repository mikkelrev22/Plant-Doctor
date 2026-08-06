import { Link, useLocation } from 'react-router-dom';
import {
  Avatar,
  Group,
  ScrollArea,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { IconPlant } from '@tabler/icons-react';
import type { PlantListItemDto } from '@plant-doctor/api-types';
import { toImgSrc } from '../utils/urls';
import styles from '../app.module.css';

interface SidebarProps {
  plants: PlantListItemDto[];
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
                  <Group gap="sm" wrap="nowrap">
                    {plant.thumbnailUrl ? (
                      <Avatar
                        src={toImgSrc(plant.thumbnailUrl)}
                        alt={plant.name}
                        radius="sm"
                        size="sm"
                      />
                    ) : (
                      <Avatar radius="sm" size="sm">
                        <IconPlant size={16} />
                      </Avatar>
                    )}
                    <Text size="sm" truncate="end" style={{ flex: 1 }}>
                      {plant.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      ({plant.reportCount})
                    </Text>
                  </Group>
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
