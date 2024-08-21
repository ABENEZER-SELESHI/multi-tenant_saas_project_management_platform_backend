import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { env } from '../config/env';
import { logger } from '../utils/logger';

interface SocketAuthData {
  userId: string;
  organizationId?: string;
}

const getSocketData = (socket: Socket): SocketAuthData => socket.data as SocketAuthData;

export let io: Server | null = null;

export const initWebSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
    path: '/socket.io',
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      getSocketData(socket).userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const data = getSocketData(socket);
    const userId = data.userId;
    logger.debug('WebSocket connected', { userId, socketId: socket.id });

    void socket.join(`user:${userId}`);

    socket.on('join:organization', (orgId: string) => {
      void socket.join(`org:${orgId}`);
      data.organizationId = orgId;
    });

    socket.on('join:project', (projectId: string) => {
      const orgId = data.organizationId;
      if (orgId) {
        void socket.join(`org:${orgId}:project:${projectId}`);
      }
    });

    socket.on('join:task', (taskId: string) => {
      const orgId = data.organizationId;
      if (orgId) {
        void socket.join(`org:${orgId}:task:${taskId}`);
      }
    });

    socket.on('presence:update', (presence: { projectId: string; status: string }) => {
      const orgId = data.organizationId;
      if (orgId) {
        socket.to(`org:${orgId}:project:${presence.projectId}`).emit('presence:update', {
          userId,
          status: presence.status,
        });
      }
    });

    socket.on('disconnect', () => {
      logger.debug('WebSocket disconnected', { userId });
    });
  });

  return io;
};

export const emitToProject = (
  organizationId: string,
  projectId: string,
  event: string,
  payload: unknown,
): void => {
  io?.to(`org:${organizationId}:project:${projectId}`).emit(event, payload);
};

export const emitToUser = (userId: string, event: string, payload: unknown): void => {
  io?.to(`user:${userId}`).emit(event, payload);
};

export const emitToTask = (
  organizationId: string,
  taskId: string,
  event: string,
  payload: unknown,
): void => {
  io?.to(`org:${organizationId}:task:${taskId}`).emit(event, payload);
};
