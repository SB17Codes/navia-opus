import { SignUp } from "@clerk/nextjs";

export default function ClientSignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Sign up as Client</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your account to start booking services
        </p>
      </div>
      <SignUp 
        forceRedirectUrl="/onboarding/client"
        signInUrl="/sign-in"
        unsafeMetadata={{
          role: "Client",
        }}
      />
    </div>
  );
}
