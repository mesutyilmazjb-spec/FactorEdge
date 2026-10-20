import { Module } from '@nestjs/common';

import { IngestionService } from './ingestion.service.js';

import { DevicesModule } from '../devices/devices.module.js';
import { ConnectorsModule } from '../connectors/connectors.module.js';
import { TelemetryModule } from '../telemetry/telemetry.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';

@Module({
  imports: [
    DevicesModule,
    ConnectorsModule,
    TelemetryModule,
    RealtimeModule,
  ],

  providers: [
    IngestionService,
  ],
})
export class IngestionModule {}