import { Injectable,NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Device } from './entities/device.entity.js';
import { DeviceStatus } from './enums/device-status.enum.js';
import { CreateDeviceDto } from './dto/create-device.dto.js';
import { UpdateDeviceDto } from './dto/update-device.dto.js';

import { ModbusConnector } from '../connectors/modbus/modbus.connector.js';
import { ModbusDecoder } from '../connectors/modbus/modbus-decoder.js';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,

    private readonly modbusConnector: ModbusConnector,
  ) {}

  async create(dto: CreateDeviceDto): Promise<Device> {
    const device = this.deviceRepository.create(dto);

    return this.deviceRepository.save(device);
  }

  async findAll(): Promise<Device[]> {
    return this.deviceRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException(`Device ${id} not found`);
    }

    return device;
  }

  async update(
    id: string,
    dto: UpdateDeviceDto,
  ): Promise<Device> {
    const device = await this.findOne(id);

    Object.assign(device, dto);

    return this.deviceRepository.save(device);
  }

  async remove(id: string): Promise<void> {
    const device = await this.findOne(id);

    await this.deviceRepository.remove(device);
  }

async updateConnectionStatus(
  id: string,
  status: DeviceStatus,
): Promise<void> {
  await this.deviceRepository.update(
    id,
    {
      connectionStatus: status,
    },
  );
}

async markConnected(
  id: string,
  lastDataAt: Date,
): Promise<void> {
  await this.deviceRepository.update(
    id,
    {
      connectionStatus: DeviceStatus.CONNECTED,
      lastDataAt,
    },
  );
}

async markDisconnected(
  id: string,
): Promise<void> {
  await this.deviceRepository.update(
    id,
    {
      connectionStatus: DeviceStatus.DISCONNECTED,
    },
  );
}

async updateLastDataAt(
  id: string,
  lastDataAt: Date,
): Promise<void> {
  await this.deviceRepository.update(
    id,
    {
      lastDataAt,
    },
  );
}
  async testModbusConnection(id: string) {
  const device = await this.findOne(id);

  await this.modbusConnector.connect(
    device.host,
    device.port,
    device.unitId ?? 1,
  );

 if (!device.registerMap) {
  throw new Error(
    `Modbus register map is not configured for ${device.name}`,
  );
}

const rawData =
  await this.modbusConnector.readRawData(
    device.registerMap,
  );

const telemetry =
  ModbusDecoder.decode(
    device.id,
    rawData,
    device.registerMap,
  );

  return {
    deviceId: device.id,
    deviceName: device.name,
    rawData,
    telemetry,
  };
}

}


// Şu an akış:
// HTTP
//  ↓
// DevicesController
//  ↓
// DevicesService
//  ↓
// Repository<Device>
//  ↓
// TypeORM
//  ↓
// PostgreSQL