import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';

import { Telemetry } from './entities/telemetry.entity.js';
import { TelemetryData } from './models/telemetry-data.model.js';

import { randomUUID } from 'node:crypto';

@Injectable()
export class TelemetryService {
  constructor(
    @InjectRepository(Telemetry)
    private readonly telemetryRepository: Repository<Telemetry>,
  ) {}

  async save(data: TelemetryData): Promise<Telemetry> {
  const telemetry =
  this.telemetryRepository.create({
    ...data,
    id: randomUUID(),
  });
    return this.telemetryRepository.save(telemetry);
  }

  async getLastHour(
    deviceId: string,
  ): Promise<Telemetry[]> {
    const oneHourAgo =
      new Date(Date.now() - 60 * 60 * 1000);

    return this.telemetryRepository.find({
      where: {
        deviceId,
        timestamp: MoreThanOrEqual(oneHourAgo),
      },

      order: {
        timestamp: 'ASC',
      },
    });
  }
}