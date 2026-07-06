import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="overflow-x-auto no-scrollbar">
      <ol className="flex items-center gap-1 whitespace-nowrap py-1 text-xs text-ink-500">
        <li>
          <Link href="/" className="rounded px-1 py-0.5 hover:text-brand-600">
            Home
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-ink-300" aria-hidden="true" />
            {item.href ? (
              <Link href={item.href} className="rounded px-1 py-0.5 hover:text-brand-600">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="px-1 py-0.5 font-medium text-ink-900">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
