import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { TelemetryData } from '../telemetry/models/telemetry-data.model.js';

import {
  JwtService,
} from '@nestjs/jwt';


@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TelemetryGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger =
    new Logger(TelemetryGateway.name);

constructor(
  private readonly jwtService:
    JwtService,
) {}

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(
      `WebSocket connected: ${client.id}`,
    );
  }

  handleDisconnect(client: Socket) {
    this.logger.log(
      `WebSocket disconnected: ${client.id}`,
    );
  }

  publishTelemetry(
    telemetry: TelemetryData,
  ): void {
    this.server.emit(
      'telemetry',
      telemetry,
    );
  }

  publishDeviceStatus(
    deviceId: string,
    status: string,
  ): void {
    this.server.emit(
      'device-status',
      {
        deviceId,
        status,
        timestamp: new Date(),
      },
    );
  }
}