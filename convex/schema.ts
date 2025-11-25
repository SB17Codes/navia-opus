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
    passengerName: v.string(),
    flightNumber: v.string(),
    scheduledAt: v.number(),
    pickupLocation: v.string(),
    dropoffLocation: v.optional(v.string()),
    serviceType: v.union(
      v.literal("Meet & Greet"),
      v.literal("VIP"),
      v.literal("Group")
    ),
    status: v.union(
      v.literal("Scheduled"),
      v.literal("Active"),
      v.literal("Arrived at Airport"),
      v.literal("Passenger Met"),
      v.literal("Luggage Collected"),
      v.literal("Complete"),
      v.literal("Cancelled")
    ),
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
});
