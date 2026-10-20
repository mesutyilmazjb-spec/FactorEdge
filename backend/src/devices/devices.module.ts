import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Device } from './entities/device.entity.js';
import { DevicesController } from './devices.controller.js';
import { DevicesService } from './devices.service.js';
import { ConnectorsModule } from '../connectors/connectors.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device]),
    ConnectorsModule,
  ],
  controllers: [DevicesController],
  providers: [DevicesService],
    exports: [DevicesService],
})
export class DevicesModule {}
