import { formatINR, discountPercent } from "@/lib/format";

export default function Price({
  price,
  mrp,
  size = "md",
}: {
  price: number;
  mrp?: number;
  size?: "sm" | "md" | "lg";
}) {
  const off = discountPercent(price, mrp);
  const priceCls =
    size === "lg"
      ? "text-3xl font-bold"
      : size === "md"
        ? "text-lg font-semibold"
        : "text-base font-semibold";
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {/* Bold Electric Blue pricing, per Retail Precision */}
      <span className={`${priceCls} tracking-tight text-brand-600`}>{formatINR(price)}</span>
      {mrp && off ? (
        <>
          <span className="text-sm text-ink-300 line-through">{formatINR(mrp)}</span>
          <span className="text-sm font-semibold text-success">{off}% off</span>
        </>
      ) : null}
    </div>
  );
}
