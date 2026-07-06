import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, MapPin, Wrench } from "lucide-react";
import { getCategoryTree, getFeaturedNew, getFeaturedRefurbished, getAllProducts } from "@/lib/data";
import { totalBranches } from "@/data/locations";
import HeroSearch from "@/components/HeroSearch";
import SectionHeading from "@/components/SectionHeading";
import ProductCard from "@/components/ProductCard";
import PromoCard from "@/components/PromoCard";
import CategoryIcon from "@/components/CategoryIcon";
import BrandLogo, { brandNames } from "@/components/BrandLogo";
import StoreLocator from "@/components/StoreLocator";
import PromoBanner from "@/components/PromoBanner";
import BannerCarousel from "@/components/BannerCarousel";
import Rail from "@/components/Rail";
import Reveal from "@/components/Reveal";

const brandCategory: Record<string, string> = {
  Dell: "dell-laptops",
  HP: "hp-laptops",
  Lenovo: "lenovo-laptops",
  Asus: "asus-laptops",
  Acer: "acer-laptops",
  Apple: "apple-laptops",
};

/* Real category artwork (transparent PNGs) */
const bentoThumbs: Record<string, string> = {
  "refurbished-laptops": "/categories/refurbished.png",
  "gaming-laptops": "/categories/gaming.png",
  "laptop-spares": "/categories/spares.png",
  computers: "/categories/desktops.png",
};

/* Per-category colour tint for the small bento cards, glow + icon-chip gradient */
const bentoTint: Record<string, { glow: string; chip: string; dark?: boolean }> = {
  "refurbished-laptops": { glow: "rgb(14 131 69 / 0.16)", chip: "from-[#12a05a] to-[#0b6b39]" },
  "gaming-laptops": { glow: "rgb(59 163 220 / 0.20)", chip: "from-vio-500 to-brand-700" },
  "laptop-spares": { glow: "rgb(252 212 0 / 0.24)", chip: "from-accent-400 to-accent-600", dark: true },
  computers: { glow: "rgb(0 129 197 / 0.18)", chip: "from-brand-500 to-brand-700" },
};

const stats = [
  { value: "10L+", label: "happy customers" },
  { value: "2,600+", label: "genuine spare parts" },
  { value: "150+", label: "expert engineers" },
  { value: "6", label: "cities, walk-in stores" },
];

/* Promo banners laid across the page between content sections */
const banners = {
  laptops: { img: "/banners/laptops.png", href: "/category/laptops", alt: "New Laptop Deals — up to ₹15,000 off" },
  refurbished: { img: "/banners/refurbished.png", href: "/category/refurbished-laptops", alt: "Certified Refurbished Sale — up to 60% off" },
  gaming: { img: "/banners/gaming.png", href: "/category/gaming-laptops", alt: "Gaming Laptop Weekend — starting at ₹74,990" },
  spares: { img: "/banners/spares.png", href: "/category/laptop-spares", alt: "Genuine Spares Mega Deals — up to 40% off" },
  printers: { img: "/banners/printers.png", href: "/category/printers", alt: "Printers for Home & Office — starting at ₹4,999" },
  rentals: { img: "/banners/rentals.png", href: "/service", alt: "Laptop Rentals Made Easy — get a rental quote" },
} as const;

