"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  UserCheck,
  Plane,
  Train,
  Ship,
  Car,
  Users,
  Upload,
  X,
  Calculator,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Check,
  MapPin,
  Calendar,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateMissionDialogProps {
  clientId: Id<"users"> | undefined;
}

type ServiceType = "Meet & Greet" | "VIP" | "Group" | "Transfer" | "Train Station" | "Port";
type LocationType = "Airport" | "Train Station" | "Port" | "Address";

const SERVICE_ICONS: Record<ServiceType, React.ReactNode> = {
  "Meet & Greet": <Plane className="h-5 w-5" />,
  "VIP": <Plane className="h-5 w-5" />,
  "Group": <Users className="h-5 w-5" />,
  "Transfer": <Car className="h-5 w-5" />,
  "Train Station": <Train className="h-5 w-5" />,
  "Port": <Ship className="h-5 w-5" />,
};

const SERVICE_DESCRIPTIONS: Record<ServiceType, string> = {
  "Meet & Greet": "Standard airport welcome service",
  "VIP": "Premium service with lounge access",
  "Group": "Assistance for tour groups",
  "Transfer": "Vehicle transfer service",
  "Train Station": "Train station assistance",
  "Port": "Cruise port assistance",
};

const SERVICE_LOCATION_MAP: Record<ServiceType, LocationType> = {
  "Meet & Greet": "Airport",
  "VIP": "Airport",
  "Group": "Airport",
  "Transfer": "Address",
  "Train Station": "Train Station",
  "Port": "Port",
};

const STEPS = [
  { id: 1, name: "Service", icon: Plane },
  { id: 2, name: "Passenger", icon: Users },
  { id: 3, name: "Schedule", icon: Calendar },
  { id: 4, name: "Documents", icon: FileText },
  { id: 5, name: "Review", icon: Check },
];

