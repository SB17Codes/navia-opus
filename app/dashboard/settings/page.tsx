"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function SettingsPage() {
  const { user } = useUser();
  const convexUser = useQuery(
    api.users.getByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  return (
    <>
      <DashboardHeader
        title="Settings"
        breadcrumbs={[{ label: "Settings" }]}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your account and organization settings
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your personal account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={user?.fullName || ""}
                  disabled
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.primaryEmailAddress?.emailAddress || ""}
                  disabled
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={convexUser?.role || "Loading..."}
                  disabled
                />
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground">
                To update your profile, please visit your{" "}
                <a
                  href="https://accounts.clerk.dev/user"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Clerk account settings
                </a>
                .
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>Your agency information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  placeholder="Your Agency Name"
                  disabled
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="orgId">Organization ID</Label>
                <Input
                  id="orgId"
                  value={convexUser?._id || "Loading..."}
                  disabled
                />
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Organization settings coming soon.
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>API & Integrations</CardTitle>
              <CardDescription>Manage external integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold">Convex</h4>
                  <p className="text-sm text-muted-foreground">Real-time database</p>
                  <p className="mt-2 text-xs text-green-600">✓ Connected</p>
                </div>
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold">Mapbox</h4>
                  <p className="text-sm text-muted-foreground">Live tracking maps</p>
                  <p className="mt-2 text-xs text-green-600">✓ Connected</p>
                </div>
                <div className="rounded-lg border p-4">
                  <h4 className="font-semibold">Clerk</h4>
                  <p className="text-sm text-muted-foreground">Authentication</p>
                  <p className="mt-2 text-xs text-green-600">✓ Connected</p>
                </div>
                <div className="rounded-lg border border-dashed p-4">
                  <h4 className="font-semibold text-muted-foreground">
                    More integrations
                  </h4>
                  <p className="text-sm text-muted-foreground">Coming soon...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
