"use client";

/**
 * Network performance map — cities sized/coloured by order activity, so HQ
 * sees at a glance which locations are buzzing. Order volume per city →
 * activity bucket → coloured marker (+ a glow on the hottest ones).
 */

import { useEffect, useMemo, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LMap } from "leaflet";
import type { Order, StoreNode } from "@/lib/types";

// Green = top-notch (busiest), stepping down through lime and amber to a pale
// yellow for the quietest. No red — a quiet store isn't a "bad" store.
const LEVELS = [
  { key: "veryhigh", label: "Very High", color: "#0E8345" },
  { key: "high", label: "High", color: "#6DB33F" },
  { key: "medium", label: "Medium", color: "#E0A400" },
  { key: "low", label: "Low", color: "#EBCB4A" },
] as const;

export function NetworkActivityMap({ nodes, orders }: { nodes: StoreNode[]; orders: Order[] }) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);

  // Aggregate order activity per city (centroid = mean of that city's node coords).
  const cities = useMemo(() => {
    const nodeCity = new Map(nodes.map((n) => [n.id, n.city]));
    const agg = new Map<string, { count: number; revenue: number; lat: number; lng: number; n: number }>();
    for (const n of nodes) {
      if (!n.lat || !n.lng) continue;
      const e = agg.get(n.city) ?? { count: 0, revenue: 0, lat: 0, lng: 0, n: 0 };
      e.lat += n.lat; e.lng += n.lng; e.n += 1;
      agg.set(n.city, e);
    }
    for (const o of orders) {
      const nodeId = o.fulfilments[0]?.nodeId;
      const city = nodeId ? nodeCity.get(nodeId) : undefined;
      if (!city) continue;
      const e = agg.get(city);
      if (e) { e.count += 1; e.revenue += o.totals.grand; }
    }
    const list = [...agg.entries()].map(([city, e]) => ({ city, count: e.count, revenue: e.revenue, lat: e.lat / e.n, lng: e.lng / e.n }));
    const max = Math.max(1, ...list.map((c) => c.count));
    return list.map((c) => {
      const r = c.count / max;
      const level = r > 0.66 ? LEVELS[0] : r > 0.4 ? LEVELS[1] : r > 0.18 ? LEVELS[2] : LEVELS[3];
      return { ...c, level, hot: r > 0.66 };
    });
  }, [nodes, orders]);

  useEffect(() => {
    let cancelled = false;
    if (!cities.length) return;
    import("leaflet").then((L) => {
      if (cancelled || !holder.current || mapRef.current) return;
      const map = L.map(holder.current, { scrollWheelZoom: false, zoomControl: true, attributionControl: false, dragging: true });
      mapRef.current = map;
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { maxZoom: 19, subdomains: "abcd" }).addTo(map);
      const bounds = L.latLngBounds([]);
      for (const c of cities) {
        if (c.hot) {
          L.circleMarker([c.lat, c.lng], { radius: 22, color: "transparent", fillColor: c.level.color, fillOpacity: 0.16 }).addTo(map);
          L.circleMarker([c.lat, c.lng], { radius: 14, color: "transparent", fillColor: c.level.color, fillOpacity: 0.24 }).addTo(map);
        }
        L.circleMarker([c.lat, c.lng], {
          radius: 8, color: "#fff", weight: 2, fillColor: c.level.color, fillOpacity: 1,
        })
          .addTo(map)
          // City name on hover only — the colour + glow is the highlight, no number clutter.
          .bindTooltip(c.city, { direction: "top", offset: [0, -8] });
        bounds.extend([c.lat, c.lng]);
      }
      // Frame all active cities; cap zoom so a single hot city can't jump to
      // street level.
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 5 });
      setTimeout(() => map.invalidateSize(), 60);
    });
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, [cities]);

  return (
    <div className="relative h-[300px] overflow-hidden rounded-xl ring-1 ring-line">
      <div ref={holder} className="h-full w-full" />
      <div className="absolute bottom-2 right-2 z-[500] rounded-lg bg-white/95 px-3 py-2 shadow-(--shadow-card)">
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
