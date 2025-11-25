"use client";

import { use, useRef, useCallback, useState, } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { useWakeLock } from "@/hooks/useWakeLock";
import { format } from "date-fns";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Clock,
  Plane,
  Camera,
  CheckCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const STATUS_FLOW = [
  "Scheduled",
  "Active",
  "Arrived at Airport",
  "Passenger Met",
  "Luggage Collected",
  "Complete",
] as const;

const STATUS_COLORS: Record<string, string> = {
  Scheduled: "bg-gray-500",
  Active: "bg-green-500",
  "Arrived at Airport": "bg-blue-500",
  "Passenger Met": "bg-purple-500",
  "Luggage Collected": "bg-amber-500",
  Complete: "bg-emerald-600",
  Cancelled: "bg-red-500",
};

const STATUS_BUTTON_LABELS: Record<string, string> = {
  Scheduled: "Start Mission",
  Active: "Arrived at Airport",
  "Arrived at Airport": "Passenger Met",
  "Passenger Met": "Luggage Collected",
  "Luggage Collected": "Complete Mission",
};

export default function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const missionId = id as Id<"missions">;
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const mission = useQuery(api.missions.getById, { missionId });
  const missionEvents = useQuery(api.missionEvents.getByMission, { missionId });

  const updateStatus = useMutation(api.missions.updateStatus);
  const logLocation = useMutation(api.locationLogs.logLocation);
  const generateUploadUrl = useMutation(api.missionEvents.generateUploadUrl);
  const uploadPhoto = useMutation(api.missionEvents.uploadPhoto);

  // Check if mission is active for tracking
  const isActive =
    mission?.status !== "Scheduled" &&
    mission?.status !== "Complete" &&
    mission?.status !== "Cancelled";

  // Wake lock - keep screen on during active mission
  useWakeLock(isActive);

  // Location tracking with throttling
  const { location, error: locationError, permissionState, requestPermission } = useLocationTracking({
    enabled: isActive,
    minDistance: 20,
    minInterval: 30000,
    onLocationUpdate: useCallback(
      async (loc: { lat: number; lng: number }) => {
        if (convexUser?._id && mission?._id && isActive) {
          try {
            await logLocation({
              missionId: mission._id,
              agentId: convexUser._id,
              lat: loc.lat,
              lng: loc.lng,
            });
          } catch (err) {
            console.error("Failed to log location:", err);
          }
        }
      },
      [convexUser?._id, mission?._id, isActive, logLocation]
    ),
  });

  const handleStatusUpdate = async () => {
    if (!convexUser?._id || !mission || isUpdating) return;

    const currentIndex = STATUS_FLOW.indexOf(
      mission.status as (typeof STATUS_FLOW)[number]
    );
    if (currentIndex === -1 || currentIndex >= STATUS_FLOW.length - 1) return;

    const nextStatus = STATUS_FLOW[currentIndex + 1];
    setIsUpdating(true);

    try {
      await updateStatus({
        missionId: mission._id,
        status: nextStatus,
        agentId: convexUser._id,
      });
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !convexUser?._id || !mission?._id) return;

    setIsUploading(true);

    try {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Upload the file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();

      // Save the photo event
      await uploadPhoto({
        missionId: mission._id,
        agentId: convexUser._id,
        storageId,
      });
    } catch (error) {
      console.error("Failed to upload photo:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (!mission) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const canAdvance =
    mission.status !== "Complete" && mission.status !== "Cancelled";
  const nextButtonLabel = STATUS_BUTTON_LABELS[mission.status] || "Complete";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/mobile/home">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Mission</p>
            <p className="font-semibold">{mission.flightNumber}</p>
          </div>
          <Badge className={`${STATUS_COLORS[mission.status]} text-white`}>
            {mission.status}
          </Badge>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 space-y-4 p-4 pb-32">
        {/* Flight info - prominent display */}
        <Card>
          <CardContent className="py-6 text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              <Plane className="h-6 w-6 text-primary" />
              <span className="text-4xl font-bold">{mission.flightNumber}</span>
            </div>
            <p className="text-xl">{mission.passengerName}</p>
            <div className="mt-4 flex items-center justify-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{format(new Date(mission.scheduledAt), "MMM d, HH:mm")}</span>
            </div>
          </CardContent>
        </Card>

        {/* Location info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Locations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-green-100 p-1.5">
                <MapPin className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pickup</p>
                <p className="font-medium">{mission.pickupLocation}</p>
              </div>
            </div>
            {mission.dropoffLocation && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-red-100 p-1.5">
                  <MapPin className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Drop-off</p>
                  <p className="font-medium">{mission.dropoffLocation}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {mission.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{mission.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Tracking status */}
        {isActive && (
          <Card className={permissionState === "denied" ? "border-destructive/50 bg-destructive/5" : "border-primary/50 bg-primary/5"}>
            <CardContent className="py-3">
              {permissionState === "denied" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-destructive font-medium">Location Permission Denied</span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Please enable location access in your browser settings to track this mission.
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={requestPermission}
                    className="w-full mt-2"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">GPS Tracking</span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${location ? "bg-green-500" : "bg-yellow-500"} animate-pulse`}
                    />
                    {location ? "Active" : locationError || "Acquiring..."}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Mission events / photos */}
        {missionEvents && missionEvents.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Activity Log</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {missionEvents.map((event) => (
                <div
                  key={event._id}
                  className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="mt-0.5 rounded-full bg-muted p-1.5">
                    {event.eventType === "StatusChange" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : event.eventType === "PhotoUploaded" ? (
                      <Camera className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {event.eventType === "StatusChange"
                        ? `Status: ${event.newStatus}`
                        : event.eventType === "PhotoUploaded"
                          ? "Photo uploaded"
                          : event.note}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.timestamp), "HH:mm")}
                    </p>
                    {event.photoUrl && (
                      <Image
                        src={event.photoUrl}
                        width={200}
                        height={200}
                        alt="Mission photo"
                        className="mt-2 max-h-32 rounded-lg object-cover"
                      />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 space-y-2 border-t bg-background p-4">
        {/* Photo capture */}
        {isActive && (
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoCapture}
            />
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              {isUploading ? "Uploading..." : "Take Photo"}
            </Button>
            <Button variant="outline" size="icon" asChild>
              <a href="tel:+33123456789">
                <Phone className="h-4 w-4" />
              </a>
            </Button>
          </div>
        )}

        {/* Status update button */}
        {canAdvance ? (
          <Button
            className="w-full"
            size="lg"
            onClick={handleStatusUpdate}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            {isUpdating ? "Updating..." : nextButtonLabel}
          </Button>
        ) : (
          <Button className="w-full" size="lg" variant="secondary" disabled>
            <CheckCircle className="mr-2 h-4 w-4" />
            Mission {mission.status}
          </Button>
        )}
      </div>
    </div>
  );
}
