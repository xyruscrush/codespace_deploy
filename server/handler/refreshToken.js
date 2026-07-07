import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
const refreshTokenHandler = async (req, res) => {
  const refreshToken = req.cookies?.auth_token;
  if (!refreshToken) {
    return res.status(401).json({ error: "No refresh token provided" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    res.status(200).json({
      name: decoded.name,
      email: decoded.email,
    });
  } catch (err) {
    res.status(403).json({ error: "Invalid refresh token" });
  }
};
export { refreshTokenHandler };
