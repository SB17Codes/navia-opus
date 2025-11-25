import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Log a new location update (with throttling logic on client side)
export const logLocation = mutation({
  args: {
    missionId: v.id("missions"),
    agentId: v.id("users"),
    lat: v.number(),
    lng: v.number(),
  },
  handler: async (ctx, args) => {
    // Verify mission is active
    const mission = await ctx.db.get(args.missionId);
    if (!mission) throw new Error("Mission not found");

    const activeStatuses = [
      "Active",
      "Arrived at Airport",
      "Passenger Met",
      "Luggage Collected",
    ];

    if (!activeStatuses.includes(mission.status)) {
      throw new Error("Cannot log location for non-active mission");
    }

    return await ctx.db.insert("locationLogs", {
      missionId: args.missionId,
      agentId: args.agentId,
      lat: args.lat,
      lng: args.lng,
      timestamp: Date.now(),
    });
  },
});

// Get location history for a mission
export const getByMission = query({
  args: { missionId: v.id("missions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("locationLogs")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .order("asc")
      .collect();
  },
});

// Get latest location for a mission
export const getLatest = query({
  args: { missionId: v.id("missions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("locationLogs")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .order("desc")
      .first();
  },
});
