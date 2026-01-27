"use client";

import { cn } from "@/lib/utils";
import { Home, ScrollText, Swords, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

const navItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Plus, label: "Create", href: "/campaigns/new", isCreate: true },
  { icon: ScrollText, label: "Campaigns", href: "/campaigns" },
  { icon: Swords, label: "Characters", href: "/characters" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-[var(--border)] bg-[var(--background-secondary)] lg:hidden">
      {navItems.map((item) => {
        const isActive = pathname === item.href;

        if (item.isCreate) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-gold)] text-[var(--background)]"
            >
              <item.icon className="h-6 w-6" />
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2",
              isActive
                ? "text-[var(--accent-gold)]"
                : "text-[var(--foreground-muted)]"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
