"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Activity, Clock, Users, CheckCircle } from "lucide-react";

interface StatsCardsProps {
  clientId: Id<"users"> | undefined;
}

export function StatsCards({ clientId }: StatsCardsProps) {
  const missions = useQuery(
    api.missions.getByClient,
    clientId ? { clientId } : "skip"
  );

  const activeMissions =
    missions?.filter(
      (m) =>
        m.status !== "Scheduled" &&
        m.status !== "Complete" &&
        m.status !== "Cancelled"
    ).length || 0;

  const todayMissions =
    missions?.filter((m) => {
      const today = new Date();
      const missionDate = new Date(m.scheduledAt);
      return missionDate.toDateString() === today.toDateString();
    }).length || 0;

  const completedThisWeek =
    missions?.filter((m) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return m.status === "Complete" && new Date(m.updatedAt) > weekAgo;
    }).length || 0;

  const stats = [
    {
      title: "Active Missions",
      value: activeMissions,
      icon: Activity,
      description: "Currently in progress",
    },
    {
      title: "Today's Missions",
      value: todayMissions,
      icon: Clock,
      description: "Scheduled for today",
    },
    {
      title: "Agents Online",
      value: 0, // TODO: Implement presence
      icon: Users,
      description: "Available agents",
    },
    {
      title: "Completed This Week",
      value: completedThisWeek,
      icon: CheckCircle,
      description: "Successfully completed",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
