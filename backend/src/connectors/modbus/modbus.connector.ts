import {
  Injectable,
  Logger,
} from '@nestjs/common';

import { createRequire } from 'node:module';

import type {
  ModbusRegisterConfig,
  ModbusRegisterMap,
} from '../../devices/models/modbus-register-map.model.js';

const require = createRequire(import.meta.url);
const ModbusRTU = require('modbus-serial');

@Injectable()
export class ModbusConnector {
  private readonly logger =
    new Logger(ModbusConnector.name);

  private client: any;

  private connecting = false;

private currentHost?: string;
private currentPort?: number;
private currentUnitId?: number;

private resolveDeviceHost(host: string): string {
  const isDocker =
    process.env.RUNNING_IN_DOCKER === 'true';

  if (
    isDocker &&
    (host === '127.0.0.1' || host === 'localhost')
  ) {
    return 'host.docker.internal';
  }

  return host;
}

  constructor() {
    this.createClient();
  }

  private createClient(): void {
    const client = new ModbusRTU();

    client.setTimeout(3000);

    /*
     * modbus-serial TCP portunun altında
     * Node net.Socket bulunuyor.
     *
     * Ubuntu/PLC aniden kapanırsa ECONNRESET
     * buradan gelebilir.
     */
    const port = client._port;

    if (port) {
      port.on?.(
        'error',
        (error: Error) => {
          this.logger.warn(
            `Modbus socket error: ${error.message}`,
          );
        },
      );

      port.on?.(
        'close',
        () => {
          this.logger.warn(
            'Modbus socket closed',
          );
        },
      );
    }

    this.client = client;
  }

async connect(
  host: string,
  port: number,
  unitId: number,
): Promise<void> {

  const resolvedHost =
    this.resolveDeviceHost(host);

  const sameConfiguration =
    this.client?.isOpen &&
    this.currentHost === host &&
    this.currentPort === port &&
    this.currentUnitId === unitId;

  // Aynı cihaza zaten bağlıysak
  // yeniden bağlantı kurma.
  if (sameConfiguration) {
    return;
  }

  if (this.connecting) {
    throw new Error(
      'Modbus connection already in progress',
    );
  }

  this.connecting = true;

  try {
    /*
     * Açık bağlantı olsa bile config
     * değişmiş olabilir.
     *
     * Eski client kapatılır ve yeni
     * konfigürasyonla oluşturulur.
     */
    await this.destroyClient();

    this.createClient();

    const client = this.client;

    client.setTimeout(3000);

    await new Promise<void>(
      (resolve, reject) => {
        client.connectTCP(
          resolvedHost,
          {
            port,
          },
          (
            error: Error | null,
          ) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          },
        );
      },
    );

    client.setID(unitId);

    // Bağlantı başarılı olduktan
    // sonra aktif config'i sakla.
    this.currentHost = host;
    this.currentPort = port;
    this.currentUnitId = unitId;

    this.logger.log(
      `Modbus connected: ${host}:${port} | Unit ID=${unitId}`,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    this.logger.warn(
      `Modbus connection failed: ${message}`,
    );

    await this.destroyClient();

    throw error;
  } finally {
    this.connecting = false;
  }
}

  async disconnect(): Promise<void> {
    await this.destroyClient();
  }

  isConnected(): boolean {
    return Boolean(
      this.client?.isOpen,
    );
  }

async readRawData(
  registerMap: ModbusRegisterMap,
) {
  const client = this.client;

  if (
    !client ||
    !client.isOpen
  ) {
    throw new Error(
      'Modbus client is not connected',
    );
  }

  try {
    const productionCount =
      await this.readRegister(
        registerMap.productionCount,
      );

    const motorTemperature =
      await this.readRegister(
        registerMap.motorTemperature,
      );

    const motorCurrent =
      await this.readRegister(
        registerMap.motorCurrent,
      );

    const scrapCount =
      await this.readRegister(
        registerMap.scrapCount,
      );

    const status =
      await this.readRegister(
        registerMap.status,
      );

    return {
      productionCount,
      motorTemperature,
      motorCurrent,
      scrapCount,
      status,
    };
  } catch (error) {
    await this.destroyClient();

    throw error;
  }
}

async readHeartbeat(): Promise<number> {
  const client = this.client;

  if (!client || !client.isOpen) {
    throw new Error(
      'Modbus client is not connected',
    );
  }

  // Holding Register 40022
  // Zero-based address = 21
  const response =
    await client.readHoldingRegisters(21, 1);

  return response.data[0];
}

private async readRegister(
  config: ModbusRegisterConfig,
): Promise<number[]> {
  const client = this.client;

  if (
    !client ||
    !client.isOpen
  ) {
    throw new Error(
      'Modbus client is not connected',
    );
  }

  const address =
    this.toZeroBasedAddress(
      config.address,
      config.functionCode,
    );

  const length =
    this.getRegisterLength(
      config.dataType,
    );

  let response;

  switch (config.functionCode) {
    case 3:
      response =
        await client.readHoldingRegisters(
          address,
          length,
        );
      break;

    case 4:
      response =
        await client.readInputRegisters(
          address,
          length,
        );
      break;

    default:
      throw new Error(
        `Unsupported Modbus function code: ${config.functionCode}`,
      );
  }

  return response.data;
}

private toZeroBasedAddress(
  address: number,
  functionCode: 3 | 4,
): number {
  if (functionCode === 4) {
    if (
      address < 30001 ||
      address > 39999
    ) {
      throw new Error(
        `Invalid input register address: ${address}`,
      );
    }

    return address - 30001;
  }

  if (functionCode === 3) {
    if (
      address < 40001 ||
      address > 49999
    ) {
      throw new Error(
        `Invalid holding register address: ${address}`,
      );
    }

    return address - 40001;
  }

  throw new Error(
    `Unsupported Modbus function code: ${functionCode}`,
  );
}

private getRegisterLength(
  dataType:
    | 'uint16'
    | 'int16'
    | 'uint32'
    | 'float32',
): number {
  switch (dataType) {
    case 'uint32':
    case 'float32':
      return 2;

    case 'uint16':
    case 'int16':
      return 1;

    default:
      throw new Error(
        `Unsupported Modbus data type: ${String(dataType)}`,
      );
  }
}

  private async destroyClient():
    Promise<void> {
    const client =
      this.client;

    /*
     * Önce referansı koparıyoruz.
     *
     * Böylece sonraki polling aynı
     * client'ı tekrar kullanamaz.
     */
    this.client = undefined;
this.currentHost = undefined;
this.currentPort = undefined;
this.currentUnitId = undefined;
    if (!client) {
      return;
    }

    try {
      if (client.isOpen) {
        client.close();
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown close error';

      this.logger.warn(
        `Modbus close error: ${message}`,
      );
    }
  }
}