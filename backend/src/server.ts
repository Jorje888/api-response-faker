import express from "express";
import { createServer, get } from "http";
import { Server as SocketIOServer } from "socket.io";
import jsonwebtoken from "jsonwebtoken";
import dotenv from "dotenv";
import { FakeApiRule } from "./types/fakeApiRule";
import * as DB from "./db";
import { createRule, fakeARule } from "./util";
import bcrypt from "bcrypt";
import { format } from "path";

const fake_api_rules: Map<
  { path: string; method: string; user: string },
  FakeApiRule
> = new Map();

export const db = DB.initializeDB();
DB.seedDatabase(db);
const rules = DB.getAllRules(db);

dotenv.config();
const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());
const httpServer = createServer(app);

// Gather database rules into a map for easier lookUp
rules.forEach((rule) => {
  fake_api_rules.set(
    { path: rule.path, method: rule.method, user: rule.user },
    rule
  );
});

// Apply fake API rules to the Express app
rules.forEach((rule) => {
  fakeARule(rule, app);
});

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"],
  },
});

// --- Environment Variables Check ---
if (!process.env.JWT_SECRET) {
  console.error("ERROR: JWT_SECRET is not defined in environment variables.");
}

// --- JWT Authentication Middleware for Socket.IO ---
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  // If no token is provided, reject the connection
  if (!token) {
    console.warn("Socket.IO: Connection rejected - No token provided.");
    return next(new Error("Authentication error: No token provided"));
  }
  jsonwebtoken.verify(
    token,
    process.env.JWT_SECRET as string,
    (err: any, user: any) => {
      if (err) {
        console.warn(
          "Socket.IO: Connection rejected - Invalid token.",
          err.message
        );
        return next(new Error("Authentication error: Invalid token"));
      }

      socket.data.user = user;
      console.log(
        `Socket.IO: User ${user.username} (ID: ${user.id}) successfully authenticated.`
      );
      next();
    }
  );
});

// --- Socket.IO Connection Event Handler ---
io.on("connection", (socket) => {
  const username = socket.data.user;

  console.log(
    `User connected via Socket.IO: ${username} (Socket ID: ${socket.id})`
  );
  socket.emit("welcome", `Welcome, ${username}! You are securely connected.`);

  socket.on("disconnect", () => {
    console.log(
      `User disconnected from Socket.IO: ${username} (Socket ID: ${socket.id})`
    );
  });
  socket.on("error", (err) => {
    console.error(
      `Socket error for ${username} (Socket ID: ${socket.id}):`,
      err.message
    );
  });
});

// --- Express HTTP Routes for User Authentication ---

// User Registration Route
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Basic input validation
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required." });
    }
    const formattedUsername = username.trim().toLowerCase();
    if (DB.hasUser(db, formattedUsername)) {
      return res.status(409).json({ error: "Username already exists." });
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    DB.addUser(db, formattedUsername, hashedPassword);
    console.log(`User registered: ${username}`);
    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ error: "Server error during registration." });
  }
});

// User Login Route
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required." });
    }
    const formattedUsername = username.trim().toLowerCase();
    // If user not found
    if (!DB.hasUser(db, formattedUsername)) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      DB.getHashPass(db, formattedUsername)
    );

    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    const token = jsonwebtoken.sign(
      { username: formattedUsername },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    console.log(`User logged in: ${username}. JWT issued.`);
    res.json({ token, message: "Login successful. JWT issued." });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Server error during login." });
  }
});

// Start the HTTP server (which serves both Express and Socket.IO)
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`HTTP routes: /register, /login, and your fake API rules.`);
  console.log(`Socket.IO listening for connections.`);
});
