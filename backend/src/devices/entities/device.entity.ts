import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { DeviceProtocol } from '../enums/device-protocol.enum.js';
import { DeviceStatus } from '../enums/device-status.enum.js';

import type {
  ModbusRegisterMap,
} from '../models/modbus-register-map.model.js';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: DeviceProtocol,
  })
  protocol: DeviceProtocol;

  @Column()
  host: string;

  @Column()
  port: number;

  @Column({ nullable: true })
  unitId?: number;

  @Column({ nullable: true })
  topic?: string;

  @Column({
    type: 'enum',
    enum: DeviceStatus,
    default: DeviceStatus.DISCONNECTED,
  })
  connectionStatus: DeviceStatus;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  lastDataAt?: Date;

  @Column({
  type: 'jsonb',
  nullable: true,
})
registerMap?: ModbusRegisterMap;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}