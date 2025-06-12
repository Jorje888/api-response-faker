// Import necessary modules
import express from "express"; // For handling HTTP routes (login/registration)
import { createServer } from "http"; // To create an HTTP server that both Express and Socket.IO will use
import { Server as SocketIOServer } from "socket.io"; // Socket.IO server
import jsonwebtoken from "jsonwebtoken"; // For creating and verifying JSON Web Tokens
import bcrypt from "bcrypt"; // For hashing and comparing passwords
import dotenv from "dotenv"; // To load environment variables (e.g., JWT_SECRET)
import FakeApiRule from "./types/fakeApiRule"; // Assuming this type definition exists
import * as DB from "./db"; // Assuming database utility functions exist
import { createRule, fakeARule } from "./util"; // Assuming utility functions exist

// Load environment variables from .env file
dotenv.config();

// Define the port for the server
const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "http://localhost:3001", // Frontend URL (e.g., your React app)
    methods: ["GET", "POST"],
  },
});

const users = [];

// --- Environment Variables Check ---
// It's crucial to have a strong secret for JWT signing.
if (!process.env.JWT_SECRET) {
  console.error(
    "FATAL ERROR: JWT_SECRET is not defined in environment variables."
  );
  // In a production app, you might want to exit the process here
  // process.exit(1);
}

// --- JWT Authentication Middleware for Socket.IO ---
// This middleware runs for every new Socket.IO connection.
// It verifies the JWT token sent by the client during the handshake.
io.use((socket, next) => {
  // Extract the token from the handshake authentication data
  // The client sends the token in `socket.handshake.auth.token`
  const token = socket.handshake.auth.token;

  // If no token is provided, reject the connection
  if (!token) {
    console.warn("Socket.IO: Connection rejected - No token provided.");
    return next(new Error("Authentication error: No token provided"));
  }

  // Verify the JWT token using the secret key
  // The JWT_SECRET must be strong and kept private on the server.
  jsonwebtoken.verify(token, process.env.JWT_SECRET, (err, user) => {
    // If verification fails (e.g., token expired, invalid signature), reject the connection
    if (err) {
      console.warn(
        "Socket.IO: Connection rejected - Invalid token.",
        err.message
      );
      return next(new Error("Authentication error: Invalid token"));
    }

    // If the token is valid, attach the decoded user payload to the socket object.
    // This makes user-specific data available for all subsequent socket events.
    // For Socket.IO v4+, it's often recommended to use `socket.data.user`.
    socket.user = user; // Older versions
    socket.data.user = user; // Recommended for Socket.IO v4+

    console.log(
      `Socket.IO: User ${user.username} (ID: ${user.id}) successfully authenticated.`
    );
    // Allow the connection to proceed
    next();
  });
});

// --- Socket.IO Connection Event Handler ---
// This code runs when a client successfully establishes a Socket.IO connection
// after passing the authentication middleware.
io.on("connection", (socket) => {
  // Access the authenticated user's data from the socket object
  const { id, username } = socket.data.user; // Using socket.data.user for v4+

  console.log(
    `User connected via Socket.IO: ${username} (Socket ID: ${socket.id})`
  );

  // Emit a welcome message back to the connected client
  socket.emit("welcome", `Welcome, ${username}! You are securely connected.`);

  // Example: Listen for a 'chat message' event from the client
  socket.on("chat message", (message) => {
    console.log(`Message from ${username}: ${message}`);
    // Broadcast the message to all connected clients (or a specific room/namespace)
    // In a real app, you'd check authorization here for specific actions.
    io.emit("chat message", `${username}: ${message}`);
  });

  // Handle client disconnection
  socket.on("disconnect", () => {
    console.log(
      `User disconnected from Socket.IO: ${username} (Socket ID: ${socket.id})`
    );
  });

  // Handle potential errors on the socket connection
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

    // Check if user already exists (case-insensitive)
    if (
      users.some((u) => u.username.toLowerCase() === username.toLowerCase())
    ) {
      return res.status(409).json({ error: "Username already exists." });
    }

    // Hash the password using bcrypt
    // bcrypt.hash is computationally intensive, making brute-force attacks difficult
    const saltRounds = 10; // Recommended number of salt rounds
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Store the new user (in-memory for this example)
    // In a real app, you'd save this to a database
    const newUser = {
      id: users.length + 1, // Simple ID generation
      username: username,
      password: hashedPassword,
    };
    users.push(newUser);

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

    // Basic input validation
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required." });
    }

    // Find the user by username (case-insensitive)
    const user = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );

    // If user not found
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    // Compare the provided password with the stored hashed password using bcrypt
    // bcrypt.compare handles the salting automatically.
    const isPasswordValid = await bcrypt.compare(password, user.password);

    // If passwords don't match
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    // If credentials are valid, generate a JSON Web Token (JWT)
    // The JWT payload typically contains non-sensitive user information
    // that can be used for identification and authorization.
    const token = jsonwebtoken.sign(
      { id: user.id, username: user.username }, // Payload (claims)
      process.env.JWT_SECRET, // Secret key from environment variables
      { expiresIn: "1h" } // Token expiration time (e.g., 1 hour)
    );

    console.log(`User logged in: ${username}. JWT issued.`);
    // Send the JWT back to the frontend
    res.json({ token, message: "Login successful. JWT issued." });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Server error during login." });
  }
});

// --- Existing DB and Fake API Rules Logic ---
// This part remains largely unchanged as it's separate from Socket.IO connection handling
// and deals with the "fake API" functionality via Express.

// Gather database rules into a map for easier lookUp
const fake_api_rules: Map<{ path: string; method: string }, FakeApiRule> =
  new Map();
export const db = DB.initializeDB();
const rules = DB.getAllRules(db);
rules.forEach((rule) => {
  // Note: Storing objects as map keys can be tricky due to reference equality.
  // Consider stringifying keys or using a more robust map implementation for complex keys.
  fake_api_rules.set({ path: rule.path, method: rule.method }, rule);
});

// Apply fake API rules to the Express app
rules.forEach((rule) => {
  fakeARule(rule, app); // This function will set up Express routes
});

// Start the HTTP server (which serves both Express and Socket.IO)
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`HTTP routes: /register, /login, and your fake API rules.`);
  console.log(`Socket.IO listening for connections.`);
});
