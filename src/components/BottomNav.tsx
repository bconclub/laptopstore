"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Wrench, MapPin, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/categories", label: "Browse", icon: LayoutGrid },
  { href: "/service", label: "Repair", icon: Wrench },
  { href: "/stores", label: "Stores", icon: MapPin },
  { href: "/cart", label: "Cart", icon: ShoppingBag },
] as const;

/** App-style bottom navigation, mobile only, max 5 items, 44px+ targets. */
export default function BottomNav() {
  const pathname = usePathname();
  const { count } = useCart();

  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white lg:hidden"
      aria-label="Primary"
    >
      <div className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                active ? "text-brand-600" : "text-ink-500 hover:text-ink-900"
              }`}
            >
              <span className="relative">
                <Icon className="h-5.5 w-5.5" strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
                {href === "/cart" && count > 0 ? (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-ink-900">
                    {count}
                  </span>
                ) : null}
              </span>
              {label}
              {active ? (
                <span className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-brand-500" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
