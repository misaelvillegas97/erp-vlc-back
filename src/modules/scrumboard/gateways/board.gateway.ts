import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
}                         from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MemberService }  from '@modules/scrumboard/services/member.service';
import { Logger }         from '@nestjs/common';
import { JwtService }     from '@nestjs/jwt';
import { AllConfigType }  from '@core/config/config.type';
import { ConfigService }  from '@nestjs/config';

@WebSocketGateway({cors: {origin: '*'}, namespace: 'ws/board'})
export class BoardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  connectedUsers: Map<string, Socket[]> = new Map();
  private readonly logger = new Logger(BoardGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly memberService: MemberService,
    private configService: ConfigService<AllConfigType>,
  ) {}

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      const {userId} = await this.decodeToken(client);

      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, []);
      }

      this.connectedUsers.get(userId).push(client);
      this.logger.log(Array.from(this.connectedUsers).map(([ key, value ]) => ({userId: key, socketConnections: value.length})));
    } catch (e) {
      console.error(e);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.forEach((sockets, userId) => {
      this.connectedUsers.set(
        userId,
        sockets.filter(socket => socket.id !== client.id)
      );
      if (this.connectedUsers.get(userId).length === 0) {
        this.connectedUsers.delete(userId);
      }
    });
  }

  @SubscribeMessage('joinBoard')
  async joinBoard(@MessageBody() boardId: string, @ConnectedSocket() client: Socket) {
    await client.join('board_' + boardId);
    return this.server.to('board_' + boardId).emit('joinedBoard', 'User joined to board ' + boardId);
  }

  @SubscribeMessage('leaveBoard')
  async leaveBoard(@MessageBody() boardId: string, @ConnectedSocket() client: Socket) {
    await client.leave(boardId);
    return this.server.to(boardId).emit('leftBoard', 'User left from board ' + boardId);
  }

  private async decodeToken(client: Socket) {
    const decoded = await this.jwtService.verifyAsync(client.handshake.auth.token, {
      secret: this.configService.getOrThrow<AllConfigType>('auth.confirmEmailSecret', {infer: true}),
    });

    return {
      userId: decoded.id
    };
  }
}
