import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer, } from '@nestjs/websockets';
import { Server, Socket }                                                                                 from 'socket.io';
import { Injectable, Logger }                                                                             from '@nestjs/common';
import { OnEvent }                                                                                        from '@nestjs/event-emitter';

@WebSocketGateway({cors: {origin: '*', credentials: true}})
@Injectable()
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('NotificationsGateway');
  private connectedClients: Map<string, { socket: Socket; userId?: string }> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${ client.id }`);
    this.connectedClients.set(client.id, {socket: client});
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${ client.id }`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('register')
  handleRegister(client: Socket, payload: { userId: string, role: string }) {
    this.logger.log(`User registered: ${ payload.userId } with role: ${ payload.role }`);

    // Store user information with the socket connection
    this.connectedClients.set(client.id, {
      socket: client,
      userId: payload.userId
    });

    // Join room based on role for targeted notifications
    void client.join(payload.role);

    return {status: 'registered'};
  }

  // Notify a specific user
  @OnEvent('notifications.user', {async: true})
  notifyUser(userId: string, event: string, data: any) {
    this.logger.log(`Notifying user ${ userId } of event: ${ event }`);

    // Find all sockets associated with this user
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [ _, client ] of this.connectedClients.entries()) {
      if (client.userId === userId)
        client.socket.emit(event, data);
    }
  }

  // Notify users by role
  notifyRole(role: string, event: string, data: any) {
    this.logger.log(`Notifying all users with role ${ role } of event: ${ event }`);
    this.server.to(role).emit(event, data);
  }

  // Broadcast to all connected clients
  broadcastToAll(event: string, data: any) {
    this.logger.log(`Broadcasting event ${ event } to all connected clients`);
    this.server.emit(event, data);
  }
}
