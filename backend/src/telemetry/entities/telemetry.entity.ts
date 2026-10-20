import {
  Column,
  Entity,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { MachineStatus } from '../enums/machine-status.enum.js';

@Entity('telemetry')
@Index(['deviceId', 'timestamp'])
export class Telemetry {
@PrimaryGeneratedColumn('uuid')
id: string;

  @PrimaryColumn('uuid')
  deviceId: string;

  @Column({
    type: 'bigint',
  })
  productionCount: number;

  @Column({
    type: 'double precision',
  })
  motorTemperature: number;

  @Column({
    type: 'double precision',
  })
  motorCurrent: number;

  @Column({
    type: 'integer',
  })
  scrapCount: number;

  @Column({
    type: 'enum',
    enum: MachineStatus,
  })
  status: MachineStatus;


  @PrimaryColumn({
    type: 'timestamptz',
  })
  timestamp: Date;
}