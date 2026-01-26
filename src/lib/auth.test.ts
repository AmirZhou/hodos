import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthStore, createAuthStore } from './auth';

describe('AuthStore', () => {
  let authStore: AuthStore;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    authStore = createAuthStore();
  });

  describe('getUser', () => {
    it('returns null when no user is logged in', () => {
      const user = authStore.getUser();
      expect(user).toBeNull();
    });

    it('returns user data when user is logged in', () => {
      localStorage.setItem('hodos_user', JSON.stringify({
        id: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
      }));

      authStore = createAuthStore(); // Recreate to read from storage
      const user = authStore.getUser();

      expect(user).toEqual({
        id: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
      });
    });
  });

  describe('setUser', () => {
    it('stores user in localStorage', () => {
      authStore.setUser({
        id: 'user456',
        email: 'new@example.com',
        displayName: 'New User',
      });

      const stored = JSON.parse(localStorage.getItem('hodos_user') || 'null');
      expect(stored).toEqual({
        id: 'user456',
        email: 'new@example.com',
        displayName: 'New User',
      });
    });

    it('updates getUser to return the new user', () => {
      authStore.setUser({
        id: 'user789',
        email: 'another@example.com',
        displayName: 'Another User',
      });

      const user = authStore.getUser();
      expect(user?.email).toBe('another@example.com');
    });
  });

  describe('logout', () => {
    it('clears the stored user', () => {
      authStore.setUser({
        id: 'user123',
        email: 'test@example.com',
        displayName: 'Test',
      });

      authStore.logout();

      expect(authStore.getUser()).toBeNull();
      expect(localStorage.getItem('hodos_user')).toBeNull();
    });
  });

  describe('isLoggedIn', () => {
    it('returns false when no user', () => {
      expect(authStore.isLoggedIn()).toBe(false);
    });

    it('returns true when user exists', () => {
      authStore.setUser({
        id: 'user123',
        email: 'test@example.com',
        displayName: 'Test',
      });

      expect(authStore.isLoggedIn()).toBe(true);
    });
  });
});

describe('email validation', () => {
  it('validates correct email format', async () => {
    const { validateEmail } = await import('./auth');

    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.co.uk')).toBe(true);
  });

  it('rejects invalid email format', async () => {
    const { validateEmail } = await import('./auth');

    expect(validateEmail('')).toBe(false);
    expect(validateEmail('notanemail')).toBe(false);
    expect(validateEmail('missing@domain')).toBe(false);
    expect(validateEmail('@nodomain.com')).toBe(false);
  });
});
