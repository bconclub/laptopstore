import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, CreditCard, Store, Truck, Star, CheckCircle2 } from "lucide-react";
import { getCategoryTrail, getProduct, getRelatedProducts } from "@/lib/data";
import { products } from "@/data/products";
import { emiPerMonth, formatINR } from "@/lib/format";
import Breadcrumbs from "@/components/Breadcrumbs";
import ConditionBadge from "@/components/ConditionBadge";
import Price from "@/components/Price";
import ProductImage from "@/components/ProductImage";
import SpecTable from "@/components/SpecTable";
import ProductCard from "@/components/ProductCard";
import SectionHeading from "@/components/SectionHeading";
import { AddToCartButton, StickyBuyBar } from "@/components/AddToCart";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  return {
    title: `${product.name}, ${formatINR(product.price)}`,
    description: product.highlights.join(" · "),
  };
}

const assurances = [
  { icon: BadgeCheck, text: "100% genuine, authorised brand store" },
  { icon: Truck, text: "Insured pan-India delivery" },
  { icon: CreditCard, text: "EMI, UPI, cards & COD accepted" },
  { icon: Store, text: "Same-day pickup at 6 city stores" },
];

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [trail, related] = await Promise.all([
    getCategoryTrail(product.category),
    getRelatedProducts(product),
  ]);

  const crumbs = [
    ...trail.map((c) => ({ label: c.name, href: `/category/${c.slug}` })),
    { label: product.name },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4">
      <Breadcrumbs items={crumbs} />

      <div className="mt-4 grid gap-8 lg:grid-cols-2 lg:gap-14">
        {/* Gallery */}
        <div className="lg:sticky lg:top-36 lg:self-start">
          <ProductImage
            product={product}
            className="aspect-4/3 w-full rounded-3xl ring-1 ring-line"
            sizes="(max-width: 1024px) 100vw, 620px"
            priority
          />
        </div>

        {/* Buy panel */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <ConditionBadge condition={product.condition} />
            {product.badge ? (
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-700 ring-1 ring-line">
                {product.badge}
              </span>
            ) : null}
          </div>

          <h1 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight text-ink-900 sm:text-3xl">
            {product.name}
          </h1>

          <div className="mt-2 flex items-center gap-3 text-sm text-ink-500">
            <span className="font-medium text-ink-700">{product.brand}</span>
            {product.rating ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-accent-500 text-accent-600" aria-hidden="true" />
                <span className="font-semibold text-ink-900">{product.rating}</span>({product.reviewCount}{" "}
                reviews)
              </span>
            ) : null}
            {product.stock === "low" ? (
              <span className="font-semibold text-warn">Only a few left</span>
            ) : product.stock === "in" ? (
              <span className="font-semibold text-success">In stock</span>
            ) : (
              <span className="font-semibold text-danger">Out of stock</span>
            )}
          </div>

          <div className="mt-5 rounded-2xl bg-surface p-5 ring-1 ring-line">
            <Price price={product.price} mrp={product.mrp} size="lg" />
            <p className="mt-1 text-xs text-ink-500">
              Inclusive of all taxes · EMI from{" "}
              <span className="font-semibold text-ink-900">{formatINR(emiPerMonth(product.price))}/mo</span>
            </p>
            <div className="mt-5">
              <AddToCartButton product={product} />
            </div>
          </div>

          {/* Highlights */}
          <ul className="mt-6 space-y-2.5">
            {product.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-700">
                <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand-500" aria-hidden="true" />
                {h}
              </li>
            ))}
          </ul>

          {/* Assurance grid */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {assurances.map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-3 text-xs font-medium text-ink-700 ring-1 ring-line"
              >
                <Icon className="h-4.5 w-4.5 shrink-0 text-brand-500" aria-hidden="true" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Specifications */}
      <section className="mt-12 max-w-3xl lg:mt-16">
        <h2 className="mb-4 font-display text-xl font-bold text-ink-900">Specifications</h2>
        <SpecTable specs={product.specs} />
        <p className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800 ring-1 ring-brand-200">
          <strong>Warranty:</strong> {product.warranty}
        </p>
      </section>

      {/* Related */}
      {related.length > 0 ? (
        <section className="mt-12 lg:mt-16">
          <SectionHeading eyebrow="You may also like" title="Similar products" />
          <div className="snap-row no-scrollbar -mx-4 px-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} className="w-64 sm:w-72" />
            ))}
          </div>
        </section>
      ) : null}

      <StickyBuyBar product={product} />
    </div>
  );
}
