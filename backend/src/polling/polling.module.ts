import { Module } from '@nestjs/common';

import { PollingService } from './polling.service.js';
import { DevicesModule } from '../devices/devices.module.js';
import { ConnectorsModule } from '../connectors/connectors.module.js';
import { TelemetryModule } from '../telemetry/telemetry.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';

@Module({
  imports: [
    DevicesModule,
    ConnectorsModule,
    TelemetryModule,
    RealtimeModule
  ],

  providers: [
    PollingService,
  ],
})
export class PollingModule {}