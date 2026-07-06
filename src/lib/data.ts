import { categories, findCategory, flattenCategories, categoryTrail } from "@/data/categories";
import { products, findProduct } from "@/data/products";
import type { Category, Product } from "@/lib/types";

/**
 * Data-access layer.
 *
 * Every page reads through these async functions. Today they serve the
 * static seed catalog; when Supabase is provisioned, swap the bodies for
 * queries (see supabase/schema.sql), no page code changes needed.
 */

export async function getCategoryTree(): Promise<Category[]> {
  return categories;
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  return findCategory(slug);
}

export async function getCategoryTrail(slug: string): Promise<Category[]> {
  return categoryTrail(slug);
}

/** All leaf + parent slugs under a category, for product matching. */
function slugsUnder(slug: string): string[] {
  const cat = findCategory(slug);
  if (!cat) return [slug];
  const collect = (c: Category): string[] => [c.slug, ...(c.children?.flatMap(collect) ?? [])];
  return collect(cat);
}

export async function getProductsByCategory(slug: string): Promise<Product[]> {
  const under = new Set(slugsUnder(slug));
  return products.filter((p) => under.has(p.category));
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  return findProduct(slug);
}

export async function getFeaturedRefurbished(): Promise<Product[]> {
  return products.filter((p) => p.condition === "refurbished");
}

export async function getFeaturedNew(): Promise<Product[]> {
  return products.filter((p) => p.condition === "new" && !p.category.includes("laptop-") && p.price > 20000);
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const sameCat = products.filter((p) => p.slug !== product.slug && p.category === product.category);
  const sameBrand = products.filter(
    (p) => p.slug !== product.slug && p.brand === product.brand && p.category !== product.category,
  );
  return [...sameCat, ...sameBrand].slice(0, limit);
}

export async function getAllProducts(): Promise<Product[]> {
  return products;
}

export async function searchProducts(query: string): Promise<Product[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);
  return products.filter((p) => {
    const hay = `${p.name} ${p.brand} ${p.condition} ${p.specs.map((s) => s.value).join(" ")}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

/** Category leaf name lookup for product cards. */
export async function getCategoryName(slug: string): Promise<string> {
  return findCategory(slug)?.name ?? slug;
}

export { flattenCategories };
