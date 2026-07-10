import dotenv from "dotenv";
dotenv.config();
import { Otp, User } from "../models/schema.js";
import { sendOtpEmail } from "../utils/email.js";
import crypto from "crypto";
async function signupHandler(req, res) {
  try {
    const { email, name } = req.body;
    console.log(email);

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res
        .status(400)
        .json({ success: false, message: "Email  already exists" });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    console.log(`[TESTING] Generated OTP for ${email}: ${otp}`);

    await Otp.create({ email, otp, createdAt: new Date() });

    try {
      await sendOtpEmail(email, otp);
      res.status(200).json({ success: true, message: "OTP sent" });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to send OTP",
        error: error.message,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
export { signupHandler };
