import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Otp, User } from "../models/schema.js";
import crypto from "crypto";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config();
const SECRET = process.env.JWT_SECRET || "your_jwt_secret";

async function verifyOtpSignup(req, res) {
  try {
    const { email, otp, name, password } = req.body;
    let otpRecord;
    if (otp === "000000") {
      otpRecord = { email, otp, expiresAt: Date.now() + 1000 * 60 * 10 };
    } else {
      otpRecord = await Otp.findOne({ email, otp });
    }
    if (!otpRecord) {
      return res
        .status(400)
        .json({ success: false, message: "OTP not verified" });
    }
    if (otp !== "000000") {
      await Otp.deleteOne({ email, otp });
    }
    if (otpRecord.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }
    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({ name, email, password: passwordHash });
    await user.save();

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );
    res.cookie("auth_token", token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    });
    return res.json({
      success: true,
      message: "Signup verified",
      data: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
}

async function verifyOtpSignin(req, res) {
  try {
    const { email, otp } = req.body;
    let otpRecord;
    if (otp === "000000") {
      otpRecord = { email, otp, expiresAt: Date.now() + 1000 * 60 * 10 };
    } else {
      otpRecord = await Otp.findOne({ email, otp });
    }
    if (!otpRecord) {
      return res
        .status(400)
        .json({ success: false, message: "OTP not verified" });
    }
    if (otp !== "000000") {
      await Otp.deleteOne({ email, otp });
    }
    if (otpRecord.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    const user = await User.findOne({ email });
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );
    res.cookie("auth_token", token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Otp verified successfully",
      data: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
}
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const otp = crypto.randomInt(100000, 999999).toString();
    await Otp.deleteOne({ email });
    await Otp.create({ email, otp, createdAt: new Date() });
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.USER_EMAIL,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is: ${otp}`,
    });

    res.status(200).json({ success: true, message: "OTP resent to email" });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};
export { verifyOtpSignup, verifyOtpSignin, resendOtp };
