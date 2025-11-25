"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { 
  Plus, 
  Pencil, 
  Loader2, 
  Euro,
  Plane,
  Train,
  Ship,
  Car,
  Users,
  Crown,
  Sparkles,
  Database
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

type ServiceType = "Meet & Greet" | "VIP" | "Group" | "Transfer" | "Train Station" | "Port";
type LocationType = "Airport" | "Train Station" | "Port" | "Address";

const SERVICE_TYPES: ServiceType[] = ["Meet & Greet", "VIP", "Group", "Transfer", "Train Station", "Port"];
const LOCATION_TYPES: LocationType[] = ["Airport", "Train Station", "Port", "Address"];

const SERVICE_ICONS: Record<ServiceType, React.ReactNode> = {
  "Meet & Greet": <Plane className="h-4 w-4" />,
  "VIP": <Crown className="h-4 w-4" />,
  "Group": <Users className="h-4 w-4" />,
  "Transfer": <Car className="h-4 w-4" />,
  "Train Station": <Train className="h-4 w-4" />,
  "Port": <Ship className="h-4 w-4" />,
};

interface RateCardFormData {
  name: string;
  description: string;
  serviceType: ServiceType;
  locationType: LocationType;
  basePrice: string;
  perPassengerPrice: string;
  perKmPrice: string;
  minimumPrice: string;
  nightSurchargePercent: string;
  weekendSurchargePercent: string;
  holidaySurchargePercent: string;
}

const initialFormData: RateCardFormData = {
  name: "",
  description: "",
  serviceType: "Meet & Greet",
  locationType: "Airport",
  basePrice: "",
  perPassengerPrice: "",
  perKmPrice: "",
  minimumPrice: "",
  nightSurchargePercent: "0",
  weekendSurchargePercent: "0",
  holidaySurchargePercent: "0",
};

