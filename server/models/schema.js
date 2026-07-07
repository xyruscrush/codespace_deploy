import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 },
  expiresAt: {
    type: Date,
    required: true,
    default: () => Date.now() + 30 * 1000,
  },
});

const problemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  difficulty: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  templates: {
    type: Map,
    of: String,
  },
  testCases: [
    {
      input: { type: String, required: true },
      expectedOutput: { type: String, required: true },
    },
  ],
});

const User = mongoose.model("User", userSchema);
const Otp = mongoose.model("otp", otpSchema);
const Problem = mongoose.model("Problem", problemSchema);
export { User, Otp, Problem };

