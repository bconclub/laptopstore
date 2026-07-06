"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone, ShoppingBag, Wrench, Menu, X, ChevronDown, Search } from "lucide-react";
import { categories } from "@/data/categories";
import { useCart } from "@/components/cart/CartProvider";
import SearchBox from "@/components/SearchBox";
import CategoryIcon from "@/components/CategoryIcon";

/* Category artwork for the mobile menu */
const categoryImg: Record<string, string> = {
  laptops: "/categories/laptops.png",
  "refurbished-laptops": "/categories/refurbished.png",
  "gaming-laptops": "/categories/gaming.png",
  "laptop-spares": "/categories/spares.png",
  computers: "/categories/desktops.png",
  printers: "/categories/printers.png",
  accessories: "/categories/accessories.png",
};

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const { count, openDrawer } = useCart();

  useEffect(() => {
    // Reveal the header search once the page's own hero (which has its own
    // search box) has been scrolled past — avoids showing two search bars.
    const threshold = () => window.innerHeight * 0.55;
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      setPastHero(window.scrollY > threshold());
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Lock body scroll while the mobile menu sheet is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header
      className={`sticky top-0 z-40 bg-white transition-shadow duration-300 ${
        scrolled ? "shadow-(--shadow-card)" : ""
      }`}
    >
      {/* Utility bar */}
      <div className="hidden bg-space-950 text-white lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1 text-xs">
          <p className="font-medium text-white/90">
            Authorised Dell · HP · Lenovo · Asus store · since 2007
          </p>
          <div className="flex items-center gap-5">
            <Link href="/stores" className="inline-flex items-center gap-1.5 hover:text-accent-400">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Stores in 6 cities
            </Link>
            <a href="tel:+919500156666" className="inline-flex items-center gap-1.5 hover:text-accent-400">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" /> +91 95001 56666
            </a>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 lg:gap-6">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 hover:bg-surface lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>

        <Link href="/" className="flex shrink-0 items-center" aria-label="Laptop Store India home">
          <Image
            src="/brand/logo.png"
            alt="Laptop Store, The Laptop Specialist"
            width={193}
            height={48}
            priority
            className="h-7 w-auto sm:h-8"
          />
        </Link>

        {/* Desktop / tablet inline search — hidden over the hero (which has its own), revealed once scrolled past it */}
        <div
          className={`hidden min-w-0 flex-1 overflow-hidden transition-all duration-300 md:block ${
            pastHero ? "max-w-2xl opacity-100" : "max-w-0 opacity-0"
          }`}
        >
          <SearchBox />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            href="/service"
            className="hidden items-center gap-2 rounded-lg bg-accent-400 px-4 py-2.5 text-sm font-bold text-ink-900 shadow-(--shadow-card) transition-all hover:bg-accent-600 active:scale-[0.98] lg:inline-flex"
          >
            <Wrench className="h-4 w-4" aria-hidden="true" />
            Book a repair
          </Link>

          {/* Mobile search toggle — compact icon next to cart */}
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-expanded={searchOpen}
            aria-label="Search"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-surface md:hidden"
          >
            {searchOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Search className="h-5 w-5" aria-hidden="true" />}
          </button>

          <button
            type="button"
            onClick={openDrawer}
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-surface"
            aria-label={`Open cart, ${count} items`}
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {count > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-ink-900">
                {count}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Mobile search — only when toggled */}
      {searchOpen ? (
        <div className="border-t border-line px-4 py-3 md:hidden">
          <SearchBox />
        </div>
      ) : null}

      {/* Desktop category nav */}
      <nav className="hidden border-t border-line lg:block" aria-label="Categories">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-4">
          {categories
            .filter((c) => c.featured !== false)
            .map((cat) => (
              <div key={cat.slug} className="group relative">
                <Link
                  href={`/category/${cat.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-t-lg px-3.5 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:text-brand-600"
                >
                  {cat.shortName ?? cat.name}
                  {cat.children ? (
                    <ChevronDown
                      className="h-3.5 w-3.5 text-ink-300 transition-transform duration-200 group-hover:rotate-180"
                      aria-hidden="true"
                    />
                  ) : null}
                </Link>
                {cat.children ? (
                  <div className="invisible absolute left-0 top-full z-50 w-72 translate-y-1 rounded-2xl bg-white p-2 opacity-0 shadow-(--shadow-float) ring-1 ring-line transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    {cat.children.map((sub) => (
                      <Link
                        key={sub.slug}
                        href={`/category/${sub.slug}`}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
                      >
                        <CategoryIcon name={sub.icon} className="h-4 w-4 text-brand-500" />
                        <span>
                          <span className="block font-medium">{sub.name}</span>
                          <span className="block text-xs text-ink-300">{sub.description}</span>
                        </span>
                      </Link>
                    ))}
                    <Link
                      href={`/category/${cat.slug}`}
                      className="mt-1 block rounded-xl px-3 py-2.5 text-sm font-semibold text-brand-600 hover:bg-brand-50"
                    >
                      View all {cat.name} →
                    </Link>
                  </div>
                ) : null}
              </div>
            ))}
        </div>
      </nav>

      {/* Mobile menu sheet */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink-900/40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-surface shadow-(--shadow-float)">
            <div className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
              <span className="font-display text-lg font-bold text-ink-900">Browse</span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-white px-3 py-2 pb-28">
              {categories.map((cat) => {
                const open = openCat === cat.slug;
                const hasChildren = !!cat.children?.length;
                const img = categoryImg[cat.slug];
                return (
                  <div key={cat.slug} className="border-b border-line last:border-0">
                    <div className="flex items-center">
                      <Link
                        href={`/category/${cat.slug}`}
                        onClick={() => setMenuOpen(false)}
                        className="flex flex-1 items-center gap-3 py-2.5"
                      >
                        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface ring-1 ring-line">
                          {img ? (
                            <Image src={img} alt="" fill sizes="56px" className="object-contain p-1.5" />
                          ) : (
                            <CategoryIcon name={cat.icon} className="h-6 w-6 text-brand-600" />
                          )}
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-ink-900">{cat.name}</span>
                          {cat.productCount ? (
                            <span className="text-xs text-ink-300">
                              {cat.productCount.toLocaleString("en-IN")}+ items
                            </span>
                          ) : null}
                        </span>
                      </Link>
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={() => setOpenCat(open ? null : cat.slug)}
                          aria-expanded={open}
                          aria-label={`${open ? "Collapse" : "Expand"} ${cat.name}`}
                          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-500 hover:bg-surface"
                        >
                          <ChevronDown
                            className={`h-5 w-5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                            aria-hidden="true"
                          />
                        </button>
                      ) : null}
                    </div>
                    {hasChildren && open ? (
                      <div className="flex flex-wrap gap-1.5 pb-3 pl-12">
                        {cat.children!.map((sub) => (
                          <Link
                            key={sub.slug}
                            href={`/category/${sub.slug}`}
                            onClick={() => setMenuOpen(false)}
                            className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="border-t border-line bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
              <Link
                href="/service"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-lg bg-accent-400 px-5 py-3 font-bold text-ink-900 hover:bg-accent-600"
              >
                <Wrench className="h-4 w-4" aria-hidden="true" /> Book a repair
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
