"use client";

/**
 * Network performance map — every store plotted at its real location, sized/
 * coloured by order activity so HQ sees which outlets are buzzing. Click a
 * store to drill into it (opens that node on the Network page).
 */

import { useEffect, useMemo, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { CircleMarker, Map as LMap } from "leaflet";
import type { Order, StoreNode } from "@/lib/types";

const LEVELS = [
  { key: "veryhigh", label: "Very High", color: "#0E8345" },
  { key: "high", label: "High", color: "#6DB33F" },
  { key: "medium", label: "Medium", color: "#E0A400" },
  { key: "low", label: "Low", color: "#EBCB4A" },
] as const;

export function NetworkActivityMap({ nodes, orders, onSelect }: {
  nodes: StoreNode[];
  orders: Order[];
  onSelect?: (nodeId: string) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const markersRef = useRef<CircleMarker[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Per-store order volume → activity bucket.
  const stores = useMemo(() => {
    const count = new Map<string, number>();
    for (const o of orders) {
      const id = o.fulfilments[0]?.nodeId;
      if (id) count.set(id, (count.get(id) ?? 0) + 1);
    }
    const withCoords = nodes.filter((n) => n.lat && n.lng);
    const max = Math.max(1, ...withCoords.map((n) => count.get(n.id) ?? 0));
    return withCoords.map((n) => {
      const c = count.get(n.id) ?? 0;
      const r = c / max;
      const level = r > 0.66 ? LEVELS[0] : r > 0.4 ? LEVELS[1] : r > 0.18 ? LEVELS[2] : LEVELS[3];
      return { node: n, count: c, level, hot: r > 0.66 };
    });
  }, [nodes, orders]);

  useEffect(() => {
    let cancelled = false;
    if (!stores.length) return;
    import("leaflet").then((L) => {
      if (cancelled || !holder.current || mapRef.current) return;
      const map = L.map(holder.current, { scrollWheelZoom: false, zoomControl: true, attributionControl: false });
      mapRef.current = map;
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { maxZoom: 19, subdomains: "abcd" }).addTo(map);
      const bounds = L.latLngBounds([]);
      for (const s of stores) {
        const { node: n } = s;
        if (s.hot) {
          L.circleMarker([n.lat, n.lng], { radius: 16, color: "transparent", fillColor: s.level.color, fillOpacity: 0.16 }).addTo(map);
        }
        const m = L.circleMarker([n.lat, n.lng], { radius: 6, color: "#fff", weight: 1.5, fillColor: s.level.color, fillOpacity: 1 })
          .addTo(map)
          .bindTooltip(`${n.name} · ${s.count} orders`, { direction: "top", offset: [0, -6] })
          .on("click", () => onSelectRef.current?.(n.id));
        markersRef.current.push(m);
        bounds.extend([n.lat, n.lng]);
      }
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 6 });
      setTimeout(() => map.invalidateSize(), 60);
    });
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; markersRef.current = []; };
  }, [stores]);

  return (
    <div className="relative h-full w-full">
      <div ref={holder} className="h-full w-full" />
      <div className="pointer-events-none absolute bottom-2 right-2 z-[500] rounded-lg bg-white/95 px-3 py-2 shadow-(--shadow-card)">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-ink-400">Activity level</p>
        <div className="space-y-0.5">
          {LEVELS.map((l) => (
            <p key={l.key} className="flex items-center gap-1.5 text-[11px] text-ink-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} /> {l.label}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
