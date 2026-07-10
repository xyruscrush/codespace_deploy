import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

export async function sendOtpEmail(email, otp) {
  if (!resend) {
    throw new Error("RESEND_API_KEY is not defined in the environment variables.");
  }

  const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";

  console.log(`[RESEND] Sending OTP ${otp} to ${email} from ${fromEmail}`);
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP code is: ${otp}`,
  });

  if (error) {
    console.error("[RESEND] Error sending email:", error);
    throw new Error(error.message || "Failed to send email via Resend");
  }

  console.log("[RESEND] Email sent successfully:", data);
  return data;
}
