"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";

const NAV: { href: string; label: string; roles?: Role[] }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/catalog", label: "Catalog" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/enquiries", label: "Enquiries", roles: ["hq_admin", "b2b_desk"] },
  { href: "/admin/repairs", label: "Repairs", roles: ["hq_admin", "repair_desk", "outlet_manager"] },
  { href: "/admin/rentals", label: "Rentals" },
  { href: "/admin/network", label: "Network", roles: ["hq_admin"] },
  { href: "/admin/users", label: "Users & roles", roles: ["hq_admin"] },
  { href: "/admin/sync", label: "Zoho sync health", roles: ["hq_admin"] },
  { href: "/admin/analytics", label: "Analytics", roles: ["hq_admin", "b2b_desk"] },
];

export function AdminNav({ role }: { role?: Role }) {
  const path = usePathname();
  return (
    <nav className="w-48 shrink-0 space-y-1">
      {NAV.filter((n) => !n.roles || (role && n.roles.includes(role))).map((n) => {
        const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`block rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-brand-600 text-white" : "text-ink-700 hover:bg-white"}`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
