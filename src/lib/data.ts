import { flattenCategories } from "@/data/categories";
import { getProvider } from "@/lib/provider";
import type { Category, Product, ProductV2 } from "@/lib/types";

/**
 * Data-access layer (facade).
 *
 * Every page reads through these async functions. They now delegate to the
 * active DataProvider (mock today, Supabase later) — page code stays
 * unchanged, exactly as promised in the original seam design.
 *
 * Legacy Product shapes are served via the provider's toLegacy() adapter so
 * existing storefront components keep rendering while surfaces migrate to
 * ProductV2 (adapter retired end of Phase 4).
 */

const p = () => getProvider();

export async function getCategoryTree(): Promise<Category[]> {
  return p().getCategoryTree();
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  return p().getCategory(slug);
}

export async function getCategoryTrail(slug: string): Promise<Category[]> {
  return p().getCategoryTrail(slug);
}

export async function getProductsByCategory(slug: string): Promise<Product[]> {
  const rows = await p().getProducts({ category: slug });
  return rows.map((r) => p().toLegacy(r));
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  const row = await p().getProductBySlug(slug);
  return row ? p().toLegacy(row) : undefined;
}

export async function getProductV2(slug: string): Promise<ProductV2 | undefined> {
  return p().getProductBySlug(slug);
}

export async function getFeaturedRefurbished(): Promise<Product[]> {
  const rows = await p().getProducts({ line: "refurbished", limit: 12 });
  return rows.map((r) => p().toLegacy(r));
}

export async function getFeaturedNew(): Promise<Product[]> {
  const rows = await p().getProducts({ line: "new", limit: 12 });
  return rows.filter((r) => r.price > 20000).map((r) => p().toLegacy(r as ProductV2));
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const sameCat = await p().getProducts({ category: product.category, limit: limit + 4 });
  const sameBrand = await p().getProducts({ brand: product.brand, limit: limit + 4 });
  const merged = [...sameCat, ...sameBrand].filter((r) => r.slug !== product.slug);
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const r of merged) {
    if (seen.has(r.slug)) continue;
    seen.add(r.slug);
    out.push(p().toLegacy(r));
    if (out.length >= limit) break;
  }
  return out;
}

export async function getAllProducts(): Promise<Product[]> {
  const rows = await p().getProducts({ limit: 2000 });
  return rows.map((r) => p().toLegacy(r));
}

export async function searchProducts(query: string): Promise<Product[]> {
  if (!query.trim()) return [];
  const rows = await p().getProducts({ search: query, limit: 50 });
  return rows.map((r) => p().toLegacy(r));
}

/** Category leaf name lookup for product cards. */
export async function getCategoryName(slug: string): Promise<string> {
  const cat = await p().getCategory(slug);
  return cat?.name ?? slug;
}

export { flattenCategories };
