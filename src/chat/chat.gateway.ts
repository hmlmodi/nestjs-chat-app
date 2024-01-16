// src/chat/chat.gateway.ts

import {
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
  } from '@nestjs/websockets';
  import { Socket, Server } from 'socket.io';
  import { UserService } from '../user/user.service';
  import { MessageService } from '../message/message.service';
  
  @WebSocketGateway()
  export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
  
    constructor(
      private readonly userService: UserService,
      private readonly messageService: MessageService,
    ) {}
  
    async handleConnection(client: Socket) {
      console.log(`Client connected: ${client.id}`);
    }
  
    async handleDisconnect(client: Socket) {
      console.log(`Client disconnected: ${client.id}`);
    }
  
    @SubscribeMessage('message')
    async handleMessage(client: Socket, payload: any) {
      const senderUsername = payload.sender;
      const receiverUsername = payload.receiver;
  
      const sender = await this.userService.findUser(senderUsername);
      const receiver = await this.userService.findUser(receiverUsername);
  
      if (sender && receiver) {
        const message = await this.messageService.createMessage(sender, receiver, payload.content);
  
        // Emit the message to the sender
        this.server.to(client.id).emit('message', {
          sender: sender.username,
          receiver: receiver.username,
          content: message.content,
          createdAt: message.createdAt,
        });
  
        // Emit the message to the receiver (if online)
        const receiverSocket = this.server.sockets.sockets[receiver.id];
        if (receiverSocket) {
          receiverSocket.emit('message', {
            sender: sender.username,
            receiver: receiver.username,
            content: message.content,
            createdAt: message.createdAt,
          });
        }
      }
    }
  }
  