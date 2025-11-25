import { SignUp } from "@clerk/nextjs";

export default function AgentSignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Sign up as Agent</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Join as a greeter to provide passenger assistance
        </p>
      </div>
      <SignUp 
        forceRedirectUrl="/onboarding/agent"
        signInUrl="/sign-in"
        unsafeMetadata={{
          role: "Agent",
        }}
      />
      <p className="mt-4 max-w-sm text-center text-xs text-muted-foreground">
        Note: After registration, an admin will need to approve and assign you to a client before you can receive missions.
      </p>
    </div>
  );
}
