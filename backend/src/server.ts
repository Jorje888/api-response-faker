import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import jsonwebtoken from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";
import axios from "axios";
import { 
  FakeApiRule, 
  ResponseType, 
  RuleStatus, 
  AnalyticsFilter, 
  HttpMethod,
  ContentType,
  RuleSearchParams,
  RuleBulkOperation
} from "./types/fakeApiRule";
import * as DB from "./db";
import { 
  getRuleGroups,
  createRuleGroup,
  updateRuleGroup,
  deleteRuleGroup,
  getRuleHistory,
  searchRules,
  bulkUpdateRules,
  updateRule
} from "./db";
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
        // Use Socket.IO to check liveness instead of HTTP requests
        // Create a temporary socket connection for testing
        const testSocket = io.sockets.sockets.values().next().value;
        
        if (testSocket) {
          // Emit a test event and wait for response
          testSocket.emit('test_liveness', {
            path: rule.path,
            method: rule.method,
            expectedStatus: rule.statusCode,
            expectedContentType: rule.contentType,
            expectedBody: rule.responseBody
          });

          // Set a timeout for the response
          const responseReceived = await new Promise<{success: boolean}>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Timeout waiting for response'));
            }, 5000);

            testSocket.once('liveness_response', (data: {success: boolean}) => {
              clearTimeout(timeout);
              resolve(data);
            });
          });

          const isLive = responseReceived && responseReceived.success;

          livenessStatusMap.set(rule.id, {
            ruleId: rule.id,
            isLive,
            lastChecked: new Date().toISOString(),
            failureReason: isLive ? undefined : 'Socket.IO response mismatch'
          });

        } else {
          // Fallback to HTTP if no sockets are connected
          const response = await axios({
            method: rule.method.toLowerCase(),
            url: `http://localhost:${PORT}${rule.path}`,
            headers: {
              'Content-Type': rule.contentType
            },
            timeout: 5000
          });

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
        }

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
  fakeARule(rule, app, db);
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

  // Handle adding new rules via Socket.IO
  socket.on("addRule", async (newRule: any) => {
    try {
      const { path, method, statusCode, contentType, responseBody } = newRule;
      
      // Validate required fields
      if (!path || !method || !statusCode || !contentType || !responseBody) {
        socket.emit("ruleAddError", { error: "Missing required fields" });
        return;
      }

      const parsedStatusCode = parseInt(statusCode);
      if (isNaN(parsedStatusCode) || parsedStatusCode < 100 || parsedStatusCode > 599) {
        socket.emit("ruleAddError", { error: "Invalid status code" });
        return;
      }

      // Check for duplicate rules
      const allRules = DB.getAllRulesByUsername(db, username);
      if (allRules.some(r => r.path === path && r.method === method)) {
        socket.emit("ruleAddError", { error: "Rule already exists" });
        return;
      }

      // Create the rule
      const rule: FakeApiRule = {
        user: username,
        path,
        method,
        statusCode: parsedStatusCode,
        contentType,
        responseBody,
        status: RuleStatus.ACTIVE,
        responseType: ResponseType.STATIC,
      };

      // Add to database and register route
      DB.addRule(db, rule);
      fakeARule(rule, app, db);

      // Emit success response with the added rule
      socket.emit("ruleAddedSuccess", { 
        status: "ok", 
        receivedRule: rule 
      });

    } catch (error: any) {
      console.error(`Error adding rule for ${username}:`, error);
      socket.emit("ruleAddError", { error: error.message || "Failed to add rule" });
    }
  });

  // Handle getting user's rules via Socket.IO
  socket.on("getMyRules", async (requestedUsername: string) => {
    try {
      // Verify the user is requesting their own rules
      if (requestedUsername !== username) {
        socket.emit("ruleAddError", { error: "Unauthorized access to rules" });
        return;
      }

      const userRules = DB.getAllRulesByUsername(db, username);
      socket.emit("yourRules", userRules);
    } catch (error) {
      console.error(`Error fetching rules for ${username}:`, error);
      socket.emit("ruleAddError", { error: "Failed to fetch rules" });
    }
  });

  // Handle liveness testing through Socket.IO
  socket.on("test_liveness", async (data) => {
    try {
      const { path, method, expectedStatus, expectedContentType, expectedBody } = data;
      
      // Make internal HTTP request to test the endpoint
      const response = await axios({
        method: method.toLowerCase(),
        url: `http://localhost:${PORT}${path}`,
        headers: {
          'Content-Type': expectedContentType
        },
        timeout: 5000
      });

      // Compare response against expected values
      const isLive = 
        response.status === expectedStatus &&
        response.headers['content-type']?.includes(expectedContentType) &&
        response.data === expectedBody;

      socket.emit("liveness_response", { success: isLive });
    } catch (error) {
      socket.emit("liveness_response", { success: false });
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
app.get('/liveness-status', (req, res) => {
  // Return as a JSON array for compatibility
  res.json([...livenessStatusMap.values()]);
});

// Analytics endpoints
app.get('/api/analytics/summary', (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const summary = DB.getAnalyticsSummary(db, days);
    res.json(summary);
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    res.status(500).json({ error: 'Failed to get analytics summary' });
  }
});

app.get('/api/analytics/rule/:id', (req, res) => {
  try {
    const ruleId = parseInt(req.params.id);
    const days = parseInt(req.query.days as string) || 30;
    const analytics = DB.getRuleAnalytics(db, ruleId, days);
    res.json(analytics);
  } catch (error) {
    console.error('Error getting rule analytics:', error);
    res.status(500).json({ error: 'Failed to get rule analytics' });
  }
});

app.get('/api/analytics/logs', (req, res) => {
  try {
    const filter: AnalyticsFilter = {
      ruleId: req.query.ruleId ? parseInt(req.query.ruleId as string) : undefined,
      userId: req.query.userId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      method: req.query.method as HttpMethod,
      statusCode: req.query.statusCode ? parseInt(req.query.statusCode as string) : undefined,
      minResponseTime: req.query.minResponseTime ? parseInt(req.query.minResponseTime as string) : undefined,
      maxResponseTime: req.query.maxResponseTime ? parseInt(req.query.maxResponseTime as string) : undefined,
    };
    
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = DB.getRequestLogs(db, filter, limit);
    res.json(logs);
  } catch (error) {
    console.error('Error getting request logs:', error);
    res.status(500).json({ error: 'Failed to get request logs' });
  }
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

// Enhanced rule management endpoints
app.get('/api/rule-groups', (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const groups = getRuleGroups(db, userId);
    res.json(groups);
  } catch (error) {
    console.error('Error fetching rule groups:', error);
    res.status(500).json({ error: 'Failed to fetch rule groups' });
  }
});

app.post('/api/rule-groups', (req, res) => {
  try {
    const { name, description, userId, color, isDefault } = req.body;
    
    if (!name || !userId) {
      return res.status(400).json({ error: 'name and userId are required' });
    }
    
    const group = createRuleGroup(db, {
      name,
      description,
      userId,
      color,
      isDefault: isDefault || false
    });
    
    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating rule group:', error);
    res.status(500).json({ error: 'Failed to create rule group' });
  }
});

app.put('/api/rule-groups/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }
    
    const success = updateRuleGroup(db, id, updates);
    if (success) {
      res.json({ message: 'Rule group updated successfully' });
    } else {
      res.status(404).json({ error: 'Rule group not found' });
    }
  } catch (error) {
    console.error('Error updating rule group:', error);
    res.status(500).json({ error: 'Failed to update rule group' });
  }
});

app.delete('/api/rule-groups/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.query.userId as string;
    
    if (isNaN(id) || !userId) {
      return res.status(400).json({ error: 'Invalid group ID or userId' });
    }
    
    const success = deleteRuleGroup(db, id, userId);
    if (success) {
      res.json({ message: 'Rule group deleted successfully' });
    } else {
      res.status(404).json({ error: 'Rule group not found or cannot be deleted' });
    }
  } catch (error) {
    console.error('Error deleting rule group:', error);
    res.status(500).json({ error: 'Failed to delete rule group' });
  }
});

