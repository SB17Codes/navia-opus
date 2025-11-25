"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

interface CreateMissionDialogProps {
  clientId: Id<"users"> | undefined;
}

export function CreateMissionDialog({ clientId }: CreateMissionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createMission = useMutation(api.missions.create);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!clientId) return;

    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const scheduledDate = formData.get("scheduledDate") as string;
    const scheduledTime = formData.get("scheduledTime") as string;
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).getTime();

    try {
      await createMission({
        clientId,
        passengerName: formData.get("passengerName") as string,
        flightNumber: formData.get("flightNumber") as string,
        scheduledAt,
        pickupLocation: formData.get("pickupLocation") as string,
        dropoffLocation: (formData.get("dropoffLocation") as string) || undefined,
        serviceType: formData.get("serviceType") as "Meet & Greet" | "VIP" | "Group",
        notes: (formData.get("notes") as string) || undefined,
      });
      setOpen(false);
    } catch (error) {
      console.error("Failed to create mission:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get minimum date (today) for the date picker
  const today = new Date().toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Mission
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Mission</DialogTitle>
            <DialogDescription>
              Schedule a new passenger assistance mission.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="passengerName">Passenger Name *</Label>
              <Input
                id="passengerName"
                name="passengerName"
                placeholder="John Smith"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="flightNumber">Flight Number *</Label>
              <Input
                id="flightNumber"
                name="flightNumber"
                placeholder="AF1234"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="scheduledDate">Date *</Label>
                <Input
                  id="scheduledDate"
                  name="scheduledDate"
                  type="date"
                  min={today}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scheduledTime">Time *</Label>
                <Input
                  id="scheduledTime"
                  name="scheduledTime"
                  type="time"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="serviceType">Service Type *</Label>
              <Select name="serviceType" required defaultValue="Meet & Greet">
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Meet & Greet">Meet & Greet</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="Group">Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pickupLocation">Pickup Location *</Label>
              <Input
                id="pickupLocation"
                name="pickupLocation"
                placeholder="CDG Terminal 2E"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dropoffLocation">Drop-off Location</Label>
              <Input
                id="dropoffLocation"
                name="dropoffLocation"
                placeholder="Hotel Marriott Champs-Élysées"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Special instructions..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !clientId}>
              {isSubmitting ? "Creating..." : "Create Mission"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
