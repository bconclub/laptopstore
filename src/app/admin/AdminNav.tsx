"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeftRight, BarChart3, Boxes, CalendarClock, LayoutDashboard, LogOut,
  MessageSquareQuote, Network, Package, PanelLeftClose, PanelLeftOpen,
  RefreshCw, Users, Wrench,
} from "lucide-react";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
}

const GROUPS: { title: string; items: NavItem[] }[] = [
  { title: "", items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }] },
  {
    title: "Commerce",
    items: [
      { href: "/admin/catalog", label: "Products", icon: Boxes },
      { href: "/admin/orders", label: "Orders", icon: Package },
      { href: "/admin/enquiries", label: "Enquiries", icon: MessageSquareQuote, roles: ["hq_admin", "b2b_desk"] },
      { href: "/admin/exchanges", label: "Exchanges", icon: ArrowLeftRight, roles: ["hq_admin", "b2b_desk", "outlet_manager"] },
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

export function AdminNav({ role, name, mobileOpen = false, onNavigate }: { role?: Role; name?: string; mobileOpen?: boolean; onNavigate?: () => void }) {
  const path = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // Persist the collapse preference — long-session users set it once. (desktop only)
  useEffect(() => { setCollapsed(localStorage.getItem("ls-nav-collapsed") === "1"); }, []);
  function toggle() {
    setCollapsed((c) => { localStorage.setItem("ls-nav-collapsed", c ? "0" : "1"); return !c; });
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const initials = (name ?? "LS").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  // Collapse (icon-rail) is a desktop affordance; on mobile the drawer is always full width.
  const W = collapsed ? "md:w-16" : "md:w-60";

  return (
    <nav className={`fixed inset-y-0 left-0 z-[1300] flex h-screen w-64 shrink-0 flex-col border-r border-line bg-white transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${W} ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
      {/* collapse hides labels on DESKTOP only via md: overrides; the mobile
          drawer is always full-width + labelled. */}
      {/* Brand + collapse toggle */}
      <div className="flex items-center gap-2.5 px-4 pb-5 pt-5">
        <Link href="/admin" onClick={onNavigate} className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon.png" alt="Laptop Store" className="h-9 w-9" />
          <span className={`text-base font-bold leading-tight text-ink-900 ${collapsed ? "md:hidden" : ""}`}>Laptop Store</span>
        </Link>
        <span className={`flex-1 ${collapsed ? "md:hidden" : ""}`} />
        <button onClick={toggle} title={collapsed ? "Expand" : "Collapse"}
          className="hidden rounded-md p-1.5 text-ink-300 transition-colors hover:bg-surface hover:text-ink-700 md:inline-flex">
          {collapsed ? <PanelLeftOpen className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
        </button>
      </div>

      {/* Nav groups */}
      <div className="flex-1 space-y-4 overflow-y-auto px-2.5">
        {GROUPS.map((g) => {
          const items = g.items.filter((n) => !n.roles || (role && n.roles.includes(role)));
          if (!items.length) return null;
          return (
            <div key={g.title || "home"}>
              {g.title && <p className={`mb-1 px-2 text-[11px] font-semibold text-ink-300 ${collapsed ? "md:hidden" : ""}`}>{g.title}</p>}
              {g.title && collapsed && <div className="mx-2 mb-1 hidden border-t border-line md:block" />}
              <div className="space-y-0.5">
                {items.map((n) => {
                  const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
                  const Icon = n.icon;
                  return (
                    <Link key={n.href} href={n.href} onClick={onNavigate} title={collapsed ? n.label : undefined}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors duration-150 ${collapsed ? "md:justify-center md:gap-0 md:px-0" : ""} ${
                        active ? "bg-brand-50 font-semibold text-brand-700" : "font-medium text-ink-600 hover:bg-surface hover:text-ink-900"
                      }`}>
                      <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? "text-brand-600" : "text-ink-300"}`} />
                      <span className={collapsed ? "md:hidden" : ""}>{n.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* User */}
      <div className="border-t border-line px-2.5 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-400 text-xs font-bold text-ink-900">{initials}</span>
          <span className={`min-w-0 flex-1 ${collapsed ? "md:hidden" : ""}`}>
            <span className="block truncate text-sm font-semibold leading-tight text-ink-900">{name ?? "Staff"}</span>
            <span className="block text-[11px] leading-tight text-ink-400">{ROLE_LABEL[role ?? ""] ?? "Signed in"}</span>
          </span>
          <button onClick={signOut} title="Sign out" className={`rounded-md p-1.5 text-ink-300 transition-colors hover:bg-surface hover:text-ink-700 ${collapsed ? "md:hidden" : ""}`}>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        {collapsed && (
          <button onClick={signOut} title="Sign out" className="mt-1 hidden w-full justify-center rounded-md p-1.5 text-ink-300 transition-colors hover:bg-surface hover:text-ink-700 md:flex">
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </nav>
  );
}
