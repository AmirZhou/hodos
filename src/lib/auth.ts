// Simple email-based auth stored in localStorage and Convex

const STORAGE_KEY = 'hodos_user';

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthStore {
  getUser: () => User | null;
  setUser: (user: User) => void;
  logout: () => void;
  isLoggedIn: () => boolean;
}

export function createAuthStore(): AuthStore {
  let currentUser: User | null = null;

  // Initialize from localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        currentUser = JSON.parse(stored);
      } catch {
        currentUser = null;
      }
    }
  }

  return {
    getUser: () => currentUser,

    setUser: (user: User) => {
      currentUser = user;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      }
    },

    logout: () => {
      currentUser = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    },

    isLoggedIn: () => currentUser !== null,
  };
}

// Email validation
export function validateEmail(email: string): boolean {
  if (!email || email.trim() === '') {
    return false;
  }
  // Simple regex for email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Singleton instance for the app
let authStoreInstance: AuthStore | null = null;

export function getAuthStore(): AuthStore {
  if (!authStoreInstance) {
    authStoreInstance = createAuthStore();
  }
  return authStoreInstance;
}
