import dotenv from 'dotenv';
import http from 'http';
import app from './app';
import { prisma } from './config/prisma';
import { connectRedis } from './config/redis';
import { connectOpenSearch } from './config/opensearch';
import { SocketServer } from './sockets/socket.server';
import './workers/email.worker';
import './workers/search.worker';
import './workers/notification.worker';

// Load environment variables from .env
dotenv.config();

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Attempt to connect to Redis
    await connectRedis();

    // Attempt to connect to OpenSearch (Gracefully fails if not running)
    await connectOpenSearch();

    // Create HTTP Server wrapping Express
    const httpServer = http.createServer(app);

    // Initialize Socket.IO Server
    const socketServer = new SocketServer(httpServer);
    console.log('🔌 Socket.IO Server initialized');

    // Start listening on HTTP Server instead of directly on Express app
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server is running and listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

bootstrap();
