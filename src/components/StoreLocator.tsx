"use client";

import { useRef, useState } from "react";
import { MapPin, Phone, ExternalLink, ChevronDown, Check, Building2, Landmark, Castle, University, Waves } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { locations } from "@/data/locations";
import { branchCoords } from "@/data/branch-coords";
import StoreMap from "@/components/StoreMap";
import BrandLogo from "@/components/BrandLogo";

/** OSM raster tile containing a point — a keyless static map thumbnail. */
function tileUrl(lat: number, lng: number, z: number) {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const r = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

/** A distinct landmark-style icon per city for the selector cards */
const cityIcon: Record<string, LucideIcon> = {
  chennai: Building2,
  bangalore: Landmark,
  mumbai: Castle,
  pune: University,
  hyderabad: Landmark,
  kolkata: Waves,
};

const PREVIEW_COUNT = 2;

export default function StoreLocator({ showStores = true }: { showStores?: boolean }) {
  const [slug, setSlug] = useState(locations[0].slug);
  const [focusBranch, setFocusBranch] = useState<[number, number] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const mapWrap = useRef<HTMLDivElement>(null);
  const city = locations.find((c) => c.slug === slug)!;
  const coords = branchCoords[slug] || [];
  const visibleBranches = expanded ? city.branches : city.branches.slice(0, PREVIEW_COUNT);
  const hiddenCount = city.branches.length - visibleBranches.length;

  const pickCity = (s: string) => {
    setSlug(s);
    setFocusBranch(null);
    setExpanded(false);
  };

  const showOnMap = (coord: [number, number]) => {
    setFocusBranch(coord);
    mapWrap.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div>
      <div ref={mapWrap} className="scroll-mt-28">
        <StoreMap
          className="h-72 sm:h-96 lg:h-[26rem]"
          focusSlug={slug}
          focusBranch={focusBranch}
          onSelectCity={pickCity}
        />
      </div>

      {/* City cards — icon + name + count, checkmark on the active one */}
      <div className="no-scrollbar mt-5 flex gap-3 overflow-x-auto pb-1">
        {locations.map((c) => {
          const active = c.slug === slug;
          const Icon = cityIcon[c.slug] ?? Building2;
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => pickCity(c.slug)}
              aria-pressed={active}
              className={`group relative flex shrink-0 items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left ring-1 transition-all ${
                active ? "ring-2 ring-brand-500 shadow-(--shadow-card)" : "ring-line hover:ring-brand-200"
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="pr-5">
                <span className="block text-sm font-semibold text-ink-900">{c.city}</span>
                <span className="block text-xs text-ink-400">
                  {c.branches.length} {c.branches.length === 1 ? "store" : "stores"}
                </span>
              </span>
              {active ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-white">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {showStores ? (
        <div className="mt-6">
          <div className="mb-4 flex items-baseline gap-2">
            <h3 className="font-display text-xl font-bold text-ink-900">{city.city}</h3>
            <span className="text-sm text-ink-300">
              {city.branches.length} {city.branches.length === 1 ? "store" : "stores"}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleBranches.map((b, i) => {
              const coord = coords[i];
              return (
                <div
                  key={b.name + b.address.slice(0, 16)}
                  className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-line transition-all duration-300 hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover)"
                >
                  {/* Map thumbnail — click focuses the map above */}
                  {coord ? (
                    <button
                      type="button"
                      onClick={() => showOnMap(coord)}
                      aria-label={`Show ${b.name} on the map`}
                      className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-xl ring-1 ring-line"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={tileUrl(coord[0], coord[1], 14)}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <span className="absolute inset-0 bg-brand-950/5" />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white shadow ring-2 ring-white">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      </span>
                    </button>
                  ) : null}

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="truncate font-display text-sm font-semibold leading-snug text-ink-900">
                          {b.name}
                        </h4>
                        <p className="text-xs font-medium text-brand-600">{b.area}</p>
                      </div>
                      {b.brand ? (
                        <span className="shrink-0" title={`${b.brand} exclusive store`}>
                          <BrandLogo brand={b.brand} colored className="h-5 w-5" />
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-500">{b.address}</p>
                    <div className="mt-auto flex items-center gap-2 pt-2">
                      <a
                        href={`tel:+91${b.phone.replace(/\D/g, "").slice(-10)}`}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-600 px-2 py-2 text-[11px] font-bold text-white transition-colors hover:bg-brand-700"
                      >
                        <Phone className="h-3 w-3" aria-hidden="true" /> Call
                      </a>
                      {coord ? (
                        <button
                          type="button"
                          onClick={() => showOnMap(coord)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-white px-2.5 py-2 text-[11px] font-bold text-brand-700 ring-1 ring-brand-200 transition-colors hover:bg-brand-50"
                        >
                          <MapPin className="h-3 w-3" aria-hidden="true" /> Map
                        </button>
                      ) : null}
                      <a
                        href={`https://www.google.com/maps/search/${encodeURIComponent(`Laptop Store ${b.area} ${city.city}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Directions to ${b.name}`}
                        className="inline-flex items-center justify-center rounded-lg bg-white px-2 py-2 text-ink-400 ring-1 ring-line transition-colors hover:text-brand-600"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {hiddenCount > 0 ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-700 ring-1 ring-line transition-colors hover:bg-brand-50"
              >
                See {hiddenCount} more {hiddenCount === 1 ? "store" : "stores"}
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : expanded && city.branches.length > PREVIEW_COUNT ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-500 ring-1 ring-line transition-colors hover:bg-surface"
              >
                Show less
                <ChevronDown className="h-4 w-4 rotate-180" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
