import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSessionStore } from '@/state/session-store';

/**
 * Auth gate for the fake-session prototype. Redirects to `/login` when there's
 * no session. Returns the user (or null while the redirect is pending) so the
 * calling screen can bail out of rendering until authenticated.
 *
 * Place `const user = useRequireAuth(); if (!user) return null;` at the top of
 * every protected screen.
 */
export function useRequireAuth() {
  const user = useSessionStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  return user;
}