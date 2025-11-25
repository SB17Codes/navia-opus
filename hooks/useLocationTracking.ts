"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

interface LocationState {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

type PermissionState = "prompt" | "granted" | "denied" | "unavailable" | "requesting";

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
  const retryCountRef = useRef(0);

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
      setPermissionState("granted");
      retryCountRef.current = 0;

      if (shouldSendUpdate(newLocation)) {
        lastSentLocation.current = newLocation;
        onLocationUpdate?.(newLocation);
      }
    },
    [shouldSendUpdate, onLocationUpdate]
  );

  const handleError = useCallback((geoError: GeolocationPositionError) => {
    console.log("Geolocation error:", geoError.code, geoError.message);
    
    switch (geoError.code) {
      case geoError.PERMISSION_DENIED:
        // On Safari, PERMISSION_DENIED can be temporary or a real denial
        // Don't permanently block - allow retry
        setError("Location access needed. Please allow location access and try again.");
        setPermissionState("denied");
        break;
      case geoError.POSITION_UNAVAILABLE:
        setError("Location unavailable. Please check your device's location settings.");
        // Don't change permission state - this is a temporary error
        break;
      case geoError.TIMEOUT:
        setError("Location request timed out. Retrying...");
        // Don't change permission state - this is a temporary error
        break;
      default:
        setError(`Location error: ${geoError.message}`);
    }
  }, []);

  // Request permission manually - Safari compatible
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("Geolocation is not supported by your browser");
      return false;
    }

    // Reset state before requesting
    setError(null);
    setPermissionState("requesting");
    retryCountRef.current += 1;

    return new Promise((resolve) => {
      // Clear any existing watch
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          handlePosition(position);
          resolve(true);
        },
        (geoError) => {
          handleError(geoError);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // Longer timeout for Safari
          maximumAge: 0,
        }
      );
    });
  }, [isSupported, handlePosition, handleError]);

  // Start watching when enabled - don't check permissionState to allow Safari to prompt
  useEffect(() => {
    if (!enabled || !isSupported) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    // Don't start watching if we know permission is denied
    // But DO start if it's "prompt" - Safari will show the permission dialog
    if (permissionState === "denied") {
      return;
    }

    // Start watching - this will trigger permission prompt on first use
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 15000, // Longer timeout for Safari
        maximumAge: 5000,
      }
    );

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
    isTracking: enabled && isSupported && (permissionState === "granted" || permissionState === "requesting"),
    permissionState,
    requestPermission,
  };
}
