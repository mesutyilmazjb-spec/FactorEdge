import { Module } from '@nestjs/common';

import { TelemetryGateway } from './telemetry.gateway.js';

import { AuthModule } from '../auth/auth.module.js';

@Module({
    imports: [
    AuthModule,
  ],
  
  providers: [
    TelemetryGateway,
  ],

  exports: [
    TelemetryGateway,
  ],
})
export class RealtimeModule {}