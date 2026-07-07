function logoutRoom(req, res) {
  try {
    res.clearCookie("room_token", {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
    });
    res
      .status(200)
      .json({ success: true, message: "Logging out from room successful" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}
export { logoutRoom };
