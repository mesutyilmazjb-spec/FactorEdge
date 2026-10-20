import {
  Controller,
  Get,
  Param,
} from '@nestjs/common';

import { TelemetryService } from './telemetry.service.js';

import {
  UseGuards,
} from '@nestjs/common';

import {
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard.js';

@Controller('telemetry')
@UseGuards(JwtAuthGuard)
@Controller('telemetry')
export class TelemetryController {
  constructor(
    private readonly telemetryService: TelemetryService,
  ) {}

  @Get(':deviceId/history')
  getHistory(
    @Param('deviceId') deviceId: string,
  ) {
    return this.telemetryService.getLastHour(
      deviceId,
    );
  }
}