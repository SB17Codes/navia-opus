"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { format } from "date-fns";
import { Eye, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface MissionTableProps {
  clientId: Id<"users"> | undefined;
  limit?: number;
}

const statusColors: Record<string, string> = {
  Scheduled: "bg-gray-500",
  Active: "bg-green-500",
  "Arrived at Airport": "bg-blue-500",
  "Passenger Met": "bg-purple-500",
  "Luggage Collected": "bg-amber-500",
  Complete: "bg-emerald-600",
  Cancelled: "bg-red-500",
};

export function MissionTable({ clientId, limit }: MissionTableProps) {
  const router = useRouter();
  const missions = useQuery(
    api.missions.getByClient,
    clientId ? { clientId } : "skip"
  );

  const displayMissions = limit ? missions?.slice(0, limit) : missions;

  if (!missions) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse text-muted-foreground">
          Loading missions...
        </div>
      </div>
    );
  }

  if (missions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-muted-foreground">No missions yet.</p>
        <p className="text-sm text-muted-foreground">
          Create your first mission to get started.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Passenger</TableHead>
          <TableHead>Flight</TableHead>
          <TableHead>Scheduled</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {displayMissions?.map((mission) => (
          <TableRow 
            key={mission._id} 
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => router.push(`/dashboard/missions/${mission._id}`)}
          >
            <TableCell className="font-medium">
              {mission.passengerName}
            </TableCell>
            <TableCell className="font-mono">{mission.flightNumber}</TableCell>
            <TableCell>
              {format(new Date(mission.scheduledAt), "MMM d, HH:mm")}
            </TableCell>
            <TableCell>{mission.serviceType}</TableCell>
            <TableCell>
              <Badge
                variant="secondary"
                className={`${statusColors[mission.status]} text-white`}
              >
                {mission.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/missions/${mission._id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
