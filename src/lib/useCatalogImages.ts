"use client";

/**
 * Shared product-image resolver. Fetches the catalog once (cached on the
 * window), returns a lookup productId → primary image so every surface —
 * orders, drawers, dashboard — can render a thumbnail. Image-first.
 */

import { useEffect, useState } from "react";

type ImgMap = Record<string, string | undefined>;

let cache: ImgMap | null = null;
let inflight: Promise<ImgMap> | null = null;

async function fetchImages(): Promise<ImgMap> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = fetch("/api/admin/products?limit=1000")
    .then((r) => r.json())
    .then((body) => {
      const map: ImgMap = {};
      for (const p of body?.data ?? []) map[p.id] = p.images?.[0];
      cache = map;
      return map;
    })
    .catch(() => ({}));
  return inflight;
}

export function useCatalogImages(): (productId?: string) => string | undefined {
  const [map, setMap] = useState<ImgMap>(cache ?? {});
  useEffect(() => {
    if (cache) { setMap(cache); return; }
    let alive = true;
    void fetchImages().then((m) => alive && setMap(m));
    return () => { alive = false; };
  }, []);
  return (id?: string) => (id ? map[id] : undefined);
}
