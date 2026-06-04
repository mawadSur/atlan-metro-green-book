'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    if (locations.length >= 2) {
      const bounds = L.latLngBounds(
        locations.map((loc) => [loc.lat, loc.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, locations]);

  useEffect(() => {
    if (selectedId) {
      const loc = locations.find((l) => l.id === selectedId);
      if (loc) {
        map.flyTo([loc.lat, loc.lng], 15);
      }
    }
  }, [map, selectedId, locations]);

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
