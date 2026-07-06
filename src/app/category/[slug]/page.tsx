import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategory, getCategoryTrail, getProductsByCategory } from "@/lib/data";
import { flattenCategories } from "@/data/categories";
import Breadcrumbs from "@/components/Breadcrumbs";
import CategoryBrowser from "@/components/CategoryBrowser";
import CategoryIcon from "@/components/CategoryIcon";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return flattenCategories().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return {};
  return {
    title: category.name,
    description: category.description,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  const [trail, products] = await Promise.all([getCategoryTrail(slug), getProductsByCategory(slug)]);
  const crumbs = trail.map((c, i) => ({
    label: c.name,
    href: i < trail.length - 1 ? `/category/${c.slug}` : undefined,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4">
      <Breadcrumbs items={crumbs} />

      <header className="mt-3 flex items-start gap-4">
        <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 sm:flex">
          <CategoryIcon name={category.icon} className="h-7 w-7" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            {category.name}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-500">{category.description}</p>
        </div>
      </header>

      {/* Sub-category tiles */}
      {category.children?.length ? (
        <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1">
          {category.children.map((sub) => (
            <Link
              key={sub.slug}
              href={`/category/${sub.slug}`}
              className="flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-ink-700 ring-1 ring-line transition-colors hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-200"
            >
              <CategoryIcon name={sub.icon} className="h-4 w-4 text-brand-500" />
              {sub.name}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-8">
        <CategoryBrowser products={products} />
      </div>

      {/* Full-catalog note, the live store carries far more than the seed data */}
      {category.productCount && category.productCount > products.length ? (
        <p className="mt-8 rounded-2xl bg-brand-50 px-5 py-4 text-sm text-brand-800 ring-1 ring-brand-200">
          Showing a curated sample. Our full {category.name.toLowerCase()} range has{" "}
          <strong>{category.productCount.toLocaleString("en-IN")}+ items</strong>, the complete catalog
          arrives with the Supabase backend, or call{" "}
          <a href="tel:+919500156666" className="font-semibold underline underline-offset-2">
            +91 95001 56666
          </a>{" "}
          for instant availability.
        </p>
      ) : null}
    </div>
  );
}
