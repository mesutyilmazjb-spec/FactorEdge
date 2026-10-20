import { MachineStatus } from '../enums/machine-status.enum.js';

export interface TelemetryData {
  deviceId: string;

  productionCount: number;

  motorTemperature: number;

  motorCurrent: number;

  scrapCount: number;

  status: MachineStatus;

  timestamp: Date;
}