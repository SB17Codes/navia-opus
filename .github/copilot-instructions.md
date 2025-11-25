# Navia - AI Coding Instructions

## Project Overview
Navia is a real-time B2B passenger assistance PWA connecting Clients (Travel Agencies or direct customers) with local Passenger Assistants ("Agents/Greeters"). Single Next.js codebase serving both Client dashboard (desktop) and Agent mobile interface.

## Tech Stack
- **Framework:** Next.js 16 (App Router) with TypeScript
- **Backend:** Convex (real-time database + functions + HTTP actions)
- **Auth:** Clerk (multi-tenant, role-based)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Maps:** Mapbox GL JS (`react-map-gl/mapbox`)
- **Deployment:** Vercel + PWA
- **Package Manager:** pnpm 

## Architecture Decisions

### Route Structure (Critical)
```
app/
├── (auth)/           # Clerk auth pages
│   ├── sign-up/      # Role selection page
│   │   ├── client/   # Client signup flow
│   │   └── agent/    # Agent signup flow
│   └── onboarding/   # Post-signup onboarding
│       ├── client/   # Client profile setup
│       └── agent/    # Agent profile (pending approval)
├── dashboard/        # Client/Admin desktop view
│   ├── agents/       # Admin-only: Agent management
│   ├── missions/     # Mission management
│   └── settings/     # Settings
├── mobile/           # Agent PWA interface (role: Agent)
│   └── home/         # Agent landing after login
```

### User Roles & Redirection
- `Admin` - Platform admin (you) → `/dashboard` (full access, can see all agents/clients)
- `Client` - Agencies or direct customers → `/dashboard` (can create missions, assign agents)
- `Agent` - Greeters/Field workers → `/mobile/home` (sees missions assigned to them)

### Agent Assignment Flow
1. Agent signs up at `/sign-up/agent`
2. Agent completes onboarding (enters phone number)
3. Agent is immediately available for mission assignments
4. **Admin or Client** assigns agent to a **specific mission** (not to a client permanently)
5. Agent sees assigned missions in their mobile app

**Note:** Agents are assigned **per mission**, not permanently to a client. Any available agent can be assigned to any mission.

### Data Entities (Convex Schema)
| Table | Purpose |
|-------|---------|
| `users` | Synced from Clerk (`clerkId`, `role`, `email`, `name`, `companyName`, `phone`, `onboardingComplete`) |
| `missions` | Core work unit (`clientId`, `agentId`, `passengerName`, `flightInfo`, `status`, `scheduledAt`) |
| `locationLogs` | Ephemeral GPS trail (`missionId`, `lat`, `lng`, `timestamp`) |
| `missionEvents` | Audit trail (`missionId`, `eventType`, `photoStorageId`, `timestamp`) |

### Mission Status Flow
`Scheduled` → `Active` → `Arrived at Airport` → `Passenger Met` → `Luggage Collected` → `Complete`

## Key Patterns

### Real-Time Updates (Convex)
- Use Convex subscriptions for live dashboard updates (<500ms latency)
- Location updates: Only send if moved >20m OR 30s elapsed (prevent write explosions)
- GPS tracking starts when mission is `Active`, stops on `Complete`/`Cancelled`

### PWA Requirements
- Must pass Lighthouse PWA audit
- Implement `manifest.json` with proper icons
- Use `navigator.wakeLock` during active missions
- Handle offline gracefully (queue updates or show "No Connection")

### Multi-Tenancy (Critical Security)
- Agencies must NEVER see other agencies' data
- Enforce via Convex auth rules on all queries/mutations
- Agent location stops recording immediately on mission completion

### Mobile-First for Agent Interface
- Support iOS Safari 16+ and Android Chrome
- No horizontal scroll on iPhone SE/Pixel A-series
- "One-Tap" actions for status updates and calls

## Conventions

### File Naming
- Components: `PascalCase.tsx`
- Convex functions: `camelCase.ts` in `convex/` directory
- Middleware: `proxy.ts` at root (NOT `middleware.ts`)
- Use `@/` path alias for imports

### Component Patterns
- Server Components by default
- `"use client"` only for interactivity (maps, forms, geolocation)
- Use shadcn/ui components from `@/components/ui/`
- Custom components in `@/components/` (PascalCase)
- Colocate component-specific styles

### Browser APIs (No Native Code)
- GPS: `navigator.geolocation`
- Screen wake: `navigator.wakeLock`
- Accept tracking pause when app backgrounded

## Commands
```bash
pnpm dev              # Start Next.js dev server (localhost:3000)
pnpm build            # Production build
pnpm lint             # ESLint check
npx convex dev        # Start Convex dev (run in separate terminal)
npx convex deploy     # Deploy Convex to production
pnpx shadcn@latest add <component>  # Add shadcn/ui component
```

## Not Yet Implemented
- Clerk environment variables (add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env.local`)
- Mapbox token (`NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local`)
- PWA manifest and service worker

## File Storage (Photos)
- Use Convex file storage for agent photo uploads
- Store `storageId` in `missionEvents.photoStorageId`
- Generate URLs via `ctx.storage.getUrl(storageId)` in queries
