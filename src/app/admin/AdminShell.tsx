"use client";

/**
 * Admin shell — desktop: static sidebar rail + content. Mobile (<md): the
 * sidebar becomes an off-canvas drawer opened from a top bar hamburger, so
 * the whole admin is usable on a phone.
 */

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { AdminNav } from "./AdminNav";
import type { Role } from "@/lib/types";

export function AdminShell({ role, name, children }: { role?: Role; name?: string; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scroll while the mobile drawer is open; ESC closes it.
  useEffect(() => {
    if (!mobileOpen) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} className="fixed inset-0 z-[1290] bg-ink-900/30 md:hidden" aria-hidden="true" />
      )}

      {/* Sidebar — static on md+, off-canvas drawer below md */}
      <div className="md:sticky md:top-0 md:h-screen">
        <AdminNav role={role} name={name} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-[1280] flex items-center gap-3 border-b border-line bg-white px-4 py-3 md:hidden">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu"
            className="rounded-lg p-1.5 text-ink-600 transition-colors hover:bg-surface">
            <Menu className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon.png" alt="" className="h-7 w-7" />
          <span className="text-sm font-bold text-ink-900">Laptop Store</span>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-7">{children}</main>
      </div>
    </div>
  );
}
