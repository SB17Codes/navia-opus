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

// Get all active rate cards (platform defaults)
export const getDefaultRates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("rateCards")
      .withIndex("by_client", (q) => q.eq("clientId", undefined))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get rate cards for a specific client (includes their custom rates)
export const getByClient = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rateCards")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get all rate cards (for admin)
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("rateCards").collect();
  },
});

// Get rate for a specific service type and location
export const getRateForService = query({
  args: {
    serviceType: serviceTypes,
    locationType: locationTypes,
    clientId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // First try to find a client-specific rate
    if (args.clientId) {
      const clientRate = await ctx.db
        .query("rateCards")
        .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
        .filter((q) =>
          q.and(
            q.eq(q.field("serviceType"), args.serviceType),
            q.eq(q.field("locationType"), args.locationType),
            q.eq(q.field("isActive"), true)
          )
        )
        .first();

      if (clientRate) return clientRate;
    }

    // Fall back to platform default
    return await ctx.db
      .query("rateCards")
      .withIndex("by_client", (q) => q.eq("clientId", undefined))
      .filter((q) =>
        q.and(
          q.eq(q.field("serviceType"), args.serviceType),
          q.eq(q.field("locationType"), args.locationType),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();
  },
});

// Calculate price for a mission
export const calculatePrice = query({
  args: {
    serviceType: serviceTypes,
    locationType: locationTypes,
    passengerCount: v.optional(v.number()),
    distanceKm: v.optional(v.number()),
    scheduledAt: v.number(), // To check for night/weekend surcharges
    clientId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Get the applicable rate card
    let rateCard = null;

    if (args.clientId) {
      rateCard = await ctx.db
        .query("rateCards")
        .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
        .filter((q) =>
          q.and(
            q.eq(q.field("serviceType"), args.serviceType),
            q.eq(q.field("locationType"), args.locationType),
            q.eq(q.field("isActive"), true)
          )
        )
        .first();
    }

    if (!rateCard) {
      rateCard = await ctx.db
        .query("rateCards")
        .withIndex("by_client", (q) => q.eq("clientId", undefined))
        .filter((q) =>
          q.and(
            q.eq(q.field("serviceType"), args.serviceType),
            q.eq(q.field("locationType"), args.locationType),
            q.eq(q.field("isActive"), true)
          )
        )
        .first();
    }

    if (!rateCard) {
      return {
        price: null,
        breakdown: null,
        message: "No rate card found for this service configuration",
      };
    }

    // Calculate base price
    let price = rateCard.basePrice;
    const breakdown: Record<string, number> = {
      base: rateCard.basePrice,
    };

    // Add per-passenger price for groups
    const passengerCount = args.passengerCount ?? 1;
    if (rateCard.perPassengerPrice && passengerCount > 1) {
      const additionalPassengers = passengerCount - 1;
      const passengerCharge = rateCard.perPassengerPrice * additionalPassengers;
      price += passengerCharge;
      breakdown.additionalPassengers = passengerCharge;
    }

    // Add distance-based pricing for transfers
    if (rateCard.perKmPrice && args.distanceKm) {
      const distanceCharge = rateCard.perKmPrice * args.distanceKm;
      price += distanceCharge;
      breakdown.distance = distanceCharge;
    }

    // Check for surcharges based on scheduled time
    const scheduledDate = new Date(args.scheduledAt);
    const hour = scheduledDate.getHours();
    const dayOfWeek = scheduledDate.getDay();

    // Night surcharge (10pm - 6am)
    if (rateCard.nightSurchargePercent && (hour >= 22 || hour < 6)) {
      const surcharge = Math.round(price * (rateCard.nightSurchargePercent / 100));
      price += surcharge;
      breakdown.nightSurcharge = surcharge;
    }

    // Weekend surcharge (Saturday = 6, Sunday = 0)
    if (rateCard.weekendSurchargePercent && (dayOfWeek === 0 || dayOfWeek === 6)) {
      const surcharge = Math.round(price * (rateCard.weekendSurchargePercent / 100));
      price += surcharge;
      breakdown.weekendSurcharge = surcharge;
    }

    // Apply minimum price
    if (rateCard.minimumPrice && price < rateCard.minimumPrice) {
      price = rateCard.minimumPrice;
      breakdown.minimumApplied = rateCard.minimumPrice;
    }

    return {
      price,
      breakdown,
      rateCardId: rateCard._id,
      rateCardName: rateCard.name,
      currency: "EUR",
    };
  },
});

// Create a new rate card (Admin only)
export const create = mutation({
  args: {
    clientId: v.optional(v.id("users")),
    name: v.string(),
    description: v.optional(v.string()),
    serviceType: serviceTypes,
    locationType: locationTypes,
    basePrice: v.number(),
    perPassengerPrice: v.optional(v.number()),
    perKmPrice: v.optional(v.number()),
    minimumPrice: v.optional(v.number()),
    nightSurchargePercent: v.optional(v.number()),
    weekendSurchargePercent: v.optional(v.number()),
    holidaySurchargePercent: v.optional(v.number()),
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("rateCards", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a rate card
export const update = mutation({
  args: {
    rateCardId: v.id("rateCards"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    basePrice: v.optional(v.number()),
    perPassengerPrice: v.optional(v.number()),
    perKmPrice: v.optional(v.number()),
    minimumPrice: v.optional(v.number()),
    nightSurchargePercent: v.optional(v.number()),
    weekendSurchargePercent: v.optional(v.number()),
    holidaySurchargePercent: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { rateCardId, ...updates } = args;

    const existing = await ctx.db.get(rateCardId);
    if (!existing) throw new Error("Rate card not found");

    return await ctx.db.patch(rateCardId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete a rate card
export const remove = mutation({
  args: { rateCardId: v.id("rateCards") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.rateCardId);
  },
});

// Seed default rate cards (run once for initial setup)
export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const defaultRates = [
      // Airport services
      {
        name: "Airport Meet & Greet",
        description: "Standard airport welcome service",
        serviceType: "Meet & Greet" as const,
        locationType: "Airport" as const,
        basePrice: 5500, // €55.00
        perPassengerPrice: 1000, // €10.00 per additional passenger
        nightSurchargePercent: 20,
        weekendSurchargePercent: 10,
      },
      {
        name: "Airport VIP",
        description: "Premium VIP airport service with lounge access",
        serviceType: "VIP" as const,
        locationType: "Airport" as const,
        basePrice: 15000, // €150.00
        perPassengerPrice: 3000, // €30.00 per additional passenger
        nightSurchargePercent: 25,
        weekendSurchargePercent: 15,
      },
      {
        name: "Airport Group",
        description: "Group assistance at airport",
        serviceType: "Group" as const,
        locationType: "Airport" as const,
        basePrice: 8000, // €80.00 base
        perPassengerPrice: 800, // €8.00 per passenger
        minimumPrice: 8000,
        nightSurchargePercent: 20,
        weekendSurchargePercent: 10,
      },
      // Train station services
      {
        name: "Train Station Assistance",
        description: "Meet & greet at train station",
        serviceType: "Train Station" as const,
        locationType: "Train Station" as const,
        basePrice: 4500, // €45.00
        perPassengerPrice: 800,
        nightSurchargePercent: 20,
        weekendSurchargePercent: 10,
      },
      // Port services
      {
        name: "Port/Cruise Assistance",
        description: "Welcome service at cruise port",
        serviceType: "Port" as const,
        locationType: "Port" as const,
        basePrice: 6000, // €60.00
        perPassengerPrice: 1000,
        nightSurchargePercent: 20,
        weekendSurchargePercent: 10,
      },
      // Transfer services
      {
        name: "Standard Transfer",
        description: "Vehicle transfer service",
        serviceType: "Transfer" as const,
        locationType: "Address" as const,
        basePrice: 4000, // €40.00 base
        perKmPrice: 200, // €2.00 per km
        minimumPrice: 4000,
        nightSurchargePercent: 25,
        weekendSurchargePercent: 15,
      },
    ];

    for (const rate of defaultRates) {
      await ctx.db.insert("rateCards", {
        ...rate,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { created: defaultRates.length };
  },
});
