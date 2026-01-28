"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

interface RequireAuthProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Wrapper component that redirects unauthenticated users to login.
 * Use this to protect client-side routes instead of adding redirect logic to each page.
 *
 * Usage:
 * ```tsx
 * export default function ProtectedPage() {
 *   return (
 *     <RequireAuth>
 *       <YourPageContent />
 *     </RequireAuth>
 *   );
 * }
 * ```
 */
export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return fallback ?? (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--foreground-secondary)]">Loading...</p>
      </div>
    );
  }

  // Don't render children until redirect completes
  if (!isAuthenticated) {
    return fallback ?? (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--foreground-secondary)]">Redirecting to login...</p>
      </div>
    );
  }

  return <>{children}</>;
}
