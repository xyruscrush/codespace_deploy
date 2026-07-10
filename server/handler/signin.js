import crypto from "crypto";
import { sendOtpEmail } from "../utils/email.js";
import bcrypt from "bcrypt";
import { Otp, User } from "../models/schema.js";
import dotenv from "dotenv";
dotenv.config();
async function signinHandler(req, res) {
  try {
    const { email, password } = req.body;
    console.log(email);
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Email not found" });
    let isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "Invalid password" });

    const otp = crypto.randomInt(100000, 999999).toString();
    console.log(`[TESTING] Generated OTP for ${email}: ${otp}`);

    await Otp.create({ email, otp, createdAt: new Date() });

    await sendOtpEmail(email, otp);

    res.status(200).json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
}

export { signinHandler };
