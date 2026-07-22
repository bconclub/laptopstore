"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  LogOut,
  MessageSquareQuote,
  Network,
  Package,
  RefreshCw,
  CalendarClock,
  Users,
  Wrench,
} from "lucide-react";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
}

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "",
    items: [{ href: "/admin", label: "Home", icon: LayoutDashboard }],
  },
  {
    title: "Commerce",
    items: [
      { href: "/admin/catalog", label: "Catalog", icon: Boxes },
      { href: "/admin/orders", label: "Orders", icon: Package },
      { href: "/admin/enquiries", label: "Enquiries", icon: MessageSquareQuote, roles: ["hq_admin", "b2b_desk"] },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/admin/repairs", label: "Repairs", icon: Wrench, roles: ["hq_admin", "repair_desk", "outlet_manager"] },
      { href: "/admin/rentals", label: "Rentals", icon: CalendarClock },
      { href: "/admin/network", label: "Network", icon: Network, roles: ["hq_admin"] },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/users", label: "Users & roles", icon: Users, roles: ["hq_admin"] },
      { href: "/admin/sync", label: "Zoho sync", icon: RefreshCw, roles: ["hq_admin"] },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3, roles: ["hq_admin", "b2b_desk"] },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = {
  hq_admin: "Admin · HQ",
  outlet_manager: "Store Manager",
  distributor: "Distributor",
  repair_desk: "Repair Desk",
  b2b_desk: "B2B Desk",
};

export function AdminNav({ role, name }: { role?: Role; name?: string }) {
  const path = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const initials = (name ?? "LS").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <nav className="flex h-screen w-60 shrink-0 flex-col border-r border-line bg-white">
      {/* Brand */}
      <Link href="/admin" className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-black tracking-tight text-white">
          LS
        </span>
        <span>
          <span className="block text-sm font-bold leading-tight text-ink-900">Laptop Store</span>
          <span className="block text-[11px] font-medium leading-tight text-ink-400">The Laptop Specialist</span>
        </span>
      </Link>

      {/* Nav groups */}
      <div className="flex-1 space-y-5 overflow-y-auto px-3">
        {GROUPS.map((g) => {
          const items = g.items.filter((n) => !n.roles || (role && n.roles.includes(role)));
          if (!items.length) return null;
          return (
            <div key={g.title || "home"}>
              {g.title && (
                <p className="mb-1 px-2 text-[11px] font-semibold text-ink-300">{g.title}</p>
              )}
              <div className="space-y-0.5">
                {items.map((n) => {
                  const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
                  const Icon = n.icon;
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors duration-150 ${
                        active
                          ? "bg-brand-50 font-semibold text-brand-700"
                          : "font-medium text-ink-600 hover:bg-surface hover:text-ink-900"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? "text-brand-600" : "text-ink-300"}`} />
                      {n.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* User */}
      <div className="border-t border-line px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-400 text-xs font-bold text-ink-900">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold leading-tight text-ink-900">{name ?? "Staff"}</span>
            <span className="block text-[11px] leading-tight text-ink-400">{ROLE_LABEL[role ?? ""] ?? "Signed in"}</span>
          </span>
          <button onClick={signOut} title="Sign out" className="rounded-md p-1.5 text-ink-300 transition-colors hover:bg-surface hover:text-ink-700">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
