import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

export const createOrUpdate = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("Admin"), v.literal("Client"), v.literal("Agent")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      role: args.role,
      onboardingComplete: false,
      createdAt: Date.now(),
    });
  },
});

// Client onboarding completion
export const completeClientOnboarding = mutation({
  args: {
    clerkId: v.string(),
    companyName: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      // Create new user if doesn't exist (backup for webhook timing)
      return await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: "",
        name: args.companyName,
        role: "Client",
        companyName: args.companyName,
        phone: args.phone,
        onboardingComplete: true,
        createdAt: Date.now(),
      });
    }

    await ctx.db.patch(user._id, {
      companyName: args.companyName,
      phone: args.phone,
      onboardingComplete: true,
    });

    return user._id;
  },
});

// Agent onboarding completion
export const completeAgentOnboarding = mutation({
  args: {
    clerkId: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      // Create new user if doesn't exist (backup for webhook timing)
      return await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: "",
        name: "",
        role: "Agent",
        phone: args.phone,
        onboardingComplete: true,
        createdAt: Date.now(),
      });
    }

    await ctx.db.patch(user._id, {
      phone: args.phone,
      onboardingComplete: true,
    });

    return user._id;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

export const getAgents = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "Agent"))
      .collect();
  },
});

// Get available agents (completed onboarding)
export const getAvailableAgents = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "Agent"))
      .collect();

    return agents.filter((agent) => agent.onboardingComplete);
  },
});

// Get all clients (for Admin)
export const getClients = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "Client"))
      .collect();
  },
});

// Get all users (for Admin)
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Get pending agents (agents who haven't completed onboarding)
export const getPendingAgents = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "Agent"))
      .collect();

    return agents.filter((agent) => !agent.onboardingComplete);
  },
});
