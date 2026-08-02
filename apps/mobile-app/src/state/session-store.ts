import { create } from 'zustand';

export interface SessionUser {
  id: number;
  displayName: string;
}

interface SessionState {
  user: SessionUser | null;
  /** Fake login for the prototype: pulls the single Research User (id=1). */
  login: () => void;
  logout: () => void;
}

/**
 * The only client-side state. Everything else lives in React Query.
 * No persistence — the prototype always starts at the login screen.
 */
export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  login: () => set({ user: { id: 1, displayName: 'Test User' } }),
  logout: () => set({ user: null }),
}));