const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Store admin socket connections
  const adminSockets = new Set();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle admin joining
    socket.on('join-admin', () => {
      adminSockets.add(socket.id);
      console.log('Admin joined:', socket.id);
    });

    // Handle admin leaving
    socket.on('leave-admin', () => {
      adminSockets.delete(socket.id);
      console.log('Admin left:', socket.id);
    });

    // Handle new rent request notification
    socket.on('new-rent-request', (data) => {
      console.log('New rent request:', data);
      // Broadcast to all admin clients
      adminSockets.forEach(adminSocketId => {
        io.to(adminSocketId).emit('rent-request-notification', data);
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      adminSockets.delete(socket.id);
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});

