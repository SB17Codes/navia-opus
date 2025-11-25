# Navia MVP → Startup Development Plan

## Executive Summary
Transform the functional MVP into a production-ready startup through 5 phases: MVP completion, security hardening, core business features, scale/monetization, and growth features. Timeline: ~10-12 weeks to launch-ready, ongoing iteration after.

---

## Current State Analysis

### Implemented Features ✅
- **Authentication**: Clerk with role-based signup (Client/Agent), onboarding flows
- **Client Dashboard**: Live map (Mapbox), stats cards, mission table, create mission dialog, agents list
- **Agent Mobile**: Mission list, detail page with status progression, photo upload, GPS tracking, wake lock
- **Backend (Convex)**: 4 tables (users, missions, locationLogs, missionEvents), real-time queries, file storage

### Tech Stack
| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Backend/DB | Convex (real-time database + serverless functions) |
| Auth | Clerk (multi-tenant, role-based) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Maps | Mapbox GL JS via react-map-gl |
| Deployment | Vercel (planned) |

### Critical Gaps 🔴
- No agent assignment UI in mission creation
- No mission detail page for clients
- No PWA manifest/service worker
- Missing error handling & toasts
- No server-side auth validation in Convex queries
- No tests, monitoring, or logging

---

## Phase 1: MVP Completion (Week 1-2)
**Goal:** Make the app fully usable end-to-end

| Priority | Task | Files/Areas |
|----------|------|-------------|
| P0 | Agent assignment in mission creation - Add agent dropdown | `components/dashboard/CreateMissionDialog.tsx`, `convex/missions.ts` |
| P0 | Mission detail page for clients - View progress, agent location, activity log | New: `app/dashboard/missions/[id]/page.tsx` |
| P0 | Mission editing/cancellation - Allow clients to modify or cancel | `convex/missions.ts`, new edit dialog |
| P0 | PWA manifest & service worker - Installable app with offline notice | `public/manifest.json`, `app/manifest.ts` |
| P1 | Error handling with toasts - User feedback for all actions | Add sonner/toast, wrap mutations |
| P1 | Loading skeletons - Better UX during data fetches | All pages using `useQuery` |
| P1 | Form validation - Zod schemas for all inputs | `lib/validations.ts` |

### Deliverables
- [ ] Clients can assign agents when creating missions
- [ ] Clients can view real-time mission progress on a detail page
- [ ] App is installable as PWA on mobile
- [ ] All user actions show success/error feedback

---

## Phase 2: Security & Stability (Week 3)
**Goal:** Production-ready auth, data isolation, error handling

| Priority | Task | Files/Areas |
|----------|------|-------------|
| P0 | Server-side auth in Convex - Validate identity in ALL queries/mutations | All files in `convex/` |
| P0 | Multi-tenant data isolation - Clients ONLY see their missions | `convex/missions.ts`, `convex/users.ts` |
| P0 | Webhook signature verification - Verify Svix signatures | `convex/http.ts` |
| P1 | React error boundaries - Graceful error handling | `app/error.tsx`, component-level |
| P1 | Input sanitization - Server-side validation | Convex validators |
| P1 | Rate limiting for location logs - Prevent abuse | `convex/locationLogs.ts` |

### Security Pattern Example
```typescript
// BEFORE (insecure - trusts client-provided ID):
export const getByClient = query({
  args: { clientId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.query("missions")
      .withIndex("by_client", q => q.eq("clientId", args.clientId))
      .collect();
  },
});

// AFTER (secure - derives ID from authenticated user):
export const getByClient = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    
    const user = await ctx.db.query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .unique();
    if (!user || user.role !== "Client") throw new Error("Unauthorized");
    
    return await ctx.db.query("missions")
      .withIndex("by_client", q => q.eq("clientId", user._id))
      .collect();
  },
});
```

### Deliverables
- [ ] All Convex functions validate authentication
- [ ] Clients cannot access other clients' data
- [ ] Agents only see missions assigned to them
- [ ] Webhook signatures are verified

---

## Phase 3: Core Business Features (Week 4-6)
**Goal:** Features clients actually pay for

| Priority | Task | Description |
|----------|------|-------------|
| P0 | Push notifications | Mission updates, agent arrival (Web Push API + Convex scheduled functions) |
| P0 | Email notifications | Mission confirmation, completion summary (Resend/SendGrid) |
| P1 | Search & filtering | Find missions by passenger, flight, date, status |
| P1 | Basic reporting | Weekly/monthly stats, CSV export |
| P1 | Agent calendar/availability | Schedule view for agents |
| P2 | In-app messaging | Client ↔ Agent chat per mission |
| P2 | Flight API integration | Auto-fetch flight status (FlightAware/AeroDataBox) |

### Notifications Schema Addition
```typescript
// convex/schema.ts - add notifications table
notifications: defineTable({
  userId: v.id("users"),
  type: v.union(
    v.literal("MissionAssigned"),
    v.literal("MissionStarted"),
    v.literal("AgentArrived"),
    v.literal("MissionComplete")
  ),
  missionId: v.optional(v.id("missions")),
  title: v.string(),
  body: v.string(),
  read: v.boolean(),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_unread", ["userId", "read"]),
```

