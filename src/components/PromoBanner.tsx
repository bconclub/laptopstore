import Link from "next/link";
import Image from "next/image";

/** Full-width clickable promo banner strip (3:1 designs with baked-in copy/CTA). */
export default function PromoBanner({
  img,
  href,
  alt,
}: {
  img: string;
  href: string;
  alt: string;
}) {
  return (
    <Link
      href={href}
      aria-label={alt}
      className="group relative block aspect-[3/1] w-full overflow-hidden rounded-2xl ring-1 ring-line transition-all duration-300 hover:shadow-(--shadow-card-hover) sm:rounded-3xl"
    >
      <Image
        src={img}
        alt={alt}
        fill
        sizes="(max-width: 1280px) 100vw, 1280px"
        className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
      />
    </Link>
  );
}
