"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { MissionTable } from "@/components/dashboard/MissionTable";
import { CreateMissionDialog } from "@/components/dashboard/CreateMissionDialog";
import { LiveMap } from "@/components/dashboard/LiveMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const { user } = useUser();
  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  return (
    <>
      <DashboardHeader title="Live Map" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Mission Control</h2>
            <p className="text-muted-foreground">
              Real-time overview of all passenger assistance operations
            </p>
          </div>
          <CreateMissionDialog clientId={convexUser?._id} />
        </div>

        <StatsCards clientId={convexUser?._id} />

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Live Map */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Live Tracking</CardTitle>
            </CardHeader>
            <CardContent className="h-[400px] p-0">
              <LiveMap clientId={convexUser?._id} />
            </CardContent>
          </Card>

          {/* Recent Missions */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Recent Missions</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/missions">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <MissionTable clientId={convexUser?._id} limit={5} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
