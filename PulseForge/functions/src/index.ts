import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { Resend } from "resend";

// Re-export chat Cloud Function
export { chat } from "./chat";

admin.initializeApp();

const resendApiKey = defineSecret("RESEND_API_KEY");

// ── Welcome email on user creation ──────────────────────

export const onUserCreated = onDocumentCreated(
  {
    document: "users/{uid}",
    secrets: [resendApiKey],
  },
  async (event) => {
    const userData = event.data?.data();
    if (!userData) return;

    const { email, fullName } = userData as { email: string; fullName: string };
    if (!email) return;

    const resend = new Resend(resendApiKey.value());

    try {
      await resend.emails.send({
        from: "PulseForge <noreply@yourdomain.com>",
        to: email,
        subject: "Welcome to PulseForge! 💪",
        html: `
          <h1>Welcome, ${fullName || "Athlete"}!</h1>
          <p>You've just joined PulseForge — your AI-powered fitness companion.</p>
          <p>Start your first workout today and crush your goals!</p>
          <p>— The PulseForge Team</p>
        `,
      });
    } catch (error) {
      console.error("Failed to send welcome email:", error);
    }
  }
);

// ── Password reset via Resend ───────────────────────────

export const sendPasswordReset = onCall(
  { secrets: [resendApiKey] },
  async (request) => {
    const email = request.data?.email as string | undefined;
    if (!email || typeof email !== "string") {
      throw new HttpsError("invalid-argument", "Email is required");
    }

    try {
      const resetLink = await admin.auth().generatePasswordResetLink(email);

      const resend = new Resend(resendApiKey.value());
      await resend.emails.send({
        from: "PulseForge <noreply@yourdomain.com>",
        to: email,
        subject: "Reset your PulseForge password",
        html: `
          <h2>Password Reset</h2>
          <p>Click the link below to reset your password:</p>
          <a href="${resetLink}">Reset Password</a>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to send password reset:", error);
      throw new HttpsError("internal", "Failed to send reset email");
    }
  }
);