### Deliverables
- [ ] Agents receive push notification when assigned to mission
- [ ] Clients receive email when mission is completed
- [ ] Mission table has search and filters
- [ ] Basic reports page with charts

---

## Phase 4: Scale & Monetization (Week 7-9)
**Goal:** Revenue generation, handle growth

| Priority | Task | Description |
|----------|------|-------------|
| P0 | Billing & subscriptions | Stripe integration (per-mission or monthly) |
| P0 | Client onboarding improvements | Company verification, terms acceptance |
| P1 | Data retention & archival | Auto-archive old location logs (Convex scheduled functions) |
| P1 | Performance monitoring | Error tracking, metrics (Sentry, Vercel Analytics) |
| P1 | Admin dashboard | Platform-wide stats, user management |
| P2 | API for integrations | Allow clients to integrate via API |

### Pricing Model Options
| Model | Description | Best For |
|-------|-------------|----------|
| Per-mission | $2-5 per completed mission | Low-volume clients, easy to explain |
| Monthly tiers | $49/99/199 for X missions/month | Predictable revenue, high-volume clients |
| Hybrid | Base fee + per-mission overage | Balance of both |

### Stripe Integration Schema
```typescript
// convex/schema.ts - add billing tables
subscriptions: defineTable({
  clientId: v.id("users"),
  stripeCustomerId: v.string(),
  stripeSubscriptionId: v.optional(v.string()),
  plan: v.union(v.literal("free"), v.literal("starter"), v.literal("pro")),
  missionsIncluded: v.number(),
  missionsUsed: v.number(),
  currentPeriodStart: v.number(),
  currentPeriodEnd: v.number(),
})
  .index("by_client", ["clientId"])
  .index("by_stripe_customer", ["stripeCustomerId"]),
```

### Deliverables
- [ ] Clients can subscribe and pay via Stripe
- [ ] Usage tracking and billing enforcement
- [ ] Admin can view platform metrics
- [ ] Old data is automatically archived

---

## Phase 5: Growth Features (Week 10+)
**Goal:** Competitive advantages, market expansion

| Priority | Task | Description |
|----------|------|-------------|
| P1 | Multi-language (i18n) | French, Arabic, Spanish (next-intl) |
| P1 | Agent ratings & reviews | Client feedback system |
| P1 | Advanced analytics | Charts, trends, predictions (Recharts) |
| P2 | Native mobile apps | React Native for iOS/Android |
| P2 | White-label solution | Custom branding per client |
| P2 | B2B API marketplace | Integration with travel booking systems |

### i18n Structure
```
messages/
├── en.json
├── fr.json
├── ar.json
└── es.json
```

### Deliverables
- [ ] App available in 4 languages
- [ ] Clients can rate agents after missions
- [ ] Rich analytics dashboard
- [ ] Native apps in App Store / Play Store (stretch)

---

## Technical Considerations

### Testing Strategy
| Type | Tool | Focus Areas |
|------|------|-------------|
| Unit | Vitest | Convex functions, utilities |
| Integration | Vitest + Convex test utils | API flows, data isolation |
| E2E | Playwright | Critical user journeys |
| Visual | Chromatic | UI component consistency |

### Monitoring & Observability
- **Error tracking**: Sentry
- **Analytics**: Vercel Analytics, PostHog
- **Performance**: Vercel Speed Insights
- **Uptime**: Better Stack or similar

### Data Retention Policy
| Table | Retention | Action |
|-------|-----------|--------|
| locationLogs | 30 days | Archive to cold storage, delete from Convex |
| missionEvents | 90 days | Keep photos 1 year, delete metadata |
| missions | Indefinite | Archive completed > 1 year old |

---

## Deployment Checklist

### Pre-Launch
- [ ] Environment variables configured in Vercel
- [ ] Convex production deployment
- [ ] Clerk production instance
- [ ] Mapbox production token
- [ ] Custom domain configured
- [ ] SSL certificate (automatic with Vercel)
- [ ] PWA icons and manifest finalized

### Launch Day
- [ ] Database backup strategy
- [ ] Rollback plan documented
- [ ] Support channel ready (email, chat)
- [ ] Analytics tracking verified

### Post-Launch
- [ ] Monitor error rates
- [ ] Collect user feedback
- [ ] Weekly iteration cycles

---

## Questions to Resolve

1. **Pricing**: Per-mission vs subscription vs hybrid?
2. **Agent onboarding**: Should there be an approval step before agents can receive missions?
3. **Multi-tenancy**: Should clients be able to invite team members to their organization?
4. **Agent exclusivity**: Can agents work for multiple clients simultaneously?
5. **Geographic scope**: Starting in one city/country or globally?
6. **Compliance**: GDPR requirements for location data?

---

## Next Steps

1. **Immediate**: Implement Phase 1 (agent assignment, mission detail page, PWA)
2. **This week**: Security audit and fix Convex auth
3. **Next week**: Push notifications and email setup
4. **Pilot program**: Find 1-2 travel agencies for beta testing
