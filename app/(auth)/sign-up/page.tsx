"use client";

import Link from "next/link";
import { Building2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignUpChoicePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Join Navia</h1>
        <p className="mt-2 text-muted-foreground">
          Choose how you&apos;d like to get started
        </p>
      </div>

      <div className="grid w-full max-w-2xl gap-6 md:grid-cols-2">
        {/* Client Signup */}
        <Card className="relative overflow-hidden transition-all hover:shadow-lg">
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>I&apos;m a Client</CardTitle>
            <CardDescription>
              Travel agency or direct customer looking to book passenger
              assistance services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="mb-4 space-y-2 text-sm text-muted-foreground">
              <li>✓ Create and manage missions</li>
              <li>✓ Track agents in real-time</li>
              <li>✓ Access dashboard & reports</li>
            </ul>
            <Button asChild className="w-full">
              <Link href="/sign-up/client">Sign up as Client</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Agent Signup */}
        <Card className="relative overflow-hidden transition-all hover:shadow-lg">
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/10">
              <UserCheck className="h-6 w-6 text-orange-500" />
            </div>
            <CardTitle>I&apos;m an Agent</CardTitle>
            <CardDescription>
              Greeter or passenger assistant providing on-the-ground services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="mb-4 space-y-2 text-sm text-muted-foreground">
              <li>✓ Receive mission assignments</li>
              <li>✓ Mobile-first experience</li>
              <li>✓ GPS tracking & status updates</li>
            </ul>
            <Button asChild variant="outline" className="w-full">
              <Link href="/sign-up/agent">Sign up as Agent</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
