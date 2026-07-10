import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/schema.js";
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
      message: "Signin successful",
      data: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
}

export { signinHandler };

