import { beforeEach, describe, expect, it } from 'vitest';
import { useSessionStore } from './session-store';

describe('session store', () => {
  beforeEach(() => useSessionStore.setState({ user: null }));

  it('starts logged out', () => {
    expect(useSessionStore.getState().user).toBeNull();
  });

  it('login sets the Research User (id=1)', () => {
    useSessionStore.getState().login();
    expect(useSessionStore.getState().user).toEqual({ id: 1, displayName: 'Test User' });
  });

  it('logout clears the user', () => {
    useSessionStore.getState().login();
    useSessionStore.getState().logout();
    expect(useSessionStore.getState().user).toBeNull();
  });
});