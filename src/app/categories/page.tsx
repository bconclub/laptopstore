import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { getCategoryTree } from "@/lib/data";
import CategoryIcon from "@/components/CategoryIcon";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "All categories",
  description:
    "Browse the full Laptop Store India catalog: laptops, refurbished, spares, computers, printers and accessories.",
};

/* Category artwork (transparent PNGs) */
const heroImg: Record<string, string> = {
  laptops: "/categories/laptops.png",
  "refurbished-laptops": "/categories/refurbished.png",
  "gaming-laptops": "/categories/gaming.png",
  "laptop-spares": "/categories/spares.png",
  computers: "/categories/desktops.png",
  printers: "/categories/printers.png",
  accessories: "/categories/accessories.png",
};

export default async function CategoriesPage() {
  const categories = await getCategoryTree();

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4">
      <Breadcrumbs items={[{ label: "All categories" }]} />
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
        All categories
      </h1>
      <p className="mt-1 text-sm text-ink-500">Everything we sell and service, in one place.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <div
            key={cat.slug}
            className="group flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-line transition-all duration-300 hover:-translate-y-1 hover:ring-brand-200 hover:shadow-(--shadow-card-hover)"
          >
            {/* Image header */}
            <Link
              href={`/category/${cat.slug}`}
              className="relative block h-56 overflow-hidden bg-gradient-to-br from-brand-50 to-surface sm:h-60"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(320px 200px at 80% 90%, rgb(0 129 197 / 0.14), transparent 70%)",
                }}
              />
              {heroImg[cat.slug] ? (
                <Image
                  src={heroImg[cat.slug]}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 400px"
                  className="object-contain p-3 transition-transform duration-500 group-hover:scale-105"
                />
              ) : null}
              <span className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-(--shadow-card) ring-1 ring-line">
                <CategoryIcon name={cat.icon} className="h-5.5 w-5.5" />
              </span>
              <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink-500 shadow-(--shadow-card) transition-all group-hover:bg-brand-600 group-hover:text-white">
                <ArrowUpRight className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
            </Link>

            {/* Content */}
            <div className="flex flex-1 flex-col p-4">
              <Link href={`/category/${cat.slug}`} className="group/title">
                <h2 className="font-display text-lg font-bold text-ink-900 group-hover/title:text-brand-600">
                  {cat.name}
                </h2>
              </Link>
              {cat.productCount ? (
                <p className="mt-0.5 text-xs font-medium text-brand-600">
                  {cat.productCount.toLocaleString("en-IN")}+ items
                </p>
              ) : null}
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-500">{cat.description}</p>

              {cat.children?.length ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {cat.children.slice(0, 6).map((sub) => (
                    <Link
                      key={sub.slug}
                      href={`/category/${sub.slug}`}
                      className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
