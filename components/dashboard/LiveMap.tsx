"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import Map, {
  Marker,
  NavigationControl,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface LiveMapProps {
  clientId: Id<"users"> | undefined;
  onMissionClick?: (missionId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  Scheduled: "#6b7280",
  Active: "#22c55e",
  "Arrived at Airport": "#3b82f6",
  "Passenger Met": "#8b5cf6",
  "Luggage Collected": "#f59e0b",
  Complete: "#10b981",
  Cancelled: "#ef4444",
};

export function LiveMap({ clientId, onMissionClick }: LiveMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const activeMissions = useQuery(
    api.missions.getActiveMissions,
    clientId ? { clientId } : "skip"
  );

  const handleMarkerClick = useCallback(
    (missionId: string) => {
      onMissionClick?.(missionId);
    },
    [onMissionClick]
  );

  // Fit bounds to show all markers when missions change
  useEffect(() => {
    if (!mapLoaded || !activeMissions?.length || !mapRef.current) return;

    const missionsWithLocation = activeMissions.filter((m) => m.lastLocation);
    if (missionsWithLocation.length === 0) return;

    if (missionsWithLocation.length === 1) {
      const mission = missionsWithLocation[0];
      mapRef.current.flyTo({
        center: [mission.lastLocation!.lng, mission.lastLocation!.lat],
        zoom: 14,
      });
    }
  }, [activeMissions, mapLoaded]);

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      initialViewState={{
        longitude: 2.3522,
        latitude: 48.8566,
        zoom: 10,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      onLoad={() => setMapLoaded(true)}
    >
      <NavigationControl position="top-right" />

      {activeMissions?.map((mission) => {
        if (!mission.lastLocation) return null;
        return (
          <Marker
            key={mission._id}
            longitude={mission.lastLocation.lng}
            latitude={mission.lastLocation.lat}
            anchor="bottom"
            onClick={() => handleMarkerClick(mission._id)}
          >
            <div
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform hover:scale-110"
              style={{
                backgroundColor: STATUS_COLORS[mission.status] || "#6b7280",
              }}
              title={`${mission.passengerName} - ${mission.status}`}
            >
              <svg
                className="h-5 w-5 text-white"
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
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 rounded-lg bg-white/90 p-3 shadow-lg backdrop-blur">
        <p className="mb-2 text-xs font-semibold text-gray-700">Status</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(STATUS_COLORS)
            .filter(([status]) => status !== "Scheduled" && status !== "Cancelled")
            .map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-gray-600">{status}</span>
              </div>
            ))}
        </div>
      </div>
    </Map>
  );
}
