"use client";

import { cn } from "@/lib/utils";
import {
  Home,
  Compass,
  ScrollText,
  Plus,
  Settings,
  HelpCircle,
  Users,
  BookOpen,
  LogIn,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

const mainNav: NavItem[] = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Compass, label: "Discover", href: "/campaigns" },
  { icon: ScrollText, label: "Campaigns", href: "/campaigns" },
  { icon: Users, label: "Characters", href: "/characters" },
];

const secondaryNav: NavItem[] = [
  { icon: BookOpen, label: "Learn French", href: "/notebook" },
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: HelpCircle, label: "Help", href: "/help" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-16 flex-col border-r border-[var(--border)] bg-[var(--background-secondary)] lg:w-56">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-[var(--border)] px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-gold)] text-[var(--background)] font-bold">
            H
          </div>
          <span className="hidden text-lg font-semibold lg:block">Hodos</span>
        </Link>
      </div>

      {/* Create Button */}
      <div className="p-3">
        <Link href="/campaigns/new">
          <Button className="w-full justify-center lg:justify-start gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden lg:inline">Create</span>
          </Button>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {mainNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--background-tertiary)] text-[var(--foreground)]"
                  : "text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)] hover:text-[var(--foreground)]"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="hidden lg:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Secondary Navigation */}
      <nav className="border-t border-[var(--border)] p-3 space-y-1">
        {secondaryNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--background-tertiary)] text-[var(--foreground)]"
                  : "text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)] hover:text-[var(--foreground)]"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="hidden lg:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-[var(--border)] p-3">
        {isAuthenticated && user ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="h-8 w-8 rounded-full bg-[var(--accent-purple)] flex items-center justify-center text-white text-sm font-medium">
                {user.displayName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
              </div>
              <div className="hidden lg:block flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.displayName || "User"}</p>
                <p className="text-xs text-[var(--foreground-muted)] truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium w-full text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)] hover:text-[var(--foreground)] transition-colors"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span className="hidden lg:block">Sign out</span>
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)] hover:text-[var(--foreground)] transition-colors"
          >
            <LogIn className="h-5 w-5 flex-shrink-0" />
            <span className="hidden lg:block">Sign in</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
