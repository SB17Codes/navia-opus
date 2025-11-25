import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Service and location types for validation
const serviceTypes = v.union(
  v.literal("Meet & Greet"),
  v.literal("VIP"),
  v.literal("Group"),
  v.literal("Transfer"),
  v.literal("Train Station"),
  v.literal("Port")
);

const locationTypes = v.union(
  v.literal("Airport"),
  v.literal("Train Station"),
  v.literal("Port"),
  v.literal("Address")
);

const statusTypes = v.union(
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
);

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
    agentId: v.optional(v.id("users")),
    
    // Passenger info
    passengerName: v.string(),
    passengerPhone: v.optional(v.string()),
    passengerEmail: v.optional(v.string()),
    passengerCount: v.optional(v.number()),
    
    // Group leader (for groups)
    groupLeaderName: v.optional(v.string()),
    groupLeaderPhone: v.optional(v.string()),
    groupLeaderEmail: v.optional(v.string()),
    
    // Transport info
    flightNumber: v.optional(v.string()),
    trainNumber: v.optional(v.string()),
    shipName: v.optional(v.string()),
    
    // Schedule & locations
    scheduledAt: v.number(),
    pickupLocation: v.string(),
    dropoffLocation: v.optional(v.string()),
    
    // Service config
    serviceType: serviceTypes,
    locationType: locationTypes,
    
    // Pricing
    quotedPrice: v.optional(v.number()),
    currency: v.optional(v.string()),
    
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
    status: statusTypes,
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

// Generate upload URL for mission attachments
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Add attachment to mission
export const addAttachment = mutation({
  args: {
    missionId: v.id("missions"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
  },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission) throw new Error("Mission not found");

    const newAttachment = {
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      uploadedAt: Date.now(),
    };

    const currentAttachments = mission.attachments || [];
    
    await ctx.db.patch(args.missionId, {
      attachments: [...currentAttachments, newAttachment],
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Remove attachment from mission
export const removeAttachment = mutation({
  args: {
    missionId: v.id("missions"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission) throw new Error("Mission not found");

    const currentAttachments = mission.attachments || [];
    const filteredAttachments = currentAttachments.filter(
      (a) => a.storageId !== args.storageId
    );

    // Delete the file from storage
    await ctx.storage.delete(args.storageId);

    await ctx.db.patch(args.missionId, {
      attachments: filteredAttachments,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get attachment URLs for a mission
export const getAttachmentUrls = query({
  args: { missionId: v.id("missions") },
  handler: async (ctx, args) => {
    const mission = await ctx.db.get(args.missionId);
    if (!mission) return [];

    const attachments = mission.attachments || [];
    
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (attachment) => ({
        ...attachment,
        url: await ctx.storage.getUrl(attachment.storageId),
      }))
    );

    return attachmentsWithUrls;
  },
});
