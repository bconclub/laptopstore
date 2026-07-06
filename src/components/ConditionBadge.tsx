import type { Condition } from "@/lib/types";

export default function ConditionBadge({ condition }: { condition: Condition }) {
  if (condition === "refurbished") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/20 px-2.5 py-0.5 text-xs font-semibold text-ink-900 ring-1 ring-accent-600/30">
        Certified Refurbished
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">
      Brand New
    </span>
  );
}
