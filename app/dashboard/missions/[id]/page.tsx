"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  ArrowLeft,
  Plane,
  MapPin,
  Clock,
  User,
  UserCheck,
  Phone,
  Camera,
  CheckCircle2,
  XCircle,
  Navigation,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import Image from "next/image";
import "mapbox-gl/dist/mapbox-gl.css";

const STATUS_COLORS: Record<string, string> = {
  Scheduled: "bg-gray-500",
  Active: "bg-green-500",
  "Arrived at Airport": "bg-blue-500",
  "Passenger Met": "bg-purple-500",
  "Luggage Collected": "bg-amber-500",
  Complete: "bg-emerald-600",
  Cancelled: "bg-red-500",
};

const STATUS_STEPS = [
  "Scheduled",
  "Active",
  "Arrived at Airport",
  "Passenger Met",
  "Luggage Collected",
  "Complete",
];

export default function MissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const missionId = params.id as Id<"missions">;

  const mission = useQuery(api.missions.getById, { missionId });
  const events = useQuery(api.missionEvents.getByMission, { missionId });
  const availableAgents = useQuery(api.users.getAvailableAgents);
  const allAgents = useQuery(api.users.getAgents);
  
  const assignAgent = useMutation(api.missions.assignAgent);

  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  // Get assigned agent details
  const assignedAgent = allAgents?.find((a) => a._id === mission?.agentId);

  // Get latest location
  const latestLocation = useQuery(
    api.locationLogs.getLatest,
    mission?.status && mission.status !== "Scheduled" && mission.status !== "Complete" && mission.status !== "Cancelled"
      ? { missionId }
      : "skip"
  );

  const handleAssignAgent = async () => {
    if (!selectedAgent || selectedAgent === "unassigned") return;

    setIsAssigning(true);
    try {
      await assignAgent({
        missionId,
        agentId: selectedAgent as Id<"users">,
      });
      setAssignDialogOpen(false);
      setSelectedAgent("");
    } catch (error) {
      console.error("Failed to assign agent:", error);
    } finally {
      setIsAssigning(false);
    }
  };

  const currentStepIndex = mission ? STATUS_STEPS.indexOf(mission.status) : -1;

  if (mission === undefined) {
    return (
      <>
        <DashboardHeader
          title="Mission Details"
          breadcrumbs={[
            { label: "Missions", href: "/dashboard/missions" },
            { label: "Loading..." },
          ]}
        />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </>
    );
  }

  if (mission === null) {
    return (
      <>
        <DashboardHeader
          title="Mission Not Found"
          breadcrumbs={[
            { label: "Missions", href: "/dashboard/missions" },
            { label: "Not Found" },
          ]}
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
          <XCircle className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Mission Not Found</h2>
          <p className="text-muted-foreground">
            This mission may have been deleted or you don&apos;t have access.
          </p>
          <Button onClick={() => router.push("/dashboard/missions")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Missions
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader
        title="Mission Details"
        breadcrumbs={[
          { label: "Missions", href: "/dashboard/missions" },
          { label: mission.passengerName },
        ]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{mission.passengerName}</h2>
              <p className="text-muted-foreground">
                {mission.flightNumber} • {format(new Date(mission.scheduledAt), "PPP 'at' p")}
              </p>
            </div>
          </div>
          <Badge className={`${STATUS_COLORS[mission.status]} text-white`}>
            {mission.status}
          </Badge>
        </div>

        {/* Progress Tracker */}
        {mission.status !== "Cancelled" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {STATUS_STEPS.map((step, index) => {
                  const isCompleted = index < currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  return (
                    <div key={step} className="flex flex-1 items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                            isCompleted
                              ? "bg-green-500 text-white"
                              : isCurrent
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <span
                          className={`mt-1 text-xs ${
                            isCurrent ? "font-medium" : "text-muted-foreground"
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                      {index < STATUS_STEPS.length - 1 && (
                        <div
                          className={`mx-2 h-0.5 flex-1 ${
                            isCompleted ? "bg-green-500" : "bg-muted"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Mission Info */}
          <Card>
            <CardHeader>
              <CardTitle>Mission Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Passenger</p>
                  <p className="text-sm text-muted-foreground">{mission.passengerName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Plane className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Flight</p>
                  <p className="text-sm text-muted-foreground">{mission.flightNumber}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Scheduled</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(mission.scheduledAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Pickup</p>
                  <p className="text-sm text-muted-foreground">{mission.pickupLocation}</p>
                </div>
              </div>

              {mission.dropoffLocation && (
                <div className="flex items-start gap-3">
                  <Navigation className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Drop-off</p>
                    <p className="text-sm text-muted-foreground">{mission.dropoffLocation}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Badge variant="outline">{mission.serviceType}</Badge>
              </div>

              {mission.notes && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm font-medium">Notes</p>
                  <p className="text-sm text-muted-foreground">{mission.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agent & Location */}
          <div className="space-y-4">
            {/* Agent Card */}
            <Card>
              <CardHeader>
                <CardTitle>Assigned Agent</CardTitle>
              </CardHeader>
              <CardContent>
                {assignedAgent ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                          <UserCheck className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">{assignedAgent.name || "Agent"}</p>
                          <p className="text-sm text-muted-foreground">{assignedAgent.phone || assignedAgent.email}</p>
                        </div>
                      </div>
                      {assignedAgent.phone && (
                        <Button variant="outline" size="icon" asChild>
                          <a href={`tel:${assignedAgent.phone}`}>
                            <Phone className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                    {mission.status === "Scheduled" && (
                      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full">
                            Reassign Agent
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reassign Agent</DialogTitle>
                            <DialogDescription>
                              Select a different agent for this mission.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an agent..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableAgents?.map((agent) => (
                                  <SelectItem key={agent._id} value={agent._id}>
                                    {agent.name || agent.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleAssignAgent} disabled={!selectedAgent || isAssigning}>
                              {isAssigning ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Assigning...
                                </>
                              ) : (
                                "Reassign"
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-3">No agent assigned yet</p>
                    <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <UserCheck className="mr-2 h-4 w-4" />
                          Assign Agent
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Agent</DialogTitle>
                          <DialogDescription>
                            Select an available agent for this mission.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an agent..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableAgents?.map((agent) => (
                                <SelectItem key={agent._id} value={agent._id}>
                                  {agent.name || agent.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAssignAgent} disabled={!selectedAgent || isAssigning}>
                            {isAssigning ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Assigning...
                              </>
                            ) : (
                              "Assign"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Location Map */}
            <Card>
              <CardHeader>
                <CardTitle>Live Location</CardTitle>
                <CardDescription>
                  {latestLocation
                    ? `Last updated ${format(new Date(latestLocation.timestamp), "p")}`
                    : "Location tracking starts when mission is active"}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[250px] p-0 overflow-hidden rounded-b-lg">
                <Map
                  mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                  initialViewState={{
                    longitude: latestLocation?.lng || 2.3522,
                    latitude: latestLocation?.lat || 48.8566,
                    zoom: latestLocation ? 14 : 10,
                  }}
                  style={{ width: "100%", height: "100%" }}
                  mapStyle="mapbox://styles/mapbox/streets-v12"
                >
                  <NavigationControl position="top-right" />
                  {latestLocation && (
                    <Marker
                      longitude={latestLocation.lng}
                      latitude={latestLocation.lat}
                      anchor="center"
                    >
                      <div className="relative">
                        <div className="absolute -inset-2 animate-ping rounded-full bg-green-400 opacity-75" />
                        <div className="relative h-4 w-4 rounded-full bg-green-500 border-2 border-white shadow-lg" />
                      </div>
                    </Marker>
                  )}
                </Map>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>Timeline of mission events and updates</CardDescription>
          </CardHeader>
          <CardContent>
            {!events || events.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No activity yet. Events will appear here as the mission progresses.
              </p>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event._id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          event.eventType === "StatusChange"
                            ? "bg-blue-100"
                            : event.eventType === "PhotoUploaded"
                            ? "bg-purple-100"
                            : "bg-gray-100"
                        }`}
                      >
                        {event.eventType === "StatusChange" ? (
                          <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        ) : event.eventType === "PhotoUploaded" ? (
                          <Camera className="h-4 w-4 text-purple-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div className="w-px flex-1 bg-border" />
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium">
                        {event.eventType === "StatusChange"
                          ? `Status changed to "${event.newStatus}"`
                          : event.eventType === "PhotoUploaded"
                          ? "Photo uploaded"
                          : "Note added"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.timestamp), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                      {event.photoUrl && (
                        <Image
                          src={event.photoUrl}
                          width={200}
                          height={200}
                          alt="Mission photo"
                          className="mt-2 max-w-[200px] rounded-lg border"
                        />
                      )}
                      {event.note && (
                        <p className="mt-1 text-sm text-muted-foreground">{event.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
