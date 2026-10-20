import { MachineStatus } from '../../telemetry/enums/machine-status.enum.js';
import { TelemetryData } from '../../telemetry/models/telemetry-data.model.js';

export interface MqttTelemetryMessage {
  productionCount: number;
  motorTemperature: number;
  motorCurrent: number;
  scrapCount: number;
  status: number;
  timestamp: string;
}

export class MqttDecoder {
  static decode(
    deviceId: string,
    message: MqttTelemetryMessage,
  ): TelemetryData {
    if (!message.timestamp) {
      throw new Error('MQTT timestamp is required');
    }

    const timestamp = new Date(message.timestamp);

    if (Number.isNaN(timestamp.getTime())) {
      throw new Error(
        `Invalid MQTT timestamp: ${message.timestamp}`,
      );
    }

    return {
      deviceId,
      productionCount: message.productionCount,
      motorTemperature: message.motorTemperature,
      motorCurrent: message.motorCurrent,
      scrapCount: message.scrapCount,
      status: this.decodeStatus(message.status),
      timestamp,
    };
  }

  private static decodeStatus(
    status: number,
  ): MachineStatus {
    switch (status) {
      case 0:
        return MachineStatus.STOPPED;

      case 1:
        return MachineStatus.RUNNING;

      case 2:
        return MachineStatus.FAULT;

      default:
        throw new Error(
          `Unknown MQTT machine status: ${status}`,
        );
    }
  }
}