export function CreateMissionDialog({ clientId }: CreateMissionDialogProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [serviceType, setServiceType] = useState<ServiceType>("Meet & Greet");
  const [locationType, setLocationType] = useState<LocationType>("Airport");
  const [passengerName, setPassengerName] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [passengerEmail, setPassengerEmail] = useState("");
  const [passengerCount, setPassengerCount] = useState(1);
  const [groupLeaderName, setGroupLeaderName] = useState("");
  const [groupLeaderPhone, setGroupLeaderPhone] = useState("");
  const [groupLeaderEmail, setGroupLeaderEmail] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [trainNumber, setTrainNumber] = useState("");
  const [shipName, setShipName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const createMission = useMutation(api.missions.create);
  const generateUploadUrl = useMutation(api.missions.generateUploadUrl);
  const addAttachment = useMutation(api.missions.addAttachment);
  const availableAgents = useQuery(api.users.getAvailableAgents);

  // Calculate price
  const hasValidSchedule = scheduledDate && scheduledTime;
  const scheduledAt = hasValidSchedule
    ? new Date(`${scheduledDate}T${scheduledTime}`).getTime()
    : 0;

  const priceCalculation = useQuery(
    api.rateCards.calculatePrice,
    hasValidSchedule
      ? {
          serviceType,
          locationType,
          passengerCount: passengerCount > 1 ? passengerCount : undefined,
          scheduledAt,
          clientId,
        }
      : "skip"
  );

  // Auto-set location type when service type changes
  useEffect(() => {
    setLocationType(SERVICE_LOCATION_MAP[serviceType]);
  }, [serviceType]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (missionId: Id<"missions">) => {
    for (const file of attachments) {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();

      await addAttachment({
        missionId,
        storageId,
        fileName: file.name,
        fileType: file.type,
      });
    }
  };

  const handleSubmit = async () => {
    if (!clientId) return;

    setIsSubmitting(true);
    const scheduledAtTime = new Date(`${scheduledDate}T${scheduledTime}`).getTime();

    try {
      const missionId = await createMission({
        clientId,
        agentId: selectedAgent && selectedAgent !== "unassigned" 
          ? (selectedAgent as Id<"users">) 
          : undefined,
        passengerName,
        passengerPhone: passengerPhone || undefined,
        passengerEmail: passengerEmail || undefined,
        passengerCount: passengerCount > 1 ? passengerCount : undefined,
        groupLeaderName: groupLeaderName || undefined,
        groupLeaderPhone: groupLeaderPhone || undefined,
        groupLeaderEmail: groupLeaderEmail || undefined,
        flightNumber: flightNumber || undefined,
        trainNumber: trainNumber || undefined,
        shipName: shipName || undefined,
        scheduledAt: scheduledAtTime,
        pickupLocation,
        dropoffLocation: dropoffLocation || undefined,
        serviceType,
        locationType,
        quotedPrice: priceCalculation?.price ?? undefined,
        currency: "EUR",
        notes: notes || undefined,
      });

      if (attachments.length > 0) {
        setUploadingFiles(true);
        await uploadFiles(missionId);
      }

      setOpen(false);
      resetForm();
    } catch (error) {
      console.error("Failed to create mission:", error);
    } finally {
      setIsSubmitting(false);
      setUploadingFiles(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedAgent("");
    setServiceType("Meet & Greet");
    setLocationType("Airport");
    setPassengerName("");
    setPassengerPhone("");
    setPassengerEmail("");
    setPassengerCount(1);
    setGroupLeaderName("");
    setGroupLeaderPhone("");
    setGroupLeaderEmail("");
    setFlightNumber("");
    setTrainNumber("");
    setShipName("");
    setScheduledDate("");
    setScheduledTime("");
    setPickupLocation("");
    setDropoffLocation("");
    setNotes("");
    setAttachments([]);
  };

  const today = new Date().toISOString().split("T")[0];
  const isGroup = serviceType === "Group" || passengerCount > 1;
  const showFlightField = locationType === "Airport";
  const showTrainField = locationType === "Train Station";
  const showShipField = locationType === "Port";

  // Step validation
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true; // Service type always has a default
      case 2:
        return passengerName.trim().length > 0;
      case 3:
        const hasTransportInfo = 
          (showFlightField && flightNumber.trim()) ||
          (showTrainField && trainNumber.trim()) ||
          (showShipField && shipName.trim()) ||
          locationType === "Address";
        return scheduledDate && scheduledTime && pickupLocation.trim() && hasTransportInfo;
      case 4:
        return true; // Documents are optional
      case 5:
        return true; // Review step
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < 5 && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Mission
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Step Progress */}
        <div className="border-b px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 shrink-0">
          <DialogHeader className="mb-4">
            <DialogTitle>Create New Mission</DialogTitle>
            <DialogDescription>
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].name}
            </DialogDescription>
          </DialogHeader>
          
          {/* Mobile: Simple progress bar */}
          <div className="sm:hidden">
            <div className="flex gap-1">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    currentStep >= step.id ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Desktop: Full step indicators */}
          <div className="hidden sm:flex items-center justify-between">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              
              return (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                        isCompleted && "bg-primary border-primary text-primary-foreground",
                        isCurrent && "border-primary text-primary",
                        !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground/50"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <StepIcon className="h-4 w-4" />
                      )}
                    </div>
                    <span className={cn(
                      "mt-1 text-[10px] font-medium whitespace-nowrap",
                      isCurrent ? "text-primary" : "text-muted-foreground"
                    )}>
                      {step.name}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={cn(
                      "mx-1 h-0.5 flex-1 min-w-2",
                      currentStep > step.id ? "bg-primary" : "bg-muted"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 max-h-[calc(90vh-220px)]">
          <div className="px-4 sm:px-6 py-4">
          {/* Step 1: Service Type */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="grid gap-2">
                <Label className="text-base font-semibold">Select Service Type</Label>
                <p className="text-sm text-muted-foreground">
                  Choose the type of assistance needed
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {(["Meet & Greet", "VIP", "Group", "Transfer", "Train Station", "Port"] as ServiceType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setServiceType(type)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all hover:border-primary/50",
                      serviceType === type ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      serviceType === type ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {SERVICE_ICONS[type]}
                    </div>
                    <div>
                      <p className="font-medium">{type}</p>
                      <p className="text-xs text-muted-foreground">
                        {SERVICE_DESCRIPTIONS[type]}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="agent">Assign Agent (Optional)</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign later or select now" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">
                      <span className="text-muted-foreground">Assign Later</span>
                    </SelectItem>
                    {availableAgents?.map((agent) => (
                      <SelectItem key={agent._id} value={agent._id}>
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-green-500" />
                          <span>{agent.name || agent.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: Passenger Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid gap-2">
                <Label className="text-base font-semibold">Passenger Information</Label>
                <p className="text-sm text-muted-foreground">
                  Enter the passenger or group details
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="passengerName">
                    {isGroup ? "Group Name / Primary Contact *" : "Passenger Name *"}
                  </Label>
                  <Input
                    id="passengerName"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    placeholder={isGroup ? "Smith Family Group" : "John Smith"}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="passengerPhone">Phone</Label>
                    <Input
                      id="passengerPhone"
                      type="tel"
                      value={passengerPhone}
                      onChange={(e) => setPassengerPhone(e.target.value)}
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="passengerEmail">Email</Label>
                    <Input
                      id="passengerEmail"
                      type="email"
                      value={passengerEmail}
                      onChange={(e) => setPassengerEmail(e.target.value)}
                      placeholder="passenger@email.com"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="passengerCount">Number of Passengers</Label>
                  <Input
                    id="passengerCount"
                    type="number"
                    min={1}
                    value={passengerCount}
                    onChange={(e) => setPassengerCount(parseInt(e.target.value) || 1)}
                  />
                </div>

                {isGroup && (
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-medium">Group Leader Contact</span>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="groupLeaderName">Name</Label>
                      <Input
                        id="groupLeaderName"
                        value={groupLeaderName}
                        onChange={(e) => setGroupLeaderName(e.target.value)}
                        placeholder="Tour Guide Name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="groupLeaderPhone">Phone</Label>
                        <Input
                          id="groupLeaderPhone"
                          type="tel"
                          value={groupLeaderPhone}
                          onChange={(e) => setGroupLeaderPhone(e.target.value)}
                          placeholder="+33 6 12 34 56 78"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="groupLeaderEmail">Email</Label>
                        <Input
                          id="groupLeaderEmail"
                          type="email"
                          value={groupLeaderEmail}
                          onChange={(e) => setGroupLeaderEmail(e.target.value)}
                          placeholder="guide@email.com"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Schedule & Location */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="grid gap-2">
                <Label className="text-base font-semibold">Schedule & Location</Label>
                <p className="text-sm text-muted-foreground">
                  Set the date, time, and pickup details
                </p>
              </div>

              <div className="space-y-4">
                {showFlightField && (
                  <div className="grid gap-2">
                    <Label htmlFor="flightNumber">Flight Number *</Label>
                    <Input
                      id="flightNumber"
                      value={flightNumber}
                      onChange={(e) => setFlightNumber(e.target.value)}
                      placeholder="AF1234"
                    />
                  </div>
                )}

                {showTrainField && (
                  <div className="grid gap-2">
                    <Label htmlFor="trainNumber">Train Number *</Label>
                    <Input
                      id="trainNumber"
                      value={trainNumber}
                      onChange={(e) => setTrainNumber(e.target.value)}
                      placeholder="TGV 6234"
                    />
                  </div>
                )}

                {showShipField && (
                  <div className="grid gap-2">
                    <Label htmlFor="shipName">Ship/Cruise Name *</Label>
                    <Input
                      id="shipName"
                      value={shipName}
                      onChange={(e) => setShipName(e.target.value)}
                      placeholder="MSC Fantasia"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="scheduledDate">Date *</Label>
                    <Input
                      id="scheduledDate"
                      type="date"
                      min={today}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="scheduledTime">Time *</Label>
                    <Input
                      id="scheduledTime"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="pickupLocation">Pickup Location *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="pickupLocation"
                      className="pl-9"
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      placeholder={
                        locationType === "Airport"
                          ? "Montpellier Airport Terminal 1"
                          : locationType === "Train Station"
                          ? "Gare Saint-Roch, Quai 3"
                          : locationType === "Port"
                          ? "Port de Sète, Terminal Croisières"
                          : "123 Rue de la République"
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dropoffLocation">Drop-off Location (Optional)</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="dropoffLocation"
                      className="pl-9"
                      value={dropoffLocation}
                      onChange={(e) => setDropoffLocation(e.target.value)}
                      placeholder="Hotel Marriott Montpellier"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Special Instructions</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Wheelchair assistance required, extra luggage, special requests..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Documents */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="grid gap-2">
                <Label className="text-base font-semibold">Documents (Optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Upload passenger manifests, tickets, vouchers, or other documents
                </p>
              </div>

              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8">
                <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-1">
                  Drag & drop files here
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  or click to browse
                </p>
                <Input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  className="max-w-xs"
                />
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Files ({attachments.length})</Label>
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs uppercase">
                          {file.name.split('.').pop()}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium truncate max-w-[200px]">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="grid gap-2">
                <Label className="text-base font-semibold">Review & Confirm</Label>
                <p className="text-sm text-muted-foreground">
                  Please review your mission details before creating
                </p>
              </div>

              <div className="space-y-4">
                {/* Service Summary */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      {SERVICE_ICONS[serviceType]}
                    </div>
                    <div>
                      <p className="font-semibold">{serviceType}</p>
                      <p className="text-sm text-muted-foreground">at {locationType}</p>
                    </div>
                  </div>
                  {selectedAgent && selectedAgent !== "unassigned" && (
                    <div className="flex items-center gap-2 text-sm">
                      <UserCheck className="h-4 w-4 text-green-500" />
                      <span>Agent assigned</span>
                    </div>
                  )}
                </div>

                {/* Passenger Summary */}
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Passenger</p>
                  <p className="font-semibold">{passengerName}</p>
                  {passengerCount > 1 && (
                    <p className="text-sm text-muted-foreground">{passengerCount} passengers</p>
                  )}
                  {passengerPhone && (
                    <p className="text-sm text-muted-foreground">{passengerPhone}</p>
                  )}
                </div>

                {/* Schedule Summary */}
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Schedule</p>
                  <div className="space-y-1">
                    {flightNumber && <p className="font-mono text-sm">Flight: {flightNumber}</p>}
                    {trainNumber && <p className="font-mono text-sm">Train: {trainNumber}</p>}
                    {shipName && <p className="font-mono text-sm">Ship: {shipName}</p>}
                    <p className="font-semibold">
                      {scheduledDate && new Date(`${scheduledDate}T${scheduledTime}`).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <div className="flex items-start gap-2 mt-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm">{pickupLocation}</p>
                        {dropoffLocation && (
                          <p className="text-sm text-muted-foreground">→ {dropoffLocation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attachments Summary */}
                {attachments.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Documents</p>
                    <p className="text-sm">{attachments.length} file(s) attached</p>
                  </div>
                )}

                {/* Price */}
                {priceCalculation?.price && (
                  <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-primary" />
                        <span className="font-medium">Estimated Price</span>
                      </div>
                      <span className="text-2xl font-bold text-primary">
                        €{(priceCalculation.price / 100).toFixed(2)}
                      </span>
                    </div>
                    {priceCalculation.breakdown && (
                      <div className="mt-3 pt-3 border-t space-y-1">
                        {Object.entries(priceCalculation.breakdown).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm text-muted-foreground">
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span>€{((value as number) / 100).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        </ScrollArea>

        {/* Footer with Navigation */}
        <div className="border-t px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 1 ? () => { setOpen(false); resetForm(); } : prevStep}
          >
            {currentStep === 1 ? (
              "Cancel"
            ) : (
              <>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </>
            )}
          </Button>
          
          {currentStep < 5 ? (
            <Button
              type="button"
              onClick={nextStep}
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !clientId}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadingFiles ? "Uploading..." : "Creating..."}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Create Mission
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
