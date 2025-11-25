"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { CheckCircle2, Clock, Loader2, Users, Briefcase } from "lucide-react";

export default function AgentsPage() {
  const { user } = useUser();
  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const allAgents = useQuery(api.users.getAgents);
  const pendingAgents = useQuery(api.users.getPendingAgents);
  const missions = useQuery(
    api.missions.getByClient,
    convexUser?._id ? { clientId: convexUser._id } : "skip"
  );

  const isAdmin = convexUser?.role === "Admin";

  // Count missions per agent
  const getMissionCount = (agentId: string) => {
    if (!missions) return 0;
    return missions.filter((m) => m.agentId === agentId).length;
  };

  // Get active mission for agent
  const getActiveMission = (agentId: string) => {
    if (!missions) return null;
    return missions.find(
      (m) =>
        m.agentId === agentId &&
        m.status !== "Complete" &&
        m.status !== "Cancelled" &&
        m.status !== "Scheduled"
    );
  };

  return (
    <>
      <DashboardHeader
        title="Agents"
        breadcrumbs={[{ label: "Agents" }]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Agents</h2>
            <p className="text-muted-foreground">
              {isAdmin 
                ? "All registered agents across the platform"
                : "Agents available for mission assignments"
              }
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allAgents?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allAgents?.filter((a) => a.onboardingComplete && !getActiveMission(a._id)).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">On Mission</CardTitle>
              <Briefcase className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allAgents?.filter((a) => getActiveMission(a._id)).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Agents (Admin only) */}
        {isAdmin && pendingAgents && pendingAgents.length > 0 && (
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-orange-700 dark:text-orange-400">
                  Pending Onboarding ({pendingAgents.length})
                </CardTitle>
              </div>
              <CardDescription>
                These agents have registered but haven&apos;t completed onboarding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingAgents.map((agent) => (
                    <TableRow key={agent._id}>
                      <TableCell className="font-medium">{agent.name || "—"}</TableCell>
                      <TableCell>{agent.email}</TableCell>
                      <TableCell>
                        {new Date(agent.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* All Agents */}
        <Card>
          <CardHeader>
            <CardTitle>All Agents</CardTitle>
            <CardDescription>
              Agents are assigned to individual missions, not to clients permanently.
              Assign agents when creating or editing missions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!allAgents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allAgents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-muted-foreground">No agents registered yet.</p>
                <p className="text-sm text-muted-foreground">
                  Agents can sign up at /sign-up/agent
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Mission</TableHead>
                    <TableHead>Total Missions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allAgents.map((agent) => {
                    const activeMission = getActiveMission(agent._id);
                    return (
                      <TableRow key={agent._id}>
                        <TableCell className="font-medium">{agent.name || "—"}</TableCell>
                        <TableCell>{agent.email}</TableCell>
                        <TableCell>{agent.phone || "—"}</TableCell>
                        <TableCell>
                          {!agent.onboardingComplete ? (
                            <Badge variant="secondary">
                              <Clock className="mr-1 h-3 w-3" />
                              Pending
                            </Badge>
                          ) : activeMission ? (
                            <Badge className="bg-blue-500">
                              <Briefcase className="mr-1 h-3 w-3" />
                              On Mission
                            </Badge>
                          ) : (
                            <Badge className="bg-green-500">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Available
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {activeMission ? (
                            <span className="text-sm">
                              {activeMission.passengerName} - {activeMission.status}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getMissionCount(agent._id)}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
