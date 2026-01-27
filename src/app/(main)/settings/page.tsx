"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { Settings, User } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="h-8 w-8 text-[var(--accent-blue)]" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
        <h2 className="text-sm font-semibold text-[var(--foreground-muted)] uppercase tracking-wide mb-4">
          Account
        </h2>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-[var(--accent-purple)] flex items-center justify-center text-white font-medium">
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium">{user?.displayName || "User"}</p>
            <p className="text-sm text-[var(--foreground-muted)]">
              {user?.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
