import { Problem } from "../models/schema.js";

export async function getProblemsList(req, res) {
  try {
    const problems = await Problem.find({}, "_id title difficulty category");
    return res.status(200).json({ success: true, data: problems });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch problems list",
      error: error.message,
    });
  }
}

export async function getProblemDetails(req, res) {
  try {
    const { id } = req.params;
    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ success: false, message: "Problem not found" });
    }
    return res.status(200).json({ success: true, data: problem });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch problem details",
      error: error.message,
    });
  }
}
