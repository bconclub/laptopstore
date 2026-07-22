"use client";

/**
 * Admin network map — every node as a colored marker (outlet blue, distributor
 * yellow, warehouse dark). Click a marker to open that node's drawer.
 */

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { CircleMarker, Map as LMap } from "leaflet";
import type { StoreNode } from "@/lib/types";

const COLOR: Record<string, string> = {
  outlet: "#0081C5",
  distributor: "#E9C400",
  warehouse: "#003A5C",
};

export function NetworkMap({ nodes, selectedId, onSelect }: {
  nodes: StoreNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const markersRef = useRef<Record<string, CircleMarker>>({});
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    if (!nodes.length) return;
    import("leaflet").then((L) => {
      if (cancelled || !holder.current || mapRef.current) return;
      const map = L.map(holder.current, { scrollWheelZoom: false, attributionControl: false });
      mapRef.current = map;
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      const bounds = L.latLngBounds([]);
      for (const n of nodes) {
        if (!n.lat || !n.lng) continue;
        const m = L.circleMarker([n.lat, n.lng], {
          radius: n.type === "warehouse" ? 10 : 7,
          color: "#fff",
          weight: 2,
          fillColor: COLOR[n.type] ?? "#0081C5",
          fillOpacity: 0.95,
        })
          .addTo(map)
          .bindTooltip(`${n.name} · ${n.city}`, { direction: "top", offset: [0, -8] })
          .on("click", () => onSelectRef.current(n.id));
        markersRef.current[n.id] = m;
        bounds.extend([n.lat, n.lng]);
      }
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30] });
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length]);

  // Highlight selection
  useEffect(() => {
    for (const [id, m] of Object.entries(markersRef.current)) {
      const n = nodes.find((x) => x.id === id);
      m.setStyle({
        weight: id === selectedId ? 4 : 2,
        color: id === selectedId ? "#FCD400" : "#fff",
        fillColor: COLOR[n?.type ?? "outlet"] ?? "#0081C5",
      });
      if (id === selectedId && n) mapRef.current?.panTo([n.lat, n.lng]);
    }
  }, [selectedId, nodes]);

  return (
    <div className="relative overflow-hidden rounded-2xl ring-1 ring-line">
      <div ref={holder} className="h-80 w-full" />
      <div className="absolute bottom-2 left-2 z-[500] flex gap-3 rounded-lg bg-white/90 px-3 py-1.5 text-[11px] font-medium text-ink-600 shadow-(--shadow-card)">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR.outlet }} /> Outlet</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR.distributor }} /> Distributor</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR.warehouse }} /> Warehouse</span>
      </div>
    </div>
  );
}
