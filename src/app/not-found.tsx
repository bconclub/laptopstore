import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-24 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-ink-300 ring-1 ring-line">
        <SearchX className="h-8 w-8" aria-hidden="true" />
      </span>
      <h1 className="mt-6 font-display text-3xl font-bold text-ink-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-500">
        The page you&apos;re looking for doesn&apos;t exist or has moved. Try browsing our categories instead.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white hover:bg-brand-600"
        >
          Go home
        </Link>
        <Link
          href="/categories"
          className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink-900 ring-1 ring-line hover:bg-surface"
        >
          Browse categories
        </Link>
      </div>
    </div>
  );
}
