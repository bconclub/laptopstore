import type { Spec } from "@/lib/types";

export default function SpecTable({ specs }: { specs: Spec[] }) {
  return (
    <dl className="overflow-hidden rounded-2xl ring-1 ring-line">
      {specs.map((s, i) => (
        <div
          key={s.label}
          className={`grid grid-cols-[38%_1fr] gap-4 px-5 py-3.5 text-sm ${
            i % 2 === 0 ? "bg-surface" : "bg-white"
          }`}
        >
          <dt className="font-medium text-ink-500">{s.label}</dt>
          <dd className="text-ink-900">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}
