import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { formatINR } from "@/lib/format";
import BrandLogo from "@/components/BrandLogo";

/**
 * Clean white promo tile with a brand-color border. The image sits
 * directly on the card (product shots have white backgrounds), no
 * inner box. Gradient treatments belong to the section, not the card.
 */
export default function PromoCard({
  product,
  title,
  startingAt = false,
  className = "",
  imageOverride,
}: {
  product: Product;
  /** Display title; defaults to a shortened product name */
  title?: string;
  /** "Starting at ₹X" instead of MRP-strike pricing */
  startingAt?: boolean;
  className?: string;
  /** Category-level artwork instead of the product's own photo */
  imageOverride?: string;
}) {
  const img = imageOverride ?? product.images[0];
  return (
    <Link
      href={`/product/${product.slug}`}
      className={`group flex flex-col rounded-2xl border-2 border-brand-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-400 hover:shadow-(--shadow-card-hover) ${className}`}
    >
      <div className="flex h-8 items-center justify-center text-ink-900">
        <BrandLogo brand={product.brand} colored className="h-6 w-auto" />
      </div>
      <p className="mt-2 line-clamp-1 text-center font-display text-lg font-semibold leading-snug text-ink-900">
        {title ?? product.name}
      </p>

      <div className="relative my-4 h-44 w-full">
        {img ? (
          <Image
            src={img}
            alt=""
            fill
            sizes="280px"
            className="object-contain transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : null}
      </div>

      <div className="w-full border-t border-line" />
      <p className="mt-4 text-center">
        {startingAt ? (
          <>
            <span className="text-sm text-ink-500">Starting at </span>
            <span className="font-display text-2xl font-bold text-brand-600">{formatINR(product.price)}</span>
          </>
        ) : (
          <>
            {product.mrp ? (
              <span className="mr-2 text-sm text-ink-300 line-through">{formatINR(product.mrp)}</span>
            ) : null}
            <span className="font-display text-2xl font-bold text-brand-600">{formatINR(product.price)}</span>
          </>
        )}
      </p>
    </Link>
  );
}
