import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { DevicesService } from './devices.service.js';
import { CreateDeviceDto } from './dto/create-device.dto.js';
import { UpdateDeviceDto } from './dto/update-device.dto.js';

import {
  UseGuards,
} from '@nestjs/common';

import {
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard.js';

import {
  RolesGuard,
} from '../auth/guards/roles.guard.js';

import {
  Roles,
} from '../auth/decorators/roles.decorator.js';

import {
  UserRole,
} from '../users/enums/user-role.enum.js';

@Controller('devices')
@UseGuards(
  JwtAuthGuard, //Bu şu anlama geliyor: /devices altındaki bütün endpoint'ler login gerektiriyor.
  RolesGuard,
)
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateDeviceDto) {
    return this.devicesService.create(dto);
  }

@Get(':id/test-connection')
testConnection(@Param('id') id: string) {
  return this.devicesService.testModbusConnection(id);
}

  @Get()
  findAll() {
    return this.devicesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.devicesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    return this.devicesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.devicesService.remove(id);

    return {
      success: true,
    };
  }
}