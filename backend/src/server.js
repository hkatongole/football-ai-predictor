import 'dotenv/config';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app.js';
import { scheduleFootballDataJobs } from './jobs/syncFootballData.js';
import prisma from './config/prisma.js';
import redis from './config/redis.js';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// --- WebSockets for live scores / odds / predictions ---
export const io = new SocketIOServer(server, {
  cors: { origin: process.env.CLIENT_URL || '*', credentials: true },
});

io.on('connection', (socket) => {
  socket.on('subscribe:match', (matchId) => socket.join(`match:${matchId}`));
  socket.on('subscribe:live', () => socket.join('live-feed'));
  socket.on('disconnect', () => {});
});

// Example emitter used by sync jobs to push live updates to subscribed clients:
// io.to('live-feed').emit('scoreUpdate', payload);
// io.to(`match:${matchId}`).emit('matchUpdate', payload);

async function start() {
  try {
    await prisma.$connect();
    console.log('[db] Prisma connected to MySQL');

    server.listen(PORT, () => {
      console.log(`[server] Football AI Predictor API running on port ${PORT}`);
      console.log(`[docs] Swagger available at http://localhost:${PORT}/api/docs`);
    });

    if (process.env.NODE_ENV !== 'test') {
      scheduleFootballDataJobs();
    }
  } catch (err) {
    console.error('[server] Failed to start:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('[server] SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  redis.disconnect();
  server.close(() => process.exit(0));
});

start();

export default server;
