"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

interface LocationState {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

interface UseLocationTrackingOptions {
  enabled: boolean;
  minDistance?: number; // meters
  minInterval?: number; // milliseconds
  onLocationUpdate?: (location: LocationState) => void;
}

// Calculate distance between two points in meters (Haversine formula)
function getDistanceInMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useLocationTracking({
  enabled,
  minDistance = 20, // 20 meters
  minInterval = 30000, // 30 seconds
  onLocationUpdate,
}: UseLocationTrackingOptions) {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lastSentLocation = useRef<LocationState | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Check geolocation support once
  const isSupported = useMemo(
    () => typeof navigator !== "undefined" && "geolocation" in navigator,
    []
  );

  const shouldSendUpdate = useCallback(
    (newLocation: LocationState): boolean => {
      if (!lastSentLocation.current) return true;

      const distance = getDistanceInMeters(
        lastSentLocation.current.lat,
        lastSentLocation.current.lng,
        newLocation.lat,
        newLocation.lng
      );

      const timeDiff = newLocation.timestamp - lastSentLocation.current.timestamp;

      // Send if moved > minDistance OR minInterval has passed
      return distance > minDistance || timeDiff > minInterval;
    },
    [minDistance, minInterval]
  );

  const handlePosition = useCallback(
    (position: GeolocationPosition) => {
      const newLocation: LocationState = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
      };

      setLocation(newLocation);
      setError(null);

      if (shouldSendUpdate(newLocation)) {
        lastSentLocation.current = newLocation;
        onLocationUpdate?.(newLocation);
      }
    },
    [shouldSendUpdate, onLocationUpdate]
  );

  const handleError = useCallback((error: GeolocationPositionError) => {
    setError(error.message);
  }, []);

  useEffect(() => {
    if (!enabled || !isSupported) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, isSupported, handlePosition, handleError]);

  return {
    location,
    error: !isSupported ? "Geolocation is not supported" : error,
    isTracking: enabled && isSupported,
  };
}