app.get('/api/rules/:id/history', (req, res) => {
  try {
    const ruleId = parseInt(req.params.id);
    
    if (isNaN(ruleId)) {
      return res.status(400).json({ error: 'Invalid rule ID' });
    }
    
    const history = getRuleHistory(db, ruleId);
    res.json(history);
  } catch (error) {
    console.error('Error fetching rule history:', error);
    res.status(500).json({ error: 'Failed to fetch rule history' });
  }
});

app.get('/api/rules/search', (req, res) => {
  try {
    const params: RuleSearchParams = {
      search: req.query.search as string,
      status: req.query.status ? (Array.isArray(req.query.status) ? req.query.status as RuleStatus[] : [req.query.status as RuleStatus]) : undefined,
      methods: req.query.methods ? (Array.isArray(req.query.methods) ? req.query.methods as HttpMethod[] : [req.query.methods as HttpMethod]) : undefined,
      contentTypes: req.query.contentTypes ? (Array.isArray(req.query.contentTypes) ? req.query.contentTypes as ContentType[] : [req.query.contentTypes as ContentType]) : undefined,
      tags: req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags as string[] : [req.query.tags as string]) : undefined,
      groupId: req.query.groupId ? parseInt(req.query.groupId as string) : undefined,
      userId: req.query.userId as string,
      createdAfter: req.query.createdAfter as string,
      createdBefore: req.query.createdBefore as string,
      lastUsedAfter: req.query.lastUsedAfter as string,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    };
    
    const result = searchRules(db, params);
    res.json(result);
  } catch (error) {
    console.error('Error searching rules:', error);
    res.status(500).json({ error: 'Failed to search rules' });
  }
});

app.post('/api/rules/bulk', (req, res) => {
  try {
    const operation: RuleBulkOperation = req.body;
    
    if (!operation.ruleIds || operation.ruleIds.length === 0 || !operation.operation || !operation.userId) {
      return res.status(400).json({ error: 'ruleIds, operation, and userId are required' });
    }
    
    const success = bulkUpdateRules(db, operation);
    if (success) {
      res.json({ message: 'Bulk operation completed successfully' });
    } else {
      res.status(400).json({ error: 'Bulk operation failed' });
    }
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    res.status(500).json({ error: 'Failed to perform bulk operation' });
  }
});

app.put('/api/rules/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { updates, userId, comment } = req.body;
    
    if (isNaN(id) || !userId || !updates) {
      return res.status(400).json({ error: 'Invalid rule ID, userId, or updates' });
    }
    
    const success = updateRule(db, id, updates, userId, comment);
    if (success) {
      res.json({ message: 'Rule updated successfully' });
    } else {
      res.status(404).json({ error: 'Rule not found or update failed' });
    }
  } catch (error) {
    console.error('Error updating rule:', error);
    res.status(500).json({ error: 'Failed to update rule' });
  }
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

export { app };
