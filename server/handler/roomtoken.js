import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
async function roomTokenHandler(req, res) {
  try {
    const { roomId, name } = req.body;

    if (!roomId || !name) {
      return res.status(400).json({
        ssuccess: false,
        message: "roomId ,userId and name  are required",
      });
    }
    const userId = uuidv4();
    const token = jwt.sign({ roomId, name, userId }, process.env.ROOM_SECRET, {
      expiresIn: "24h",
    });
    res.cookie("room_token", token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    });
    return res.status(200).json({
      success: true,
      message: "Room token generated",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
async function validateRoomToken(req, res) {
  try {
    const cookie = req.cookies;
    if (!cookie.room_token) {
      return res
        .status(401)
        .json({ success: false, message: "No room token found" });
    }
    const decoded = jwt.verify(cookie.room_token, process.env.ROOM_SECRET);
    return res.status(200).json({
      success: true,
      message: "Room token is valid",
      data: {
        userId: decoded.userId,
        roomId: decoded.roomId,
        name: decoded.name,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

export { roomTokenHandler, validateRoomToken };
