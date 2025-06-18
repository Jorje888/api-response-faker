import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';


// to run this test , just run 
// 
// 
// npx tsx watch ./src/backend.ts
//
//
//
//

const PORT = 3001;

// Create a standard Node.js HTTP server.
const httpServer = createServer();

// we need to create a new instance of the Socket.IO server with the HTTP server as the argument.
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: 'http://localhost:5173'
    },
});

// This event listener runs for every new client that connects to the server.
io.on('connection', (socket) => {
  console.log(`[BACKEND] Client connected: ${socket.id}`);

  // Listen for the 'addRule' event emitted from the frontend.
  socket.on('addRule', (newRuleData) => {
    console.log(`[BACKEND] Received 'addRule' event from client ${socket.id}:`);
    console.log(newRuleData);
    socket.emit('ruleAddedSuccess', { status: 'ok', receivedRule: newRuleData });
  });




socket.on('loginAttempt', (loginData) => {
    console.log(`[BACKEND] Received 'loginAttempt' from client ${socket.id}:`);
    console.log(loginData);
  });


    socket.on('registerAttempt', (registrationData) => {
    console.log(`[BACKEND] Received 'registerAttempt' from client ${socket.id}:`);
    console.log(registrationData); 
  });



  socket.on('disconnect', (reason) => {
    console.log(`[BACKEND] Client disconnected: ${socket.id} due to ${reason}`);
  });
});

// Start the HTTP server and listen on the specified port.
httpServer.listen(PORT, () => {
  console.log(`[BACKEND] Socket.IO server is running on http://localhost:${PORT}`);
});

// Add basic error handling for the server itself.
httpServer.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`[BACKEND ERROR] Port ${PORT} is already in use. Please use a different port.`);
    } else {
        console.error(`[BACKEND ERROR] Server error:`, err);
    }
    process.exit(1);
});
