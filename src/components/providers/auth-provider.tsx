"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { createAuthStore, User as LocalUser, validateEmail } from "@/lib/auth";

interface User {
  _id: Id<"users">;
  email: string;
  displayName: string;
  settings: {
    language: "en" | "fr" | "bilingual";
    explicitContent: boolean;
    videoEnabled: boolean;
    frenchLevel: "none" | "beginner" | "intermediate" | "advanced";
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [localUser, setLocalUser] = useState<LocalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authStore] = useState(() => createAuthStore());

  const getOrCreateByEmail = useMutation(api.users.getOrCreateByEmail);

  // Load user from localStorage on mount
  useEffect(() => {
    const stored = authStore.getUser();
    setLocalUser(stored);
    setIsLoading(false);
  }, [authStore]);

  // Query Convex for user data when we have a local user
  const convexUser = useQuery(
    api.users.getByEmail,
    localUser?.email ? { email: localUser.email } : "skip"
  );

  const login = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (!validateEmail(email)) {
      return { success: false, error: "Please enter a valid email address" };
    }

    try {
      setIsLoading(true);
      const user = await getOrCreateByEmail({ email });

      if (user) {
        const localUserData: LocalUser = {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
        };
        authStore.setUser(localUserData);
        setLocalUser(localUserData);
        return { success: true };
      }

      return { success: false, error: "Failed to create user" };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "An error occurred during login" };
    } finally {
      setIsLoading(false);
    }
  }, [getOrCreateByEmail, authStore]);

  const logout = useCallback(() => {
    authStore.logout();
    setLocalUser(null);
  }, [authStore]);

  const value: AuthContextType = {
    user: convexUser as User | null,
    isLoading: isLoading || (localUser !== null && convexUser === undefined),
    isAuthenticated: localUser !== null && convexUser !== null,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
