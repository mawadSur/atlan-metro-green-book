'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Location, Lang } from '@/lib/types';
import { typeStyle } from '@/lib/display';

export interface MapBounds {
  south: number;
  north: number;
  west: number;
  east: number;
}

interface MapViewProps {
  locations: Location[];
  lang: Lang;
  selectedId?: string | null;
  /** Bumps on every select (even re-selecting the same place) so the map re-flies. */
  flyNonce?: number;
  onSelect: (loc: Location) => void;
  onMoveEnd?: (bounds: MapBounds) => void;
  center: [number, number];
  zoom: number;
}

function createPinIcon(loc: Location): L.DivIcon {
  const style = typeStyle(loc.type);
  const html = `
    <div class="gb-pin" style="background:linear-gradient(135deg, ${style.from}, ${style.to})">
      <span>${style.icon}</span>
    </div>
  `;
  return L.divIcon({
    html,
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

function MapController({
  locations,
  selectedId,
  flyNonce,
  onMoveEnd,
}: {
  locations: Location[];
  selectedId?: string | null;
  flyNonce?: number;
  onMoveEnd?: (bounds: MapBounds) => void;
}) {
  const map = useMap();
  const didInitialFit = useRef(false);

  // Track viewport changes for incremental loading
  useMapEvents({
    moveend: () => {
      if (onMoveEnd) {
        const bounds = map.getBounds();
        onMoveEnd({
          south: bounds.getSouth(),
          north: bounds.getNorth(),
          west: bounds.getWest(),
          east: bounds.getEast(),
        });
      }
    },
  });

  // Auto-fit to all markers ONCE on first load. After that, do NOT keep
  // re-fitting on every `locations` change (viewport fetches return a new
  // array reference) — re-fitting was stomping the click-to-fly-to below,
  // snapping the map back to fit-all instead of flying to the clicked place.
  useEffect(() => {
    if (!didInitialFit.current && locations.length >= 2) {
      const bounds = L.latLngBounds(
        locations.map((loc) => [loc.lat, loc.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
      didInitialFit.current = true;
    }
  }, [map, locations]);

  // Fly to the selected location whenever the selection changes. Depends only
  // on selectedId (not `locations`) so a background data refresh can't cancel it.
  //
  // IMPORTANT: when the map container is hidden (mobile list view) or was just
  // revealed, Leaflet has a stale/zero size and flyTo silently no-ops. So we
  // first invalidateSize(), then fly on the next frame. We also guard against a
  // zero-size container by retrying briefly until the map has real dimensions.
  useEffect(() => {
    if (!selectedId) return;
    const loc = locations.find((l) => l.id === selectedId);
    if (!loc) return;

    let tries = 0;
    let raf = 0;
    const flyWhenReady = () => {
      const size = map.getSize();
      if (size.x === 0 || size.y === 0) {
        // container not laid out yet (e.g. just switched from list view) — wait
        if (tries++ < 20) {
          raf = window.requestAnimationFrame(flyWhenReady);
        }
        return;
      }
      map.invalidateSize();

      // On desktop (sm+, ≥640px) the LocationDetail side panel is docked over the
      // right ~400px of the map. Centering the pin in the FULL container would put
      // it behind that panel (esp. on 1024–1280px screens) — looking like the wrong
      // spot again. Shift the fly target so the pin lands in the visible left area:
      // move the map center RIGHT by half the panel width, computed at the target
      // zoom so it's correct after the zoom animation.
      const TARGET_ZOOM = 15;
      const PANEL_W = 400;
      const target = L.latLng(loc.lat, loc.lng);
      if (window.innerWidth >= 640) {
        const pt = map.project(target, TARGET_ZOOM);
        const shifted = pt.add([PANEL_W / 2, 0]); // center sits right of pin → pin appears left of panel
        map.flyTo(map.unproject(shifted, TARGET_ZOOM), TARGET_ZOOM, { duration: 0.8 });
      } else {
        map.flyTo(target, TARGET_ZOOM, { duration: 0.8 });
      }
    };
    raf = window.requestAnimationFrame(flyWhenReady);
    return () => window.cancelAnimationFrame(raf);
    // flyNonce in deps so re-selecting the SAME place (selectedId unchanged) still re-flies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selectedId, flyNonce]);

  return null;
}

export default function MapView({
  locations,
  selectedId,
  flyNonce,
  onSelect,
  onMoveEnd,
  center,
  zoom,
}: MapViewProps) {
  return (
    <div dir="ltr" className="h-full w-full">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <MapController
          locations={locations}
          selectedId={selectedId}
          flyNonce={flyNonce}
          onMoveEnd={onMoveEnd}
        />
        {locations.map((loc) => (
          // No <Popup>: clicking a pin opens the LocationDetail panel (which shows
          // name/type/address already), and Leaflet popup autoPan would fight the
          // flyTo below, landing the pin off-center. One source of detail, one camera move.
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lng]}
            icon={createPinIcon(loc)}
            eventHandlers={{
              click: () => onSelect(loc),
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
