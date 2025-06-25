import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import jsonwebtoken from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";
import axios from "axios";
import { FakeApiRule } from "./types/fakeApiRule";
import * as DB from "./db";
import { createRule, fakeARule } from "./util";
import bcrypt from "bcrypt";
import { format } from "path";
import { initializeRouter as initializeRuleManager } from "./routes/ruleManager";


const fake_api_rules: Map<
  { path: string; method: string; user: string },
  FakeApiRule
> = new Map();

export const db = DB.initializeDB();
DB.seedDatabase(db);
const rules = DB.getAllRules(db);

// In-memory liveness status map
interface LivenessStatus {
  ruleId: number;
  isLive: boolean;
  lastChecked: string;
  failureReason?: string;
}

const livenessStatusMap = new Map<number, LivenessStatus>();

// Background process to check liveness of all active rules every 10 seconds
const checkLiveness = async () => {
  try {
    const allRules = DB.getAllRulesWithIds(db);
    
    for (const rule of allRules) {
      try {
        // Make internal HTTP request to the fake endpoint
        const response = await axios({
          method: rule.method.toLowerCase(),
          url: `http://localhost:${PORT}${rule.path}`,
          headers: {
            'Content-Type': rule.contentType
          },
          timeout: 5000 // 5 second timeout
        });

        // Compare response against rule definition
        const isLive = 
          response.status === rule.statusCode &&
          response.headers['content-type']?.includes(rule.contentType) &&
          response.data === rule.responseBody;

        livenessStatusMap.set(rule.id, {
          ruleId: rule.id,
          isLive,
          lastChecked: new Date().toISOString(),
          failureReason: isLive ? undefined : 'Response mismatch'
        });

      } catch (error: any) {
        livenessStatusMap.set(rule.id, {
          ruleId: rule.id,
          isLive: false,
          lastChecked: new Date().toISOString(),
          failureReason: error.message || 'Request failed'
        });
      }
    }
  } catch (error) {
    console.error('Error in liveness check:', error);
  }
};

// Start the background process
setInterval(checkLiveness, 10000); // Run every 10 seconds

dotenv.config();
const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());
app.use(cors({
  origin: "*",
  credentials: true
}));

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

// Initialize rule management routes
const ruleManagerRouter = initializeRuleManager(db, app);
app.use('/api/rules', ruleManagerRouter);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// --- Environment Variables Check ---
if (!process.env.JWT_SECRET) {
  console.error("ERROR: JWT_SECRET is not defined in environment variables.");
  process.exit(1);
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
        `Socket.IO: User ${user.username} successfully authenticated.`
      );
      next();
    }
  );
});

// --- Socket.IO Connection Event Handler ---
io.on("connection", (socket) => {
  const user = socket.data.user;
  const username = user?.username || 'Unknown';

  console.log(
    `User connected via Socket.IO: ${username} (Socket ID: ${socket.id})`
  );
  socket.emit("welcome", `Welcome, ${username}! You are securely connected.`);

  // Handle rule management events through Socket.IO
  socket.on("get_user_rules", async () => {
    try {
      const userRules = DB.getAllRulesByUsername(db, username);
      socket.emit("user_rules", userRules);
    } catch (error) {
      console.error(`Error fetching rules for ${username}:`, error);
      socket.emit("error", "Failed to fetch rules");
    }
  });

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness status endpoint
app.get('/api/liveness-status', (req, res) => {
  // Return as a JSON array for compatibility
  res.json([...livenessStatusMap.values()]);
});

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

    // Additional validation
    if (username.length < 3) {
      return res
        .status(400)
        .json({ error: "Username must be at least 3 characters long." });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long." });
    }

    const formattedUsername = username.trim().toLowerCase();
    
    if (DB.hasUser(db, formattedUsername)) {
      return res.status(409).json({ error: "Username already exists." });
    }
    
    const saltRounds = 12; // Increased security
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    DB.addUser(db, formattedUsername, hashedPassword);
    
    console.log(`User registered: ${formattedUsername}`);
    res.status(201).json({ 
      message: "User registered successfully.",
      username: formattedUsername
    });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ error: "Server error during registration." });
  }
});

// User Login Route
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body as {
      username: string;
      password: string;
    };

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required." });
    }
    
    const formattedUsername = username.trim().toLowerCase();
    
    // If user not found
    if (!DB.hasUser(db, formattedUsername)) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      DB.getHashPass(db, formattedUsername)
    );

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = jsonwebtoken.sign(
      { username: formattedUsername },
      process.env.JWT_SECRET as string,
      { expiresIn: "2h" } // Extended token lifetime
    );

    console.log(`User logged in: ${formattedUsername}. JWT issued.`);
    res.json({ 
      token, 
      username: formattedUsername,
      message: "Login successful. JWT issued." 
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Server error during login." });
  }
});

// Token validation endpoint
app.get("/validate-token", (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jsonwebtoken.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    res.json({ valid: true, user });
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  httpServer.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Shutting down gracefully...');
  httpServer.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});


// Start the HTTP server (which serves both Express and Socket.IO)
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`HTTP routes: /register, /login, and your fake API rules.`);
  console.log(`Socket.IO listening for connections.`);
  
});
