import { router, Stack } from 'expo-router';
import { palette } from '@/constants/theme';
import { Providers } from '@/components/Providers';
import { HeaderButton } from '@/components/ui/HeaderButton';

/**
 * Root layout: app-wide QueryClient + a light-mode Stack. The auth gate lives
 * per-screen via `useRequireAuth()`; the login route is always reachable.
 */
export default function RootLayout() {
  return (
    <Providers>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: palette.cream },
          headerStyle: { backgroundColor: palette.cream },
          headerTintColor: palette.text,
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen name="login" options={{ title: 'Sign in', headerShown: false }} />
        <Stack.Screen
          name="index"
          options={{
            title: 'My Plants',
            headerRight: () => (
              <HeaderButton label="New plant" onPress={() => router.push('/add-plant')} />
            ),
          }}
        />
        <Stack.Screen name="plant/[id]" options={{ title: 'Plant' }} />
        <Stack.Screen name="report/[id]" options={{ title: 'Report' }} />
        <Stack.Screen name="add-plant" options={{ title: 'Add plant', presentation: 'modal' }} />
        <Stack.Screen
          name="new-report/[plantId]"
          options={{ title: 'New report', presentation: 'modal' }}
        />
        <Stack.Screen name="analyzing" options={{ title: 'Analyzing', headerShown: false }} />
      </Stack>
    </Providers>
  );
}