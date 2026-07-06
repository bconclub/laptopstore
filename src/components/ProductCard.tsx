import Link from "next/link";
import { Star } from "lucide-react";
import type { Product } from "@/lib/types";
import Price from "@/components/Price";
import ProductImage from "@/components/ProductImage";

export default function ProductCard({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-line transition-all duration-200 hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover) focus-visible:outline-2 focus-visible:outline-brand-500 ${className}`}
    >
      <div className="relative">
        <ProductImage product={product} className="aspect-4/3 w-full" />
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {product.badge ? (
            <span className="rounded-full bg-ink-900/85 px-2.5 py-0.5 text-[11px] font-semibold text-white">
              {product.badge}
            </span>
          ) : null}
          {product.condition === "refurbished" ? (
            <span className="rounded-full bg-accent-500 px-2.5 py-0.5 text-[11px] font-semibold text-ink-900">
              Refurbished
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-300">{product.brand}</p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink-900 group-hover:text-brand-600">
          {product.name}
        </h3>
        <p className="line-clamp-1 text-xs text-ink-500">
          {product.specs
            .slice(0, 3)
            .map((s) => s.value.split("(")[0].trim())
            .join(" · ")}
        </p>
        <div className="mt-auto flex flex-col gap-1 pt-2">
          <Price price={product.price} mrp={product.mrp} size="sm" />
          {product.rating ? (
            <span className="inline-flex items-center gap-1 text-xs text-ink-500">
              <Star className="h-3.5 w-3.5 fill-accent-500 text-accent-600" aria-hidden="true" />
              {product.rating} · {product.reviewCount} reviews
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
