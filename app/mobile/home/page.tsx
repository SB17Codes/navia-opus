"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser, useClerk } from "@clerk/nextjs";
import { format } from "date-fns";
import { MapPin, Clock, Plane, ChevronRight, LogOut, Settings } from "lucide-react";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  Scheduled: "bg-gray-500",
  Active: "bg-green-500",
  "Arrived at Airport": "bg-blue-500",
  "Passenger Met": "bg-purple-500",
  "Luggage Collected": "bg-amber-500",
  Complete: "bg-emerald-600",
  Cancelled: "bg-red-500",
};

export default function MobileHomePage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const missions = useQuery(
    api.missions.getByAgent,
    convexUser?._id ? { agentId: convexUser._id } : "skip"
  );

  // Find active mission (not Scheduled, not Complete/Cancelled)
  const activeMission = missions?.find(
    (m) =>
      m.status !== "Scheduled" &&
      m.status !== "Complete" &&
      m.status !== "Cancelled"
  );

  // Today's scheduled missions
  const todayMissions = missions?.filter((m) => {
    const today = new Date();
    const missionDate = new Date(m.scheduledAt);
    return (
      missionDate.toDateString() === today.toDateString() &&
      m.status === "Scheduled"
    );
  });

  // Upcoming missions (after today, scheduled)
  const upcomingMissions = missions?.filter((m) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const missionDate = new Date(m.scheduledAt);
    return missionDate > today && m.status === "Scheduled";
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold">Navia</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback>
                    {user?.firstName?.charAt(0)}
                    {user?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 space-y-4 p-4 pb-24">
        {/* Active mission card */}
        {activeMission ? (
          <Link href={`/mobile/mission/${activeMission._id}`}>
            <Card className="border-2 border-primary bg-primary/5">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-primary">
                    ACTIVE MISSION
                  </CardTitle>
                  <Badge
                    className={`${STATUS_COLORS[activeMission.status]} text-white`}
                  >
                    {activeMission.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">
                      {activeMission.flightNumber}
                    </p>
                    <p className="text-lg">{activeMission.passengerName}</p>
                  </div>
                  <ChevronRight className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(new Date(activeMission.scheduledAt), "HH:mm")}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {activeMission.pickupLocation}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Card className="border-2 border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                ACTIVE MISSION
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                No active mission
              </p>
            </CardContent>
          </Card>
        )}

        {/* Today's missions */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Today&apos;s Missions</h2>
          {todayMissions?.length ? (
            <div className="space-y-2">
              {todayMissions.map((mission) => (
                <Link
                  key={mission._id}
                  href={`/mobile/mission/${mission._id}`}
                >
                  <Card className="transition-colors hover:bg-accent">
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="space-y-1">
                        <p className="font-mono font-semibold">
                          {mission.flightNumber}
                        </p>
                        <p className="text-sm">{mission.passengerName}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(mission.scheduledAt), "HH:mm")}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-6">
                <p className="text-center text-muted-foreground">
                  No missions scheduled for today
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Upcoming missions */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Upcoming</h2>
          {upcomingMissions?.length ? (
            <div className="space-y-2">
              {upcomingMissions.slice(0, 5).map((mission) => (
                <Link
                  key={mission._id}
                  href={`/mobile/mission/${mission._id}`}
                >
                  <Card className="transition-colors hover:bg-accent">
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="space-y-1">
                        <p className="font-mono font-semibold">
                          {mission.flightNumber}
                        </p>
                        <p className="text-sm">{mission.passengerName}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(mission.scheduledAt), "MMM d, HH:mm")}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-6">
                <p className="text-center text-muted-foreground">
                  No upcoming missions
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
        {activeMission ? (
          <Button className="w-full" size="lg" asChild>
            <Link href={`/mobile/mission/${activeMission._id}`}>
              Continue Mission
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : todayMissions?.length ? (
          <Button className="w-full" size="lg" asChild>
            <Link href={`/mobile/mission/${todayMissions[0]._id}`}>
              Start Next Mission
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button className="w-full" size="lg" disabled>
            No Missions Available
          </Button>
        )}
      </div>
    </div>
  );
}
