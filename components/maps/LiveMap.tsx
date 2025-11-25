"use client";

import { useRef, useCallback } from "react";
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

interface MissionMarker {
  id: string;
  lat: number;
  lng: number;
  status: string;
  passengerName: string;
}

interface LiveMapProps {
  missions?: MissionMarker[];
  onMissionClick?: (missionId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  Scheduled: "#6b7280", // gray
  Active: "#22c55e", // green
  "Arrived at Airport": "#3b82f6", // blue
  "Passenger Met": "#8b5cf6", // purple
  "Luggage Collected": "#f59e0b", // amber
  Complete: "#10b981", // emerald
  Cancelled: "#ef4444", // red
};

export function LiveMap({ missions = [], onMissionClick }: LiveMapProps) {
  const mapRef = useRef<MapRef>(null);

  const handleMarkerClick = useCallback(
    (missionId: string) => {
      onMissionClick?.(missionId);
    },
    [onMissionClick]
  );

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      initialViewState={{
        longitude: 2.3522, // Paris default
        latitude: 48.8566,
        zoom: 10,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
    >
      <NavigationControl position="top-right" />

      {missions.map((mission) => (
        <Marker
          key={mission.id}
          longitude={mission.lng}
          latitude={mission.lat}
          anchor="bottom"
          onClick={() => handleMarkerClick(mission.id)}
        >
          <div
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white shadow-lg"
            style={{ backgroundColor: STATUS_COLORS[mission.status] || "#6b7280" }}
            title={`${mission.passengerName} - ${mission.status}`}
          >
            <svg
              className="h-4 w-4 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </Marker>
      ))}
    </Map>
  );
}