export default function PricingPage() {
  const { user } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"rateCards"> | null>(null);
  const [formData, setFormData] = useState<RateCardFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const rateCards = useQuery(api.rateCards.getAll);
  const createRateCard = useMutation(api.rateCards.create);
  const updateRateCard = useMutation(api.rateCards.update);
  const seedDefaults = useMutation(api.rateCards.seedDefaults);

  const isAdmin = convexUser?.role === "Admin";

  const handleSubmit = async () => {
    if (!convexUser?._id || !formData.name) return;
    setIsSubmitting(true);

    try {
      const data = {
        name: formData.name,
        description: formData.description || undefined,
        serviceType: formData.serviceType,
        locationType: formData.locationType,
        basePrice: Math.round(parseFloat(formData.basePrice || "0") * 100),
        perPassengerPrice: formData.perPassengerPrice ? Math.round(parseFloat(formData.perPassengerPrice) * 100) : undefined,
        perKmPrice: formData.perKmPrice ? Math.round(parseFloat(formData.perKmPrice) * 100) : undefined,
        minimumPrice: formData.minimumPrice ? Math.round(parseFloat(formData.minimumPrice) * 100) : undefined,
        nightSurchargePercent: formData.nightSurchargePercent ? parseFloat(formData.nightSurchargePercent) : undefined,
        weekendSurchargePercent: formData.weekendSurchargePercent ? parseFloat(formData.weekendSurchargePercent) : undefined,
        holidaySurchargePercent: formData.holidaySurchargePercent ? parseFloat(formData.holidaySurchargePercent) : undefined,
      };

      if (editingId) {
        await updateRateCard({ rateCardId: editingId, ...data });
      } else {
        await createRateCard(data);
      }

      setIsDialogOpen(false);
      setFormData(initialFormData);
      setEditingId(null);
    } catch (error) {
      console.error("Failed to save rate card:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (rateCard: NonNullable<typeof rateCards>[number]) => {
    setEditingId(rateCard._id);
    setFormData({
      name: rateCard.name,
      description: rateCard.description || "",
      serviceType: rateCard.serviceType as ServiceType,
      locationType: rateCard.locationType as LocationType,
      basePrice: (rateCard.basePrice / 100).toString(),
      perPassengerPrice: rateCard.perPassengerPrice ? (rateCard.perPassengerPrice / 100).toString() : "",
      perKmPrice: rateCard.perKmPrice ? (rateCard.perKmPrice / 100).toString() : "",
      minimumPrice: rateCard.minimumPrice ? (rateCard.minimumPrice / 100).toString() : "",
      nightSurchargePercent: rateCard.nightSurchargePercent?.toString() || "0",
      weekendSurchargePercent: rateCard.weekendSurchargePercent?.toString() || "0",
      holidaySurchargePercent: rateCard.holidaySurchargePercent?.toString() || "0",
    });
    setIsDialogOpen(true);
  };

  const handleToggle = async (id: Id<"rateCards">, currentState: boolean) => {
    await updateRateCard({ rateCardId: id, isActive: !currentState });
  };

  const handleSeedDefaults = async () => {
    setIsSubmitting(true);
    try {
      await seedDefaults({});
    } catch (error) {
      console.error("Failed to seed defaults:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <>
        <DashboardHeader
          title="Pricing"
          breadcrumbs={[{ label: "Pricing" }]}
        />
        <div className="flex flex-1 items-center justify-center p-4">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <Crown className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Admin Only</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Rate card management is only available to administrators.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardHeader
        title="Pricing & Rate Cards"
        breadcrumbs={[{ label: "Pricing" }]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Rate Cards</h2>
            <p className="text-muted-foreground">
              Configure pricing for different service types and locations
            </p>
          </div>
          <div className="flex gap-2">
            {(!rateCards || rateCards.length === 0) && (
              <Button 
                variant="outline" 
                onClick={handleSeedDefaults}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Database className="mr-2 h-4 w-4" />
                )}
                Seed Defaults
              </Button>
            )}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setFormData(initialFormData);
                setEditingId(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Rate Card
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Edit Rate Card" : "Create Rate Card"}
                  </DialogTitle>
                  <DialogDescription>
                    Configure pricing for a service type and location combination
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Rate Card Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Standard Airport Meet & Greet"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Service Type</Label>
                      <Select
                        value={formData.serviceType}
                        onValueChange={(value) => setFormData({ ...formData, serviceType: value as ServiceType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              <span className="flex items-center gap-2">
                                {SERVICE_ICONS[type]}
                                {type}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Location Type</Label>
                      <Select
                        value={formData.locationType}
                        onValueChange={(value) => setFormData({ ...formData, locationType: value as LocationType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LOCATION_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>Base Price (€)</Label>
                      <div className="relative">
                        <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="pl-9"
                          value={formData.basePrice}
                          onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Per Passenger (€)</Label>
                      <div className="relative">
                        <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="pl-9"
                          value={formData.perPassengerPrice}
                          onChange={(e) => setFormData({ ...formData, perPassengerPrice: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Per KM (€)</Label>
                      <div className="relative">
                        <Euro className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="pl-9"
                          value={formData.perKmPrice}
                          onChange={(e) => setFormData({ ...formData, perKmPrice: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>Night Surcharge (%)</Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={formData.nightSurchargePercent}
                        onChange={(e) => setFormData({ ...formData, nightSurchargePercent: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Weekend Surcharge (%)</Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={formData.weekendSurchargePercent}
                        onChange={(e) => setFormData({ ...formData, weekendSurchargePercent: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Holiday Surcharge (%)</Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={formData.holidaySurchargePercent}
                        onChange={(e) => setFormData({ ...formData, holidaySurchargePercent: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting || !formData.basePrice}>
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    {editingId ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Rate Cards</CardTitle>
            <CardDescription>
              Manage pricing across all service and location combinations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!rateCards ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : rateCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Euro className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Rate Cards</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create your first rate card or seed default rates to get started.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Per PAX</TableHead>
                    <TableHead className="text-right">Per KM</TableHead>
                    <TableHead className="text-center">Surcharges</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rateCards.map((rate) => (
                    <TableRow key={rate._id}>
                      <TableCell>
                        <span className="font-medium">{rate.name}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {SERVICE_ICONS[rate.serviceType as ServiceType]}
                          <span>{rate.serviceType}</span>
                        </div>
                      </TableCell>
                      <TableCell>{rate.locationType}</TableCell>
                      <TableCell className="text-right font-mono">
                        €{(rate.basePrice / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {rate.perPassengerPrice ? `€${(rate.perPassengerPrice / 100).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {rate.perKmPrice ? `€${(rate.perKmPrice / 100).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1 flex-wrap">
                          {rate.nightSurchargePercent && rate.nightSurchargePercent > 0 && (
                            <Badge variant="outline" className="text-xs">
                              🌙 {rate.nightSurchargePercent}%
                            </Badge>
                          )}
                          {rate.weekendSurchargePercent && rate.weekendSurchargePercent > 0 && (
                            <Badge variant="outline" className="text-xs">
                              📅 {rate.weekendSurchargePercent}%
                            </Badge>
                          )}
                          {rate.holidaySurchargePercent && rate.holidaySurchargePercent > 0 && (
                            <Badge variant="outline" className="text-xs">
                              🎉 {rate.holidaySurchargePercent}%
                            </Badge>
                          )}
                          {!rate.nightSurchargePercent && !rate.weekendSurchargePercent && !rate.holidaySurchargePercent && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={rate.isActive}
                          onCheckedChange={() => handleToggle(rate._id, rate.isActive)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(rate)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
