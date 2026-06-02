import { Socket } from 'socket.io';
import { verifyAccessToken } from '../../utils/jwt';

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  // Client can send token in handshake.auth or as an Authorization header
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }

  try {
    const decoded = verifyAccessToken(token);
    // Inject user ID into the socket connection instance for tracking
    socket.data.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid or expired token'));
  }
};
