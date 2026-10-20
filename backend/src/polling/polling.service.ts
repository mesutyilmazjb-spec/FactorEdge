import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { DevicesService } from '../devices/devices.service.js';
import { DeviceStatus } from '../devices/enums/device-status.enum.js';

import { ModbusConnector } from '../connectors/modbus/modbus.connector.js';
import { ModbusDecoder } from '../connectors/modbus/modbus-decoder.js';
import { TelemetryService } from '../telemetry/telemetry.service.js';
import { DeviceProtocol } from '../devices/enums/device-protocol.enum.js';

import { TelemetryGateway } from '../realtime/telemetry.gateway.js';

@Injectable()
export class PollingService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger =
    new Logger(PollingService.name);

  private timer?: NodeJS.Timeout;

  private isPolling = false;

  private lastHeartbeat?: number;

  private lastHeartbeatChangeAt?: number;

  private readonly heartbeatTimeoutMs = 10_000;

  constructor(
    private readonly devicesService: DevicesService,
    private readonly modbusConnector: ModbusConnector,
    private readonly telemetryService: TelemetryService,
      private readonly telemetryGateway: TelemetryGateway,
  ) {}

  onModuleInit() {
    this.logger.log('Modbus polling started');

    this.timer = setInterval(() => {
      void this.poll();
    }, 1000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async poll(): Promise<void> {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;

    try {
      const devices =
        await this.devicesService.findAll();

      const modbusDevices =
        devices.filter(
          device =>
            device.protocol === DeviceProtocol.MODBUS,
        );

      for (const device of modbusDevices) {
        try {
          await this.pollDevice(device);
        } catch (error) {
          this.logger.error(
            `Polling failed for ${device.name}: ${
              error instanceof Error
                ? error.message
                : 'Unknown error'
            }`,
          );
        }
      }
    } finally {
      this.isPolling = false;
    }
  }
private checkHeartbeat(heartbeat: number): void {
  const now = Date.now();

  if (
    this.lastHeartbeat === undefined ||
    this.lastHeartbeat !== heartbeat
  ) {
    this.lastHeartbeat = heartbeat;
    this.lastHeartbeatChangeAt = now;
    return;
  }

  if (
    this.lastHeartbeatChangeAt !== undefined &&
    now - this.lastHeartbeatChangeAt >=
      this.heartbeatTimeoutMs
  ) {
    throw new Error(
      'Modbus heartbeat timeout: writer is not updating'
    );
  }
}
private async pollDevice(
  device: any,
): Promise<void> {
  try {
    /*
     * Bağlantı yoksa yeniden bağlanmayı dene.
     */
/*
 * Her polling cycle'da connect çağırıyoruz.
 *
 * ModbusConnector kendi içinde:
 *
 * - Aynı config + bağlantı açık -> hiçbir şey yapmaz
 * - Config değişmiş -> eski bağlantıyı kapatır
 * - Yeni host/port/unitId ile yeniden bağlanır
 * - Bağlantı kopmuş -> reconnect yapar
 */
if (!this.modbusConnector.isConnected()) {
  await this.devicesService
    .updateConnectionStatus(
      device.id,
      DeviceStatus.CONNECTING,
    );

  this.telemetryGateway  //socket dashboard a gönder
    .publishDeviceStatus(
      device.id,
      DeviceStatus.CONNECTING,
    );
}

await this.modbusConnector.connect(
  device.host,
  device.port,
  device.unitId ?? 1,
);
    /*
     * Modbus register'larını oku.
     *
     * Ubuntu kapanırsa / bağlantı koparsa
     * burası exception fırlatabilir.
     */
  const heartbeat =
  await this.modbusConnector.readHeartbeat();

  this.checkHeartbeat(heartbeat);
    if (!device.registerMap) {
  throw new Error(
    `Modbus register map is not configured for ${device.name}`,
  );
}

const rawData =
  await this.modbusConnector.readRawData(
    device.registerMap,
  );

    /*
     * Modbus-specific register formatını
     * ortak TelemetryData modeline dönüştür.
     */
  const telemetry =
  ModbusDecoder.decode(
    device.id,
    rawData,
    device.registerMap,
  );
    /*
     * TimescaleDB'ye kaydet.
     */
    await this.telemetryService.save(
      telemetry,
    );

    /*
     * Başarılı veri geldiyse cihaz gerçekten
     * CONNECTED kabul edilir.
     */
    await this.devicesService  //Bu kod, başarılı okuma ve kayıt işleminden sonra cihazı CONNECTED olarak işaretliyor.Fakat başarılı okuma, Ubuntu Writer'ın gerçekten yeni veri gönderdiğini kanıtlamıyor.
      .markConnected(
        device.id,
        telemetry.timestamp,
      );

    /*
     * React dashboard'a canlı telemetry gönder.
     */
    this.telemetryGateway
      .publishTelemetry(
        telemetry,
      );

    /*
     * React'e connection status gönder.
     */
    this.telemetryGateway
      .publishDeviceStatus(
        device.id,
        DeviceStatus.CONNECTED,
      );

    this.logger.log(
      `${device.name} | ` +
      `Production=${telemetry.productionCount} | ` +
      `Temp=${telemetry.motorTemperature.toFixed(2)}°C | ` +
      `Current=${telemetry.motorCurrent.toFixed(2)}A | ` +
      `Scrap=${telemetry.scrapCount}`,
    );
  } catch (error) {
    /*
     * Ubuntu kapanması,
     * ECONNRESET,
     * timeout,
     * socket close vb.
     * hatalar burada karşılanır.
     */

    const message =
      error instanceof Error
        ? error.message
        : 'Unknown Modbus error';

    this.logger.warn(
      `${device.name} disconnected: ${message}`,
    );

    /*
     * DB durumunu DISCONNECTED yap.
     */
    try {
      await this.devicesService
        .markDisconnected(
          device.id,
        );
    } catch (statusError) {
      const statusMessage =
        statusError instanceof Error
          ? statusError.message
          : 'Unknown status error';

      this.logger.error(
        `Could not update device status: ${statusMessage}`,
      );
    }

    /*
     * React dashboard'a bağlantının
     * koptuğunu bildir.
     */
    try {
      this.telemetryGateway
        .publishDeviceStatus(
          device.id,
          DeviceStatus.DISCONNECTED,
        );
    } catch (gatewayError) {
      const gatewayMessage =
        gatewayError instanceof Error
          ? gatewayError.message
          : 'Unknown gateway error';

      this.logger.error(
        `Could not publish device status: ${gatewayMessage}`,
      );
    }

    /*
     * Bozuk/eski Modbus client'ı temizle.
     *
     * Sonraki polling cycle yeni bir
     * client oluşturarak reconnect deneyecek.
     */
    try {
      await this.modbusConnector
        .disconnect();
    } catch (disconnectError) {
      const disconnectMessage =
        disconnectError instanceof Error
          ? disconnectError.message
          : 'Unknown disconnect error';

      this.logger.warn(
        `Modbus disconnect cleanup failed: ${disconnectMessage}`,
      );
    }
  }
}
}