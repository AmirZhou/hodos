"use client";

import { createContext, useContext, useEffect, ReactNode, useCallback } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface User {
  _id: Id<"users">;
  email: string;
  displayName: string;
  settings: {
    language?: string;
    explicitContent: boolean;
    videoEnabled: boolean;
    frenchLevel?: string;
    intensityPreference?: number;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { isAuthenticated: convexAuthed, isLoading: convexLoading } =
    useConvexAuth();
  const { signOut } = useClerk();

  const syncClerkUser = useMutation(api.users.syncClerkUser);

  // Query Convex user by clerkId when signed in
  const convexUser = useQuery(
    api.users.getByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  // Sync Clerk user into Convex on sign-in
  useEffect(() => {
    if (convexAuthed && clerkUser) {
      syncClerkUser().catch(console.error);
    }
  }, [convexAuthed, clerkUser, syncClerkUser]);

  const logout = useCallback(() => {
    signOut();
  }, [signOut]);

  const isLoading =
    !clerkLoaded || convexLoading || (clerkUser !== null && convexUser === undefined);

  const value: AuthContextType = {
    user: (convexUser as User | null) ?? null,
    isLoading,
    isAuthenticated: !!clerkUser && convexUser !== null && convexUser !== undefined,
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
