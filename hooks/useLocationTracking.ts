"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

interface LocationState {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

type PermissionState = "prompt" | "granted" | "denied" | "unavailable";

interface UseLocationTrackingOptions {
  enabled: boolean;
  minDistance?: number; // meters
  minInterval?: number; // milliseconds
  onLocationUpdate?: (location: LocationState) => void;
}

interface UseLocationTrackingResult {
  location: LocationState | null;
  error: string | null;
  isTracking: boolean;
  permissionState: PermissionState;
  requestPermission: () => Promise<boolean>;
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
}: UseLocationTrackingOptions): UseLocationTrackingResult {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>("prompt");

  const lastSentLocation = useRef<LocationState | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Check geolocation support once
  const isSupported = useMemo(
    () => typeof navigator !== "undefined" && "geolocation" in navigator,
    []
  );

  // Check permission status on mount
  useEffect(() => {
    if (!isSupported) {
      setPermissionState("unavailable");
      return;
    }

    // Check if the Permissions API is available
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          setPermissionState(result.state as PermissionState);
          
          // Listen for permission changes
          result.onchange = () => {
            setPermissionState(result.state as PermissionState);
          };
        })
        .catch(() => {
          // Permissions API not supported, we'll check on request
          setPermissionState("prompt");
        });
    }
  }, [isSupported]);

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
      setPermissionState("granted");

      if (shouldSendUpdate(newLocation)) {
        lastSentLocation.current = newLocation;
        onLocationUpdate?.(newLocation);
      }
    },
    [shouldSendUpdate, onLocationUpdate]
  );

  const handleError = useCallback((error: GeolocationPositionError) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        setError("Location permission denied. Please enable in your browser settings.");
        setPermissionState("denied");
        break;
      case error.POSITION_UNAVAILABLE:
        setError("Location unavailable. Please try again.");
        break;
      case error.TIMEOUT:
        setError("Location request timed out. Please try again.");
        break;
      default:
        setError("Failed to get location.");
    }
  }, []);

  // Request permission manually
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("Geolocation is not supported by your browser");
      return false;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handlePosition(position);
          resolve(true);
        },
        (error) => {
          handleError(error);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, [isSupported, handlePosition, handleError]);

  useEffect(() => {
    if (!enabled || !isSupported || permissionState === "denied") {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    // Only start watching if permission was granted
    if (permissionState === "granted" || permissionState === "prompt") {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handlePosition,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, isSupported, permissionState, handlePosition, handleError]);

  return {
    location,
    error: !isSupported ? "Geolocation is not supported" : error,
    isTracking: enabled && isSupported && permissionState === "granted",
    permissionState,
    requestPermission,
  };
}
