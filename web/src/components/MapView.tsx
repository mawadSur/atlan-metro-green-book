'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Location, Lang } from '@/lib/types';
import { typeStyle, localized, typeLabel } from '@/lib/display';

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
  onMoveEnd,
}: {
  locations: Location[];
  selectedId?: string | null;
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
      map.flyTo([loc.lat, loc.lng], 15, { duration: 0.8 });
    };
    raf = window.requestAnimationFrame(flyWhenReady);
    return () => window.cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selectedId]);

  return null;
}

export default function MapView({
  locations,
  lang,
  selectedId,
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
          onMoveEnd={onMoveEnd}
        />
        {locations.map((loc) => (
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lng]}
            icon={createPinIcon(loc)}
            eventHandlers={{
              click: () => onSelect(loc),
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{localized(loc, 'name', lang)}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {typeLabel(loc.type, lang)}
                </div>
                <div className="text-xs text-gray-500 mt-1">{loc.address}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
