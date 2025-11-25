import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("Admin"), v.literal("Client"), v.literal("Agent")),
    // For Clients: company info
    companyName: v.optional(v.string()),
    phone: v.optional(v.string()),
    // Onboarding status
    onboardingComplete: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_role", ["role"]),

  missions: defineTable({
    clientId: v.id("users"),
    agentId: v.optional(v.id("users")),
    
    // Passenger info
    passengerName: v.string(),
    passengerPhone: v.optional(v.string()),
    passengerEmail: v.optional(v.string()),
    passengerCount: v.optional(v.number()), // For groups
    
    // Group leader info (when passengerCount > 1)
    groupLeaderName: v.optional(v.string()),
    groupLeaderPhone: v.optional(v.string()),
    groupLeaderEmail: v.optional(v.string()),
    
    // Transport info (flexible for different service types)
    flightNumber: v.optional(v.string()),
    trainNumber: v.optional(v.string()),
    shipName: v.optional(v.string()),
    
    // Locations
    scheduledAt: v.number(),
    pickupLocation: v.string(),
    dropoffLocation: v.optional(v.string()),
    
    // Service configuration
    serviceType: v.union(
      v.literal("Meet & Greet"),
      v.literal("VIP"),
      v.literal("Group"),
      v.literal("Transfer"),
      v.literal("Train Station"),
      v.literal("Port")
    ),
    locationType: v.union(
      v.literal("Airport"),
      v.literal("Train Station"),
      v.literal("Port"),
      v.literal("Address")
    ),
    
    // Status tracking
    status: v.union(
      v.literal("Scheduled"),
      v.literal("Active"),
      v.literal("Arrived at Airport"),
      v.literal("Arrived at Station"),
      v.literal("Arrived at Port"),
      v.literal("Passenger Met"),
      v.literal("Luggage Collected"),
      v.literal("In Transit"),
      v.literal("Complete"),
      v.literal("Cancelled")
    ),
    
    // Pricing
    quotedPrice: v.optional(v.number()), // In cents (EUR)
    currency: v.optional(v.string()), // Default EUR
    
    // Documents (storage IDs for manifests, tickets, etc.)
    attachments: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      fileName: v.string(),
      fileType: v.string(),
      uploadedAt: v.number(),
    }))),
    
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_agent", ["agentId"])
    .index("by_status", ["status"])
    .index("by_scheduled", ["scheduledAt"]),

  locationLogs: defineTable({
    missionId: v.id("missions"),
    agentId: v.id("users"),
    lat: v.number(),
    lng: v.number(),
    timestamp: v.number(),
  })
    .index("by_mission", ["missionId"])
    .index("by_agent", ["agentId"]),

  missionEvents: defineTable({
    missionId: v.id("missions"),
    agentId: v.id("users"),
    eventType: v.union(
      v.literal("StatusChange"),
      v.literal("PhotoUploaded"),
      v.literal("Note")
    ),
    previousStatus: v.optional(v.string()),
    newStatus: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    note: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_mission", ["missionId"]),

  // Rate cards for instant pricing
  rateCards: defineTable({
    // Who this rate card belongs to (null = platform default)
    clientId: v.optional(v.id("users")),
    
    name: v.string(), // e.g., "Standard Airport", "Premium VIP"
    description: v.optional(v.string()),
    
    // Service configuration this rate applies to
    serviceType: v.union(
      v.literal("Meet & Greet"),
      v.literal("VIP"),
      v.literal("Group"),
      v.literal("Transfer"),
      v.literal("Train Station"),
      v.literal("Port")
    ),
    locationType: v.union(
      v.literal("Airport"),
      v.literal("Train Station"),
      v.literal("Port"),
      v.literal("Address")
    ),
    
    // Pricing (in cents EUR)
    basePrice: v.number(), // Base price for the service
    perPassengerPrice: v.optional(v.number()), // Additional per passenger (for groups)
    perKmPrice: v.optional(v.number()), // For transfers
    minimumPrice: v.optional(v.number()), // Floor price
    
    // Surcharges
    nightSurchargePercent: v.optional(v.number()), // e.g., 20 for 20%
    weekendSurchargePercent: v.optional(v.number()),
    holidaySurchargePercent: v.optional(v.number()),
    
    // Configuration
    isActive: v.boolean(),
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_service_type", ["serviceType"])
    .index("by_active", ["isActive"]),
});