export default async function HomePage() {
  const [categories, refurbished, fresh, all] = await Promise.all([
    getCategoryTree(),
    getFeaturedRefurbished(),
    getFeaturedNew(),
    getAllProducts(),
  ]);

  const bento = categories.filter((c) => c.featured !== false && c.slug !== "printers");
  const bySlug = (slug: string) => all.find((p) => p.slug === slug)!;
  const whatsHot: {
    product: NonNullable<ReturnType<typeof bySlug>>;
    title: string;
    startingAt?: boolean;
    imageOverride?: string;
  }[] = [
    {
      product: bySlug("lenovo-legion-5-rtx4060"),
      title: "Gaming Laptops",
      startingAt: true,
      imageOverride: "/hot/gaming.png",
    },
    { product: bySlug("macbook-air-m2-13"), title: "MacBook Air M2", imageOverride: "/hot/macbook.png" },
    { product: bySlug("hp-elitebook-840-g5-refurbished"), title: "Refurbished EliteBooks", imageOverride: "/hot/hp.png" },
    { product: bySlug("dell-inspiron-15-3530"), title: "Dell Inspiron 15", imageOverride: "/hot/dell.png" },
  ];
  const dealsOfTheDay = [
    { product: bySlug("dell-latitude-battery-original"), title: "Genuine Batteries" },
    { product: bySlug("lenovo-thinkpad-screen-14-fhd"), title: "Laptop Screens" },
    { product: bySlug("hp-laptop-keyboard-replacement"), title: "Laptop Keyboards" },
    { product: bySlug("hp-laserjet-1020-plus"), title: "LaserJet Printers" },
  ];

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(700px 420px at 90% 0%, rgb(0 129 197 / 0.10), transparent 70%), radial-gradient(520px 360px at 0% 30%, rgb(252 212 0 / 0.08), transparent 70%)",
          }}
        />
        <HeroSearch />

        {/* Authorised brands strip */}
        <div className="relative border-t border-line bg-white/70">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-400">
              Authorised store for
            </p>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 lg:gap-3">
              {brandNames.map((b) => (
                <Link
                  key={b}
                  href={`/category/${brandCategory[b]}`}
                  aria-label={`${b} laptops`}
                  className="group flex items-center justify-center rounded-xl bg-white px-4 py-5 ring-1 ring-line transition-all duration-200 hover:-translate-y-0.5 hover:ring-brand-200 hover:shadow-(--shadow-card)"
                >
                  <BrandLogo brand={b} colored className="h-11 w-auto transition-transform group-hover:scale-110 sm:h-12 lg:h-14" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── What's Hot ───────────────────────────────────────────── */}
      <Reveal as="section" id="whats-hot" className="mx-auto mt-14 max-w-7xl px-4 lg:mt-20">
        <SectionHeading eyebrow="Trending now" title="What&apos;s hot" href="/category/laptops" />
        <Rail ariaLabel="What's hot">
          {whatsHot.map((h) => (
            <PromoCard
              key={h.product.slug}
              product={h.product}
              title={h.title}
              startingAt={h.startingAt}
              imageOverride={h.imageOverride}
              className="w-72 lg:w-[calc(25%-0.7rem)]"
            />
          ))}
        </Rail>
      </Reveal>

      {/* ── Promo banner (full-width, manual slide) ──────────────── */}
      <Reveal as="section" className="mt-14 lg:mt-20">
        <div className="mx-auto max-w-7xl px-4">
          <BannerCarousel banners={[banners.laptops, banners.refurbished, banners.rentals]} />
        </div>
      </Reveal>

      {/* ── Bento categories ─────────────────────────────────────── */}
      <Reveal as="section" id="categories" className="mx-auto mt-14 max-w-7xl px-4 lg:mt-20">
        <SectionHeading eyebrow="Browse" title="Shop by category" href="/categories" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
          {bento.map((cat, i) => {
            const large = i === 0;
            const thumb = bentoThumbs[cat.slug];
            const tint = bentoTint[cat.slug];
            return (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-(--shadow-card-hover) lg:p-6 ${
                  large
                    ? "col-span-2 row-span-2 bg-gradient-to-br from-brand-600 to-brand-800 text-white ring-white/10"
                    : "min-h-48 bg-white ring-line"
                }`}
              >
                {large ? (
                  <>
                    {/* Full-bleed photo — laptops on the right, brand-blue colour carries the left side */}
                    <div className="pointer-events-none absolute inset-0 transition-transform duration-300 group-hover:scale-[1.03]">
                      <Image
                        src="/categories/laptop-category-hero.webp"
                        alt=""
                        fill
                        priority
                        quality={95}
                        sizes="(max-width: 1024px) 100vw, 700px"
                        className="object-cover object-right mix-blend-multiply"
                      />
                    </div>
                    {/* Colour wash so the photo reads as part of the brand-blue card, not a plain cutout */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-700 via-brand-700/60 to-transparent"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(420px 300px at 90% 100%, rgb(252 212 0 / 0.18), transparent 65%)",
                      }}
                    />
                  </>
                ) : thumb ? (
                  <>
                    {tint ? (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0"
                        style={{ background: `radial-gradient(300px 220px at 92% 100%, ${tint.glow}, transparent 68%)` }}
                      />
                    ) : null}
                    {/* Laptop bleeding off the bottom-right corner */}
                    <div className="pointer-events-none absolute -bottom-2 -right-2 h-24 w-36 opacity-100 transition-transform duration-300 group-hover:scale-[1.08] group-hover:-rotate-1 sm:-bottom-3 sm:h-28 sm:w-44">
                      <Image src={thumb} alt="" fill sizes="200px" className="object-contain object-right-bottom drop-shadow-md" />
                    </div>
                  </>
                ) : null}
                <div className="relative flex items-start justify-between">
                  <span
                    className={`flex items-center justify-center rounded-2xl shadow-(--shadow-card) transition-transform duration-300 group-hover:scale-110 ${
                      large
                        ? "h-14 w-14 bg-white/15 text-white ring-1 ring-white/20"
                        : `h-14 w-14 bg-gradient-to-br ${tint?.chip ?? "from-brand-500 to-brand-700"} ${
                            tint?.dark ? "text-ink-900" : "text-white"
                          }`
                    }`}
                  >
                    <CategoryIcon name={cat.icon} className="h-7 w-7" />
                  </span>
                  <ArrowUpRight
                    className={`h-5 w-5 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                      large ? "text-white/60" : "text-ink-300"
                    }`}
                    aria-hidden="true"
                  />
                </div>
                <div className={`relative ${large ? "mt-20" : "mt-6"}`}>
                  <p className={`font-display font-semibold ${large ? "text-2xl" : "text-[15px]"}`}>
                    {cat.shortName ?? cat.name}
                  </p>
                  <p className={`mt-1 text-xs ${large ? "max-w-56 text-white/70" : "text-ink-300"}`}>
                    {large
                      ? "New machines from every authorised brand: Dell, HP, Lenovo, Asus, Acer & Apple."
                      : `${cat.productCount?.toLocaleString("en-IN")}+ items`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </Reveal>

      {/* ── Refurbished rail ─────────────────────────────────────── */}
      <Reveal as="section" id="refurbished" className="mx-auto mt-14 max-w-7xl px-4 lg:mt-24">
        <SectionHeading
          eyebrow="Certified by our engineers"
          title="Refurbished picks"
          href="/category/refurbished-laptops"
        />
        <Rail ariaLabel="Refurbished picks">
          {refurbished.map((p) => (
            <ProductCard key={p.id} product={p} className="w-64 sm:w-72" />
          ))}
        </Rail>
      </Reveal>

      {/* ── Deals of the day ─────────────────────────────────────── */}
      <Reveal as="section" id="deals" className="mx-auto mt-14 max-w-7xl px-4 lg:mt-24">
        <SectionHeading eyebrow="Spares & more" title="Deals of the day" href="/category/laptop-spares" />
        <Rail ariaLabel="Deals of the day">
          {dealsOfTheDay.map((d) => (
            <PromoCard
              key={d.product.slug}
              product={d.product}
              title={d.title}
              className="w-72 lg:w-[calc(25%-0.7rem)]"
            />
          ))}
        </Rail>
      </Reveal>

      {/* ── Service banner ───────────────────────────────────────── */}
      <Reveal as="section" className="mx-auto mt-14 max-w-7xl px-4 lg:mt-24">
        <div className="bg-mesh relative overflow-hidden rounded-[2rem] px-6 py-12 text-white sm:px-10 lg:px-16 lg:py-16">
          {/* Repair tools artwork */}
          <div className="pointer-events-none absolute -bottom-6 right-2 hidden h-64 w-80 opacity-95 lg:block xl:h-72 xl:w-96">
            <Image src="/categories/repair.png" alt="" fill sizes="420px" className="object-contain" />
          </div>
          <div className="relative flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/80">
                <Wrench className="h-3.5 w-3.5 text-accent-400" aria-hidden="true" /> Repair &amp; service
              </p>
              <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
                Broken screen? Dead battery?
                <br />
                <span className="text-accent-400">Fixed same-day.</span>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/60 sm:text-base">
                Authorised service centre with modern labs in 6 cities, fitting genuine parts from our
                own 2,600+ part inventory.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/service"
                className="inline-flex items-center gap-2 rounded-lg bg-accent-400 px-7 py-3.5 text-sm font-bold text-ink-900 transition-all hover:bg-accent-600 active:scale-[0.98]"
              >
                <Wrench className="h-4 w-4" aria-hidden="true" />
                Book a repair
              </Link>
              <Link
                href="/category/laptop-spares"
                className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Browse spare parts
              </Link>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ── Promo banner (full-width, manual slide) ──────────────── */}
      <Reveal as="section" className="mt-14 lg:mt-24">
        <div className="mx-auto max-w-7xl px-4">
          <BannerCarousel banners={[banners.gaming, banners.spares]} />
        </div>
      </Reveal>

      {/* ── New arrivals rail ────────────────────────────────────── */}
      <Reveal as="section" className="mx-auto mt-14 max-w-7xl px-4 lg:mt-24">
        <SectionHeading eyebrow="Latest stock" title="New arrivals" href="/category/laptops" />
        <Rail ariaLabel="New arrivals">
          {fresh.map((p) => (
            <ProductCard key={p.id} product={p} className="w-64 sm:w-72" />
          ))}
        </Rail>
      </Reveal>

      {/* ── Promo: Printers ──────────────────────────────────────── */}
      <Reveal as="section" className="mx-auto mt-14 max-w-7xl px-4 lg:mt-24">
        <PromoBanner {...banners.printers} />
      </Reveal>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <Reveal as="section" className="mx-auto mt-14 max-w-7xl px-4 lg:mt-24">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[2rem] bg-line ring-1 ring-line lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 bg-white px-6 py-10">
              <p className="font-display text-4xl font-bold text-brand-600 lg:text-5xl">{s.value}</p>
              <p className="text-center text-xs font-medium text-ink-500 sm:text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* ── Across India, store map ─────────────────────────────── */}
      <Reveal as="section" id="stores" className="mx-auto mt-14 max-w-7xl px-4 lg:mt-24">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-600">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Walk-in stores
            </p>
            <h2 className="font-display text-xl font-bold text-ink-900 sm:text-2xl">
              {totalBranches} stores across 6 cities
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Find a laptop store near you. Visit, explore &amp; get expert advice in person.
            </p>
          </div>
          <Link
            href="/stores"
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50"
          >
            View all stores
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-5">
          <StoreLocator />
        </div>
      </Reveal>
    </>
  );
}
