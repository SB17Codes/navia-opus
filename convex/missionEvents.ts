import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all events for a mission (audit trail)
export const getByMission = query({
  args: { missionId: v.id("missions") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("missionEvents")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .order("asc")
      .collect();

    // Generate photo URLs for events with photos
    return Promise.all(
      events.map(async (event) => ({
        ...event,
        photoUrl: event.photoStorageId
          ? await ctx.storage.getUrl(event.photoStorageId)
          : null,
      }))
    );
  },
});

// Upload photo for a mission
export const uploadPhoto = mutation({
  args: {
    missionId: v.id("missions"),
    agentId: v.id("users"),
    storageId: v.id("_storage"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("missionEvents", {
      missionId: args.missionId,
      agentId: args.agentId,
      eventType: "PhotoUploaded",
      photoStorageId: args.storageId,
      note: args.note,
      timestamp: Date.now(),
    });
  },
});

// Add a note to a mission
export const addNote = mutation({
  args: {
    missionId: v.id("missions"),
    agentId: v.id("users"),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("missionEvents", {
      missionId: args.missionId,
      agentId: args.agentId,
      eventType: "Note",
      note: args.note,
      timestamp: Date.now(),
    });
  },
});

// Generate upload URL for photo
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
