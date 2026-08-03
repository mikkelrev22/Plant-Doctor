import { useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSessionStore } from '@/state/session-store';

/**
 * Auth gate for the fake-session prototype. Redirects to `/login` when there's
 * no session. Returns the user (or null while the redirect is pending) so the
 * calling screen can bail out of rendering until authenticated.
 *
 * Place `const user = useRequireAuth(); if (!user) return null;` at the top of
 * every protected screen.
 *
 * Navigating from a child screen's `useEffect` on cold start races the root
 * navigation container mounting and throws "Attempted to navigate before
 * mounting the Root Layout component" on expo-router (notably SDK 54, which
 * lacks the virtual root navigator newer SDKs mount to absorb this). This
 * mirrors expo-router's own `<Redirect>` component: `useFocusEffect` waits for
 * the navigation state to load before running the callback (it won't fire
 * before the navigator is mounted), and the try/catch is the same safety net
 * `<Redirect>` uses against any residual readiness race.
 */
export function useRequireAuth() {
  const user = useSessionStore((s) => s.user);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        try {
          router.replace('/login');
        } catch (error) {
          console.error(error);
        }
      }
    }, [user, router]),
  );

  return user;
}