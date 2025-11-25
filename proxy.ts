import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up",
  "/sign-up/client(.*)",
  "/sign-up/agent(.*)",
]);

const isAuthRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up",
  "/sign-up/client(.*)",
  "/sign-up/agent(.*)",
]);

const isOnboardingRoute = createRouteMatcher([
  "/onboarding/client",
  "/onboarding/agent",
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId, sessionClaims } = await auth();
  const metadata = sessionClaims?.unsafeMetadata as { 
    role?: string; 
    onboardingComplete?: boolean;
  } | undefined;
  const role = metadata?.role;
  const onboardingComplete = metadata?.onboardingComplete;

  // If user is signed in and trying to access auth pages, redirect them away
  if (userId && isAuthRoute(request)) {
    // Check if they need onboarding first
    if (!onboardingComplete) {
      if (role === "Agent") {
        return NextResponse.redirect(new URL("/onboarding/agent", request.url));
      } else if (role === "Client") {
        return NextResponse.redirect(new URL("/onboarding/client", request.url));
      }
    }

    // Already onboarded, redirect to appropriate dashboard
    if (role === "Agent") {
      return NextResponse.redirect(new URL("/mobile/home", request.url));
    } else {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Allow onboarding routes for authenticated users who haven't completed onboarding
  if (userId && isOnboardingRoute(request)) {
    // If already onboarded, redirect away from onboarding
    if (onboardingComplete) {
      if (role === "Agent") {
        return NextResponse.redirect(new URL("/mobile/home", request.url));
      } else {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  // Protect non-public routes (except onboarding which we handled above)
  if (!isPublicRoute(request) && !isOnboardingRoute(request)) {
    await auth.protect();
  }

  // Role-based redirects from home page for authenticated users
  if (userId && request.nextUrl.pathname === "/") {
    // Check onboarding first
    if (!onboardingComplete && role) {
      if (role === "Agent") {
        return NextResponse.redirect(new URL("/onboarding/agent", request.url));
      } else if (role === "Client") {
        return NextResponse.redirect(new URL("/onboarding/client", request.url));
      }
    }

    // Onboarded users go to their dashboard
    if (role === "Agent") {
      return NextResponse.redirect(new URL("/mobile/home", request.url));
    } else if (role === "Client" || role === "Admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
