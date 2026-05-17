"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Bundler'da bozulan Leaflet varsayılan ikon yollarını CDN ile sabitle.
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function ClickHandler({
  onPick,
}: {
  onPick: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(
        Number(e.latlng.lat.toFixed(5)),
        Number(e.latlng.lng.toFixed(5)),
      );
    },
  });
  return null;
}

function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lon], Math.max(map.getZoom(), 11), {
      duration: 0.6,
    });
  }, [lat, lon, map]);
  return null;
}

export default function LeafletMap({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lon: number) => void;
}) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={11}
      scrollWheelZoom
      style={{ height: 320, width: "100%", borderRadius: 12 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker
        position={[latitude, longitude]}
        icon={markerIcon}
        draggable
        eventHandlers={{
          dragend(e) {
            const m = e.target as L.Marker;
            const p = m.getLatLng();
            onChange(
              Number(p.lat.toFixed(5)),
              Number(p.lng.toFixed(5)),
            );
          },
        }}
      />
      <ClickHandler onPick={onChange} />
      <Recenter lat={latitude} lon={longitude} />
    </MapContainer>
  );
}
