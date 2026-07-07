import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { Server } from "socket.io";
import Redis from "ioredis";
import http from "http";
import cors from "cors";
import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", credentials: true },
});

let redis;
try {
  redis = new Redis(process.env.REDIS_URL);
  redis.on('error', (err) => console.error('Redis connection error:', err));
} catch (e) {
  console.error('Failed to initialize Redis, using in‑memory fallback:', e);
  // Minimal in‑memory mock with async methods used in the code
  const store = {};
  redis = {
    async get(key) { return store[key] ?? null; },
    async set(key, val) { store[key] = val; },
    async del(key) { delete store[key]; },
    async exists() { return 0; },
    async hset(hash, field, val) { (store[hash] = store[hash] || {})[field] = val; },
    async hget(hash, field) { return (store[hash] || {})[field] ?? null; },
    async hgetall(hash) { return store[hash] || {}; },
    async hlen(hash) { return Object.keys(store[hash] || {}).length; },
    async hdel(hash, field) { if (store[hash]) delete store[hash][field]; },
    async rpush(key, val) { (store[key] = store[key] || []).push(val); },
    async lrange(key) { return store[key] || []; },
    async expire() { },
    async incrby() { },
  };
}


const { connectDB } = await import("./mongodb/mongoose.js");
try {
  await connectDB();
} catch (error) {
  console.log("hello");

  console.error("Failed to connect to the database:", error);
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
const { leaveTheRoom } = await import("./handler/leaveTheRoom.js");
const { signupHandler } = await import("./handler/signup.js");
const { signinHandler } = await import("./handler/signin.js");
const { refreshTokenHandler } = await import("./handler/refreshToken.js");
const { verifyOtpSignin, verifyOtpSignup, resendOtp } = await import(
  "./handler/verifyOtp.js"
);
const { logout } = await import("./handler/logout.js");
const { roomTokenHandler, validateRoomToken } = await import(
  "./handler/roomtoken.js"
);
const { logoutRoom } = await import("./handler/logoutRoom.js");
const { getProblemsList, getProblemDetails } = await import("./handler/problems.js");
const { generateAiTestCases } = await import("./handler/aiService.js");
app.post("/api/room-exist", async (req, res) => {
  try {
    const { roomId } = req.body;
    const exists = await redis.exists(`room:${roomId}`);
    const userCount = await redis.hlen(usersKey(roomId));
    if (exists) {
      return res
        .status(200)
        .json({ success: true, message: "Room exists", userCount: userCount });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Room does not exist" });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});
app.post("/api/create-room", async (req, res) => {
  try {
    const cookie = req.cookies;
    if (cookie.room_token) {
      return res.status(201).json({
        success: true,
        message: "you are already in  a room",
      });
    }
    let roomId = nanoid();
    let userId = uuidv4();
    let exists = await redis.exists(`room:${roomId}`);
    while (exists) {
      roomId = nanoid();
      exists = await redis.exists(`room:${roomId}`);
    }
    const { name } = req.body;
    const token = jwt.sign({ roomId, userId, name }, process.env.ROOM_SECRET, {
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
      message: "Room Created",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});
app.post("/api/leave", leaveTheRoom);
app.post("/api/validate-room-token", validateRoomToken);
app.post("/api/room-token", roomTokenHandler);
app.post("/api/logout", logout);
app.post("/api/signup", signupHandler);
app.post("/api/signin", signinHandler);
app.post("/api/refresh-token", refreshTokenHandler);
app.post("/api/verify-otp-signup", verifyOtpSignup);
app.post("/api/verify-otp-signin", verifyOtpSignin);
app.post("/api/resend-otp", resendOtp);
app.post("/api/logoutRoom", logoutRoom);
app.get("/api/problems", getProblemsList);
app.get("/api/problems/:id", getProblemDetails);
app.post("/api/ai/generate-testcases", generateAiTestCases);
const roomKey = (roomId) => `room:${roomId}`;
const usersKey = (roomId) => `users:${roomId}`;
const codeKey = (roomId) => `code:${roomId}`;
const nameKey = (roomId) => `name:${roomId}`;
const outputKey = (roomId) => `output:${roomId}`;
const inputKey = (roomId) => `input:${roomId}`;
const chatKey = (roomId) => `chat:${roomId}`;
const problemKey = (roomId) => `problem:${roomId}`;
const whiteboardKey = (roomId) => `whiteboard:${roomId}`;
const whiteboardPermsKey = (roomId) => `whiteboard_perms:${roomId}`;

async function getIdBySocketId(roomId, socketId) {
  const users = await redis.hgetall(usersKey(roomId));
  return Object.keys(users).find((userId) => users[userId] === socketId);
}

async function hasWhiteboardPermission(roomId, userId) {
  if (!roomId || !userId) return false;
  const ownerId = await redis.hget(roomKey(roomId), "ownerId");
  if (ownerId === userId) return true;
  const hasPerm = await redis.sismember(whiteboardPermsKey(roomId), userId);
  return !!hasPerm;
}

async function broadcastRoom(roomId, name, socket) {
  const ownerId = await redis.hget(roomKey(roomId), "ownerId");
  const code = await redis.get(codeKey(roomId));
  const names = await redis.hgetall(nameKey(roomId));
  const message_fd = await redis.lrange(chatKey(roomId), 0, -1);
  const output = await redis.get(outputKey(roomId));
  const input = await redis.get(inputKey(roomId));
  const problemId = await redis.get(problemKey(roomId));
  const whiteboardData = await redis.get(whiteboardKey(roomId));
  const whiteboardPermissions = await redis.smembers(whiteboardPermsKey(roomId));
  const join_message = name ? `${name} joined the room` : "";
  const messages = message_fd.map((msg) => {
    return JSON.parse(msg);
  });
  io.to(roomId).emit("roomData", {
    users: names,
    ownerId,
    code,
    messages,
    output,
    input,
    problemId,
    whiteboardData,
    whiteboardPermissions,
    ...(join_message && { join_message }),
  });
}
async function cleanupRoom(roomId) {
  await redis.del(roomKey(roomId));
  await redis.del(usersKey(roomId));
  await redis.del(codeKey(roomId));
  await redis.del(chatKey(roomId));
  await redis.del(nameKey(roomId));
  await redis.del(outputKey(roomId));
  await redis.del(inputKey(roomId));
  await redis.del(problemKey(roomId));
  await redis.del(whiteboardKey(roomId));
  await redis.del(whiteboardPermsKey(roomId));
}
io.on("connection", (socket) => {
  try {
    socket.on("join-room", async ({ roomId, userId, name }) => {
      try {
        socket.userId = userId;
        socket.roomId = roomId;
        socket.userName = name;
        const userCount = await redis.hlen(usersKey(roomId));
        socket.join(roomId);
        await redis.hset(usersKey(roomId), userId, socket.id);
        await redis.hset(nameKey(roomId), userId, name);
        const ownerId = await redis.hget(roomKey(roomId), "ownerId");
        if (!ownerId) {
          await redis.hset(roomKey(roomId), "ownerId", userId);
          await redis.set(codeKey(roomId), "");
          await redis.sadd(whiteboardPermsKey(roomId), userId);
        }
        await broadcastRoom(roomId, name, socket);
      } catch (err) {
        console.error("join-room error:", err);
      }
    });

    socket.on("chat-message", async ({ roomId, userId, message, name }) => {
      try {
        await redis.rpush(
          `chat:${roomId}`,
          JSON.stringify({
            userId,
            message,
            name,
            time: new Date().toTimeString().split(" ")[0],
          })
        );
        io.to(roomId).emit("chat-message", {
          userId,
          name,
          message,
          time: new Date().toTimeString().split(" ")[0],
        });
      } catch (err) {
        console.error("chat-message error:", err);
      }
    });

    socket.on("leave-room", async ({ roomId, userId, name }) => {
      try {
        await redis.hdel(usersKey(roomId), userId);
        await redis.hdel(nameKey(roomId), userId);

        socket.userId = null;
        socket.roomId = null;
        socket.userName = null;

        socket.leave(roomId);
        socket.emit("left-success", { message: "You have left the room" });
        socket.to(roomId).emit("left-message", `User ${name} left room`);
        await broadcastRoom(roomId);
      } catch (err) {
        console.error("leave-room error:", err);
        socket.emit("left-failed", { message: "Error leaving room" });
      }
    });
    socket.on("room-update", async ({ roomId }) => {
      const ownerId = await redis.hget(roomKey(roomId), "ownerId");
      const code = await redis.get(codeKey(roomId));
      const names = await redis.hgetall(nameKey(roomId));
      const message_fd = await redis.lrange(chatKey(roomId), 0, -1);
      const output = await redis.get(outputKey(roomId));
      const input = await redis.get(inputKey(roomId));
      const problemId = await redis.get(problemKey(roomId));
      const whiteboardData = await redis.get(whiteboardKey(roomId));
      const messages = message_fd.map((msg) => {
        return JSON.parse(msg);
      });
      io.to(roomId).emit("roomData", {
        users: names,
        ownerId,
        code,
        messages,
        output,
        input,
        problemId,
        whiteboardData,
      });
    });

    socket.on("send-output", async ({ v, roomId, userId }) => {
      try {
        const ownerId = await redis.hget(roomKey(roomId), "ownerId");
        if (ownerId != userId) return;
        await redis.set(outputKey(roomId), v);
        socket.to(roomId).emit("update-output", { v });
      } catch (err) {
        console.error("send-output error:", err);
      }
    });

    socket.on("send-input", async ({ v1, roomId, userId }) => {
      try {
        const ownerId = await redis.hget(roomKey(roomId), "ownerId");
        if (ownerId != userId) return;
        await redis.set(inputKey(roomId), v1);
        socket.to(roomId).emit("update-input", { v1 });
      } catch (err) {
        console.error("send-input error:", err);
      }
    });

    socket.on("code-change", async ({ roomId, value, userId }) => {
      try {
        const ownerId = await redis.hget(roomKey(roomId), "ownerId");
        if (ownerId !== userId) return;
        await redis.set(codeKey(roomId), value);
        socket.to(roomId).emit("code-update", { value });
      } catch (err) {
        console.error("code-change error:", err);
      }
    });
// Handle cursor updates from clients
socket.on("cursor-change", async ({ roomId, userId, name, position, color }) => {
  try {
    // Broadcast cursor to other participants
    socket.to(roomId).emit("cursor-update", { userId, name, position, color });
  } catch (err) {
    console.error("cursor-change error:", err);
  }
});

    // Handle problem selection from room owner
    socket.on("select-problem", async ({ roomId, problemId, codeTemplate }) => {
      try {
        const userId = await getIdBySocketId(roomId, socket.id);
        const ownerId = await redis.hget(roomKey(roomId), "ownerId");
        if (ownerId !== userId) return;
        await redis.set(problemKey(roomId), problemId);
        if (codeTemplate !== undefined) {
          await redis.set(codeKey(roomId), codeTemplate);
        }
        io.to(roomId).emit("problem-update", { problemId, codeTemplate });
      } catch (err) {
        console.error("select-problem error:", err);
      }
    });

    // Handle whiteboard drawing sync
    socket.on("draw-line", async ({ roomId, prevPos, currentPos, color, size }) => {
      try {
        if (await hasWhiteboardPermission(roomId, socket.userId)) {
          socket.to(roomId).emit("draw-line", { prevPos, currentPos, color, size });
        }
      } catch (err) {
        console.error("draw-line error:", err);
      }
    });

    socket.on("whiteboard-save", async ({ roomId, dataUrl }) => {
      try {
        if (await hasWhiteboardPermission(roomId, socket.userId)) {
          await redis.set(whiteboardKey(roomId), dataUrl);
          io.to(roomId).emit("whiteboard-update", { dataUrl });
        }
      } catch (err) {
        console.error("whiteboard-save error:", err);
      }
    });

    socket.on("clear-whiteboard", async ({ roomId }) => {
      try {
        const ownerId = await redis.hget(roomKey(roomId), "ownerId");
        if (ownerId === socket.userId) {
          await redis.del(whiteboardKey(roomId));
          io.to(roomId).emit("clear-whiteboard");
        }
      } catch (err) {
        console.error("clear-whiteboard error:", err);
      }
    });

    // Handle WebRTC voice signaling
    socket.on("voice-join", ({ roomId, userId, name }) => {
      socket.to(roomId).emit("voice-peer-joined", { socketId: socket.id, userId, name });
    });

    socket.on("voice-signal", ({ targetSocketId, signalData }) => {
      io.to(targetSocketId).emit("voice-signal", { senderSocketId: socket.id, signalData });
    });

    socket.on("voice-leave", ({ roomId }) => {
      socket.to(roomId).emit("voice-peer-left", { socketId: socket.id });
    });

    socket.on("close-room", async ({ roomId }) => {
      try {
        const ownerId = await redis.hget(roomKey(roomId), "ownerId");
        if (ownerId === socket.userId) {
          await cleanupRoom(roomId);
          io.to(roomId).emit("room-closed");
        }
      } catch (err) {
        console.error("close-room error:", err);
      }
    });

    socket.on("change-owner", async ({ value, roomId }) => {
      try {
        const ownerId = await redis.hget(roomKey(roomId), "ownerId");
        // Only the current owner can transfer ownership
        if (ownerId !== socket.userId) return;
        if (ownerId == value) return;
        await redis.hset(roomKey(roomId), "ownerId", value);
        await redis.sadd(whiteboardPermsKey(roomId), value);
        io.to(roomId).emit("owner-update", { value });
        await broadcastRoom(roomId);
      } catch (err) {
        console.error("change-owner error:", err);
      }
    });

    socket.on("toggle-draw-permission", async ({ targetUserId, roomId }) => {
      try {
        const ownerId = await redis.hget(roomKey(roomId), "ownerId");
        if (ownerId !== socket.userId) return;
        const hasPerm = await redis.sismember(whiteboardPermsKey(roomId), targetUserId);
        if (hasPerm) {
          await redis.srem(whiteboardPermsKey(roomId), targetUserId);
        } else {
          await redis.sadd(whiteboardPermsKey(roomId), targetUserId);
        }
        await broadcastRoom(roomId);
      } catch (err) {
        console.error("toggle-draw-permission error:", err);
      }
    });

    socket.on("disconnecting", () => {
      try {
        console.log("disconnecting");
        const { roomId, userId } = socket;
        if (!roomId || !userId) return;

        // Emit voice left instantly so WebRTC connection closes immediately
        socket.to(roomId).emit("voice-peer-left", { socketId: socket.id });

        // Add a 3-second grace period before transferring ownership and removing the user
        setTimeout(async () => {
          try {
            // Check if this socket is still the currently registered socket for this user
            const currentSocketId = await redis.hget(usersKey(roomId), userId);
            if (currentSocketId !== socket.id) {
              console.log(`Ignoring disconnect for user ${userId} since they reconnected (new socket: ${currentSocketId})`);
              return;
            }

            const name = await redis.hget(nameKey(roomId), userId);
            console.log("Grace period expired. Cleaning up disconnected user:", userId, name);

            await redis.hdel(usersKey(roomId), userId);
            await redis.hdel(nameKey(roomId), userId);

            io.to(roomId).emit(
              "left-message",
              `${name || "A user"} got disconnected`
            );

            const ownerId = await redis.hget(roomKey(roomId), "ownerId");
            const remainingUsers = await redis.hkeys(usersKey(roomId));
            console.log("Remaining users:", remainingUsers);

            if (remainingUsers.length === 0) {
              console.log(`Room ${roomId} is now empty`);
              await cleanupRoom(roomId);
              return;
            }

            if (ownerId == userId) {
              const newOwnerId =
                remainingUsers[
                  Math.floor(Math.random() * remainingUsers.length)
                ];

              await redis.hset(roomKey(roomId), "ownerId", newOwnerId);
              await redis.sadd(whiteboardPermsKey(roomId), newOwnerId);
              io.to(roomId).emit("owner-update", { value: newOwnerId });
              console.log(`Ownership of room ${roomId} transferred to ${newOwnerId}`);
            }

            // Sync updated room data (especially the users list) to all clients in the room
            await broadcastRoom(roomId);
          } catch (err) {
            console.error("Error during disconnect cleanup:", err);
          }
        }, 3000);
      } catch (err) {
        console.error("disconnecting outer error:", err);
      }
    });

    socket.on("disconnect", () => {
      try {
        console.log("disconnected");
      } catch (err) {
        console.error("disconnect error:", err);
      }
    });
  } catch (err) {
    console.error("socket connection error:", err);
  }
});
await redis
  .flushall()
  .then(() => {
    console.log("done");
  })
  .catch((err) => {
    console.log(err);
  });

server.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
