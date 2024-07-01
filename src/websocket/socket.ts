import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface SocketUser {
  userId: string;
  organizationId?: string;
}

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
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;
    logger.debug('WebSocket connected', { userId, socketId: socket.id });

    socket.join(`user:${userId}`);

    socket.on('join:organization', (orgId: string) => {
      socket.join(`org:${orgId}`);
      socket.data.organizationId = orgId;
    });

    socket.on('join:project', (projectId: string) => {
      const orgId = socket.data.organizationId as string | undefined;
      if (orgId) {
        socket.join(`org:${orgId}:project:${projectId}`);
      }
    });

    socket.on('join:task', (taskId: string) => {
      const orgId = socket.data.organizationId as string | undefined;
      if (orgId) {
        socket.join(`org:${orgId}:task:${taskId}`);
      }
    });

    socket.on('presence:update', (data: { projectId: string; status: string }) => {
      const orgId = socket.data.organizationId as string | undefined;
      if (orgId) {
        socket.to(`org:${orgId}:project:${data.projectId}`).emit('presence:update', {
          userId,
          status: data.status,
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
  data: unknown,
): void => {
  io?.to(`org:${organizationId}:project:${projectId}`).emit(event, data);
};

export const emitToUser = (userId: string, event: string, data: unknown): void => {
  io?.to(`user:${userId}`).emit(event, data);
};

export const emitToTask = (
  organizationId: string,
  taskId: string,
  event: string,
  data: unknown,
): void => {
  io?.to(`org:${organizationId}:task:${taskId}`).emit(event, data);
};
