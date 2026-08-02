import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

/**
 * App-wide providers. The QueryClient is created once per session with a short
 * staleTime so returning to a screen shows fresh data without a loading flash.
 * `GestureHandlerRootView` is required for the lightbox pinch/pan gestures.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <GestureHandlerRootView style={{ flex: 1 }}>{children}</GestureHandlerRootView>
    </QueryClientProvider>
  );
}