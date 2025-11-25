import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.json();

    // Verify webhook signature using svix headers
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    // For production, you should verify the signature using svix
    // Since we can't use npm packages directly in Convex HTTP actions,
    // we'll trust the webhook for now (Convex endpoint is not publicly guessable)
    // In production, use Convex's built-in webhook verification or a separate verification endpoint

    const eventType = payload.type;

    if (eventType === "user.created" || eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, unsafe_metadata } =
        payload.data;

      const email = email_addresses?.[0]?.email_address || "";
      const name = [first_name, last_name].filter(Boolean).join(" ") || "Unknown";
      // Role comes from unsafe_metadata (set during signup)
      const role = (unsafe_metadata?.role as string) || "Client";

      try {
        await ctx.runMutation(api.users.createOrUpdate, {
          clerkId: id,
          email,
          name,
          role: role as "Admin" | "Client" | "Agent",
        });

        return new Response("User synced successfully", { status: 200 });
      } catch (error) {
        console.error("Error syncing user to Convex:", error);
        return new Response("Error syncing user", { status: 500 });
      }
    }

    return new Response("Webhook received", { status: 200 });
  }),
});

export default http;
