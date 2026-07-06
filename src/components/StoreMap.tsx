"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LMap, Marker } from "leaflet";
import { LocateFixed } from "lucide-react";
import { locations } from "@/data/locations";
import { branchCoords } from "@/data/branch-coords";

/**
 * Interactive OpenStreetMap showing every store as an individual marker at
 * its real geocoded location. Selecting a city flies to that city's stores;
 * `focusBranch` flies to and opens a single store.
 */
export default function StoreMap({
  className = "",
  focusSlug,
  focusBranch,
  onSelectCity,
}: {
  className?: string;
  focusSlug?: string | null;
  focusBranch?: [number, number] | null;
  onSelectCity?: (slug: string) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const meMarkerRef = useRef<Marker | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !holder.current || mapRef.current) return;
      const map = L.map(holder.current, { scrollWheelZoom: false, zoomControl: true });
      mapRef.current = map;
      // Light, low-contrast basemap (CartoDB Positron) — reads closer to Google Maps
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);

      const all = L.latLngBounds([]);
      locations.forEach((c) => {
        const coords = branchCoords[c.slug] || [];
        c.branches.forEach((b, i) => {
          const ll = coords[i];
          if (!ll) return;
          const icon = L.divIcon({ className: "", html: `<div class="ls-dot"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] });
          const m = L.marker(ll, { icon, title: b.name }).addTo(map);
          m.bindPopup(
            `<div style="font-family:'Work Sans',sans-serif;min-width:190px;">
              <div style="font-weight:700;font-size:13px;color:#181c1e;">${b.name}</div>
              <div style="font-size:11px;color:#5c6670;margin:2px 0 6px;">${b.area}, ${c.city}</div>
              <a href="tel:+91${b.phone.replace(/\D/g, "").slice(-10)}" style="color:#006195;font-weight:600;font-size:12px;">${b.phone}</a>
              &nbsp;·&nbsp;
              <a href="https://www.google.com/maps/search/${encodeURIComponent(`Laptop Store ${b.area} ${c.city}`)}" target="_blank" rel="noopener" style="color:#006195;font-weight:600;font-size:12px;">Directions</a>
            </div>`,
            { maxWidth: 260 },
          );
          m.on("click", () => onSelectCity?.(c.slug));
          m.bindTooltip(b.area, { direction: "top", offset: [0, -8], className: "ls-tooltip" });
          markersRef.current[ll.join(",")] = m;
          all.extend(ll);
        });
      });
      if (all.isValid()) map.fitBounds(all, { padding: [40, 40] });
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to a whole city's stores
  useEffect(() => {
    if (!focusSlug) return;
    const map = mapRef.current;
    if (!map) return;
    import("leaflet").then((L) => {
      const coords = (branchCoords[focusSlug] || []).filter(Boolean) as [number, number][];
      if (!coords.length) return;
      map.flyToBounds(L.latLngBounds(coords), { padding: [55, 55], maxZoom: 13, duration: 0.85 });
    });
  }, [focusSlug]);

  // Fly to a single store + open its popup
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusBranch) return;
    map.flyTo(focusBranch, 15, { duration: 0.85 });
    const marker = markersRef.current[focusBranch.join(",")];
    if (marker) {
      const t = setTimeout(() => marker.openPopup(), 900);
      return () => clearTimeout(t);
    }
  }, [focusBranch]);

  const useMyLocation = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const ll: [number, number] = [coords.latitude, coords.longitude];
        const map = mapRef.current!;
        map.flyTo(ll, 12, { duration: 0.85 });
        import("leaflet").then((L) => {
          meMarkerRef.current?.remove();
          const icon = L.divIcon({
            className: "",
            html: `<div class="ls-me-dot"></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });
          meMarkerRef.current = L.marker(ll, { icon, title: "Your location" }).addTo(map);
        });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl ring-1 ring-line ${className}`}>
      <div ref={holder} className="z-0 h-full w-full" role="application" aria-label="Interactive map of Laptop Store locations" />
      <button
        type="button"
        onClick={useMyLocation}
        className="absolute right-3 top-3 z-[500] inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-brand-700 shadow-(--shadow-card) ring-1 ring-line transition-colors hover:bg-brand-50"
      >
        <LocateFixed className={`h-4 w-4 ${locating ? "animate-pulse" : ""}`} aria-hidden="true" />
        {locating ? "Locating…" : "Use my location"}
      </button>
    </div>
  );
}
