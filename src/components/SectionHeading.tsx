import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel = "View all",
  dark = false,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
  /** Light-on-dark treatment for gradient section bands */
  dark?: boolean;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p
            className={`mb-1 text-xs font-semibold uppercase tracking-widest ${
              dark ? "text-accent-400" : "text-brand-600"
            }`}
          >
            {eyebrow}
          </p>
        ) : null}
        <h2 className={`text-xl font-bold sm:text-2xl ${dark ? "text-white" : "text-ink-900"}`}>{title}</h2>
      </div>
      {href ? (
        <Link
          href={href}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold ${
            dark ? "text-white/85 hover:bg-white/10" : "text-brand-600 hover:bg-brand-50"
          }`}
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
