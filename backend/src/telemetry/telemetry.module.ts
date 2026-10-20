import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Telemetry } from './entities/telemetry.entity.js';
import { TelemetryService } from './telemetry.service.js';
import { TelemetryController } from './telemetry.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Telemetry]),
  ],

  providers: [
    TelemetryService,
    TelemetryController
  ],

  exports: [
    TelemetryService,
  ],

  controllers: [TelemetryController],
})
export class TelemetryModule {}