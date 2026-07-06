"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Banner = { img: string; href: string; alt: string };

/**
 * One full-width banner at a time. No autoplay — the user slides it with the
 * arrows or the dots. Hovering an arrow reveals it; clicking advances.
 */
export default function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [i, setI] = useState(0);
  const n = banners.length;
  const go = (d: number) => setI((p) => (p + d + n) % n);

  return (
    <div className="group relative overflow-hidden rounded-2xl ring-1 ring-line sm:rounded-3xl">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${i * 100}%)` }}
      >
        {banners.map((b) => (
          <Link
            key={b.img}
            href={b.href}
            aria-label={b.alt}
            className="relative block aspect-[16/5] w-full shrink-0 sm:aspect-[3/1]"
          >
            <Image
              src={b.img}
              alt={b.alt}
              fill
              priority={b === banners[0]}
              sizes="(max-width: 1280px) 100vw, 1280px"
              quality={90}
              className="object-cover"
            />
          </Link>
        ))}
      </div>

      {n > 1 ? (
        <>
          {/* Prev / next — revealed on hover */}
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous banner"
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink-900 opacity-0 shadow-(--shadow-card) backdrop-blur transition-all hover:bg-white group-hover:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next banner"
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink-900 opacity-0 shadow-(--shadow-card) backdrop-blur transition-all hover:bg-white group-hover:opacity-100"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2">
            {banners.map((b, d) => (
              <button
                key={b.img}
                type="button"
                onClick={() => setI(d)}
                aria-label={`Go to banner ${d + 1}`}
                aria-current={d === i}
                className={`h-2 rounded-full transition-all ${
                  d === i ? "w-6 bg-white" : "w-2 bg-white/60 hover:bg-white/90"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
