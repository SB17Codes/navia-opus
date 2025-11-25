import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get missions for a client (with multi-tenancy enforcement)
export const getByClient = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("missions")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .collect();
  },
});

// Get missions assigned to an agent
export const getByAgent = query({
  args: { agentId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("missions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .collect();
  },
});

// Get a single mission by ID
export const getById = query({
  args: { missionId: v.id("missions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.missionId);
  },
});

// Create a new mission
export const create = mutation({
  args: {
    clientId: v.id("users"),
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
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("missions", {
      ...args,
      status: "Scheduled",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update mission status
export const updateStatus = mutation({
  args: {
    missionId: v.id("missions"),
    status: v.union(
      v.literal("Scheduled"),
      v.literal("Active"),
      v.literal("Arrived at Airport"),
      v.literal("Passenger Met"),
      v.literal("Luggage Collected"),
      v.literal("Complete"),
      v.literal("Cancelled")
    ),
    agentId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission) throw new Error("Mission not found");

    const previousStatus = mission.status;

    await ctx.db.patch(args.missionId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    // Log the status change event
    await ctx.db.insert("missionEvents", {
      missionId: args.missionId,
      agentId: args.agentId,
      eventType: "StatusChange",
      previousStatus,
      newStatus: args.status,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// Assign agent to mission
export const assignAgent = mutation({
  args: {
    missionId: v.id("missions"),
    agentId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.missionId, {
      agentId: args.agentId,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

// Get active missions (for map view)
export const getActiveMissions = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    const activeMissions = await ctx.db
      .query("missions")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "Scheduled"),
          q.neq(q.field("status"), "Complete"),
          q.neq(q.field("status"), "Cancelled")
        )
      )
      .collect();

    // Get latest location for each active mission
    const missionsWithLocation = await Promise.all(
      activeMissions.map(async (mission) => {
        const latestLocation = await ctx.db
          .query("locationLogs")
          .withIndex("by_mission", (q) => q.eq("missionId", mission._id))
          .order("desc")
          .first();

        return {
          ...mission,
          lastLocation: latestLocation,
        };
      })
    );

    return missionsWithLocation;
  },
});
