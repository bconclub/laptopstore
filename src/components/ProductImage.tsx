import Image from "next/image";
import { Laptop, Monitor, Printer, Battery, Keyboard, Cpu } from "lucide-react";
import type { Product } from "@/lib/types";

/** Brand-tinted gradient tiles until real product photography is wired in. */
const brandTint: Record<string, string> = {
  Dell: "from-sky-100 via-white to-brand-50",
  HP: "from-indigo-100 via-white to-brand-50",
  Lenovo: "from-rose-100 via-white to-brand-50",
  Asus: "from-slate-200 via-white to-brand-50",
  Acer: "from-emerald-100 via-white to-brand-50",
  Apple: "from-neutral-200 via-white to-brand-50",
};

function iconFor(product: Product) {
  const c = product.category;
  if (c.includes("battery")) return Battery;
  if (c.includes("keyboard")) return Keyboard;
  if (c.includes("screen") || c.includes("monitor") || c.includes("all-in-one")) return Monitor;
  if (c === "printers") return Printer;
  if (c.includes("motherboard")) return Cpu;
  return Laptop;
}

export default function ProductImage({
  product,
  className = "",
  sizes = "(max-width: 768px) 60vw, 300px",
  priority = false,
}: {
  product: Product;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (product.images.length > 0) {
    return (
      <div className={`relative overflow-hidden bg-white ${className}`}>
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          sizes={sizes}
          priority={priority}
          className="object-contain p-3"
        />
      </div>
    );
  }
  const Icon = iconFor(product);
  const tint = brandTint[product.brand] ?? "from-brand-50 via-white to-surface";
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${tint} ${className}`}
      role="img"
      aria-label={product.name}
    >
      <Icon className="h-1/3 w-1/3 text-brand-300" strokeWidth={1.25} aria-hidden="true" />
      <span className="absolute bottom-2 right-3 font-display text-[10px] font-semibold uppercase tracking-widest text-ink-300">
        {product.brand}
      </span>
    </div>
  );
}
