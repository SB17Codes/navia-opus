"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MissionTable } from "@/components/dashboard/MissionTable";
import { CreateMissionDialog } from "@/components/dashboard/CreateMissionDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";

export default function MissionsPage() {
  const { user } = useUser();
  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  return (
    <>
      <DashboardHeader
        title="Missions"
        breadcrumbs={[{ label: "Missions" }]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Missions</h2>
            <p className="text-muted-foreground">
              Manage all passenger assistance missions
            </p>
          </div>
          <CreateMissionDialog clientId={convexUser?._id} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Missions</CardTitle>
          </CardHeader>
          <CardContent>
            <MissionTable clientId={convexUser?._id} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
