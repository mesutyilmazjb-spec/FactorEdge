import {
  MachineStatus,
} from '../../telemetry/enums/machine-status.enum.js';

import type {
  TelemetryData,
} from '../../telemetry/models/telemetry-data.model.js';

import type {
  ModbusRegisterConfig,
  ModbusRegisterMap,
} from '../../devices/models/modbus-register-map.model.js';

export interface RawModbusData {
  productionCount: number[];
  motorTemperature: number[];
  motorCurrent: number[];
  scrapCount: number[];
  status: number[];
}

export class ModbusDecoder {
  static decode(
    deviceId: string,
    raw: RawModbusData,
    registerMap: ModbusRegisterMap,
  ): TelemetryData {
    const productionCount =
      this.decodeRegister(
        raw.productionCount,
        registerMap.productionCount,
      );

    const motorTemperature =
      this.decodeRegister(
        raw.motorTemperature,
        registerMap.motorTemperature,
      );

    const motorCurrent =
      this.decodeRegister(
        raw.motorCurrent,
        registerMap.motorCurrent,
      );

    const scrapCount =
      this.decodeRegister(
        raw.scrapCount,
        registerMap.scrapCount,
      );

    const statusValue =
      this.decodeRegister(
        raw.status,
        registerMap.status,
      );

    return {
      deviceId,
      productionCount,
      motorTemperature,
      motorCurrent,
      scrapCount,
      status:
        this.decodeStatus(statusValue),
      timestamp: new Date(),
    };
  }

  private static decodeRegister(
    words: number[],
    config: ModbusRegisterConfig,
  ): number {
    let value: number;

    switch (config.dataType) {
      case 'uint16':
        value =
          this.decodeUint16(words);
        break;

      case 'int16':
        value =
          this.decodeInt16(words);
        break;

      case 'uint32':
        value =
          this.decodeUint32(
            words,
            config.wordOrder ??
              'ABCD',
          );
        break;

      case 'float32':
        value =
          this.decodeFloat32(
            words,
            config.wordOrder ??
              'ABCD',
          );
        break;

      default:
        throw new Error(
          `Unsupported Modbus data type: ${String(config.dataType)}`,
        );
    }

    return value * config.scale;
  }

  private static decodeUint16(
    words: number[],
  ): number {
    this.ensureWordCount(
      words,
      1,
      'uint16',
    );

    return words[0] & 0xffff;
  }

  private static decodeInt16(
    words: number[],
  ): number {
    this.ensureWordCount(
      words,
      1,
      'int16',
    );

    const value =
      words[0] & 0xffff;

    return value > 0x7fff
      ? value - 0x10000
      : value;
  }

  private static decodeUint32(
    words: number[],
    wordOrder: 'ABCD' | 'CDAB',
  ): number {
    this.ensureWordCount(
      words,
      2,
      'uint32',
    );

    const buffer =
      this.create32BitBuffer(
        words,
        wordOrder,
      );

    return buffer.readUInt32BE(0);
  }

  private static decodeFloat32(
    words: number[],
    wordOrder: 'ABCD' | 'CDAB',
  ): number {
    this.ensureWordCount(
      words,
      2,
      'float32',
    );

    const buffer =
      this.create32BitBuffer(
        words,
        wordOrder,
      );

    return buffer.readFloatBE(0);
  }

  private static create32BitBuffer(
    words: number[],
    wordOrder: 'ABCD' | 'CDAB',
  ): Buffer {
    const buffer =
      Buffer.alloc(4);

    if (wordOrder === 'ABCD') {
      buffer.writeUInt16BE(
        words[0],
        0,
      );

      buffer.writeUInt16BE(
        words[1],
        2,
      );

      return buffer;
    }

    if (wordOrder === 'CDAB') {
      buffer.writeUInt16BE(
        words[1],
        0,
      );

      buffer.writeUInt16BE(
        words[0],
        2,
      );

      return buffer;
    }

    throw new Error(
      `Unsupported word order: ${String(wordOrder)}`,
    );
  }

  private static ensureWordCount(
    words: number[],
    expected: number,
    dataType: string,
  ): void {
    if (
      !words ||
      words.length < expected
    ) {
      throw new Error(
        `Not enough Modbus registers for ${dataType}. Expected ${expected}, received ${words?.length ?? 0}`,
      );
    }
  }

  private static decodeStatus(
    value: number,
  ): MachineStatus {
    switch (value) {
      case 0:
        return MachineStatus.STOPPED;

      case 1:
        return MachineStatus.RUNNING;

      case 2:
        return MachineStatus.FAULT;

      default:
        throw new Error(
          `Unknown machine status: ${value}`,
        );
    }
  }
}