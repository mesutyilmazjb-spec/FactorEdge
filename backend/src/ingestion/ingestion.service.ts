import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { DevicesService } from '../devices/devices.service.js';
import { MqttConnector } from '../connectors/mqtt/mqtt.connector.js';
import { TelemetryService } from '../telemetry/telemetry.service.js';
import { TelemetryGateway } from '../realtime/telemetry.gateway.js';

import { DeviceProtocol } from '../devices/enums/device-protocol.enum.js';
import { DeviceStatus } from '../devices/enums/device-status.enum.js';
import { TelemetryData } from '../telemetry/models/telemetry-data.model.js';

@Injectable()
export class IngestionService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger =
    new Logger(IngestionService.name);

  /*
   * Her MQTT cihazından en son ne zaman
   * telemetry aldığımızı tutuyoruz.
   */
  private readonly lastTelemetryAt =
    new Map<string, number>();

  /*
   * Son bilinen connection status.
   *
   * Böylece her saniye gereksiz yere
   * CONNECTED event'i göndermiyoruz.
   */
  private readonly deviceStatuses =
    new Map<string, DeviceStatus>();

  /*
   * 5 saniye boyunca veri gelmezse
   * cihazı disconnected kabul ediyoruz.
   */
  private readonly staleTimeoutMs = 5000;

  private staleCheckInterval?: NodeJS.Timeout;
  private configSyncInterval?: NodeJS.Timeout;

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

  constructor(
    private readonly devicesService:
      DevicesService,

    private readonly mqttConnector:
      MqttConnector,

    private readonly telemetryService:
      TelemetryService,

    private readonly telemetryGateway:
      TelemetryGateway,
  ) {}

  onModuleInit(): void {
    /*
     * Önce MQTT callback'lerini kaydet.
     */
    this.registerCallbacks();

    /*
     * Her saniye MQTT cihazlarının
     * son veri zamanını kontrol et.
     */
    this.staleCheckInterval =
      setInterval(() => {
        void this.checkStaleDevices();
      }, 1000);

    /*
     * NestJS startup'ını MQTT initialization
     * nedeniyle bloklamıyoruz.
     */
    void this.initializeMqttDevices();

    /*
 * Device Management üzerinden MQTT
 * config değişikliklerini runtime'da algıla.
 */
this.configSyncInterval =
  setInterval(() => {
    void this.syncMqttDevices();
  }, 2000);
  }

  onModuleDestroy(): void {
    if (this.staleCheckInterval) {
      clearInterval(
        this.staleCheckInterval,
      );
    }
if (this.configSyncInterval) {
  clearInterval(
    this.configSyncInterval,
  );
}

  }

  private async initializeMqttDevices():
    Promise<void> {
    try {
      const devices =
        await this.devicesService.findAll();

      const mqttDevices =
        devices.filter(
          device =>
            device.protocol ===
            DeviceProtocol.MQTT,
        );

      this.logger.log(
        `Found ${mqttDevices.length} MQTT device(s)`,
      );

      for (const device of mqttDevices) {
        if (!device.topic) {
          this.logger.warn(
            `MQTT device ${device.name} has no topic`,
          );

          continue;
        }

        /*
         * Broker bağlantısı kurulmaya çalışılıyor.
         * Henüz telemetry gelmediği için
         * CONNECTED demiyoruz.
         */
        await this.devicesService
          .updateConnectionStatus(
            device.id,
            DeviceStatus.CONNECTING,
          );

        this.deviceStatuses.set(
          device.id,
          DeviceStatus.CONNECTING,
        );

        this.logger.log(
          `Initializing MQTT device: ${device.name}`,
        );

        this.mqttConnector.connectDevice({
          deviceId: device.id,
          host: this.resolveDeviceHost(device.host),
          port: device.port,
          topic: device.topic,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown MQTT initialization error';

      this.logger.error(
        `MQTT initialization failed: ${message}`,
      );
    }
  }
private async syncMqttDevices():
  Promise<void> {
  try {
    const devices =
      await this.devicesService.findAll();

    const mqttDevices =
      devices.filter(
        device =>
          device.protocol ===
          DeviceProtocol.MQTT,
      );

    for (const device of mqttDevices) {
      if (!device.topic) {
        continue;
      }

      this.mqttConnector.connectDevice({
        deviceId: device.id,
        host: this.resolveDeviceHost(device.host),
        port: device.port,
        topic: device.topic,
      });

      /*
       * Daha önce hiç telemetry alınmadıysa bile
       * stale kontrolünün çalışabilmesi için
       * cihazı takip etmeye başla.
       */
      if (
        !this.lastTelemetryAt.has(
          device.id,
        )
      ) {
        this.lastTelemetryAt.set(
          device.id,
          Date.now(),
        );
      }
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown MQTT sync error';

    this.logger.error(
      `MQTT config sync failed: ${message}`,
    );
  }
}
  private registerCallbacks(): void {
    /*
     * MQTT telemetry geldi.
     */
    this.mqttConnector.onTelemetry(
      telemetry => {
        void this.handleTelemetry(
          telemetry,
        );
      },
    );

    /*
     * Buradaki connected,
     * broker bağlantısının hazır olduğu anlamına gelir.
     *
     * Cihazın gerçekten CONNECTED olduğuna
     * telemetry geldiğinde karar vereceğiz.
     */
    this.mqttConnector.onConnected(
      deviceId => {
        void this.handleConnected(
          deviceId,
        );
      },
    );

    /*
     * Broker bağlantısı tamamen koptu.
     */
    this.mqttConnector.onDisconnected(
      deviceId => {
        void this.handleDisconnected(
          deviceId,
        );
      },
    );
  }

private async handleTelemetry(
  telemetry: TelemetryData,
): Promise<void> {
  try {
    // Mesajın içindeki timestamp değil:
    // Backend'in mesajı gerçekten aldığı an.
    this.lastTelemetryAt.set(
      telemetry.deviceId,
      Date.now(),
    );

    await this.telemetryService.save(
      telemetry,
    );

    await this.devicesService
      .updateLastDataAt(
        telemetry.deviceId,
        telemetry.timestamp,
      );

    // Önce status'u düzelt.
    await this.changeStatus(
      telemetry.deviceId,
      DeviceStatus.CONNECTED,
    );

    // Sonra canlı veriyi yayınla.
    this.telemetryGateway
      .publishTelemetry(
        telemetry,
      );

    this.logger.log(
      `MQTT ${telemetry.deviceId} | ` +
      `Production=${telemetry.productionCount} | ` +
      `Temp=${telemetry.motorTemperature.toFixed(2)}°C | ` +
      `Current=${telemetry.motorCurrent.toFixed(2)}A | ` +
      `Scrap=${telemetry.scrapCount}`,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error';

    this.logger.error(
      `MQTT telemetry processing failed: ${message}`,
    );
  }
}

  private async handleConnected(
    deviceId: string,
  ): Promise<void> {
    /*
     * ÖNEMLİ:
     *
     * Broker'a bağlanmış olmamız,
     * Production Line 2'nin veri gönderdiği
     * anlamına gelmez.
     *
     * O yüzden burada:
     *
     * DeviceStatus.CONNECTED
     *
     * yapmıyoruz.
     */

    this.logger.log(
      `MQTT broker connection ready for device ${deviceId}`,
    );
  }

  private async handleDisconnected(
    deviceId: string,
  ): Promise<void> {
    /*
     * Broker bağlantısı giderse direkt
     * disconnected kabul edebiliriz.
     */
    await this.changeStatus(
      deviceId,
      DeviceStatus.DISCONNECTED,
    );
  }

  private async checkStaleDevices():
    Promise<void> {
    const now = Date.now();

    for (
      const [
        deviceId,
        lastTelemetryAt,
      ] of this.lastTelemetryAt.entries()
    ) {
      const elapsed =
        now - lastTelemetryAt;

      /*
       * Şimdilik debug amacıyla bırakıyoruz.
       *
       * Sistem düzgün çalıştıktan sonra
       * kaldırabiliriz.
       */
      this.logger.debug(
        `MQTT stale check | ` +
        `device=${deviceId} | ` +
        `elapsed=${elapsed}ms`,
      );

      /*
       * 5 saniyeden uzun süredir
       * telemetry yoksa cihaz stale.
       */
      if (
        elapsed >=
        this.staleTimeoutMs
      ) {
        await this.changeStatus(
          deviceId,
          DeviceStatus.DISCONNECTED,
        );
      }
    }
  }

private async changeStatus(
  deviceId: string,
  newStatus: DeviceStatus,
): Promise<void> {
  const currentStatus =
    this.deviceStatuses.get(
      deviceId,
    );

  if (currentStatus !== newStatus) {
    this.logger.log(
      `MQTT device ${deviceId}: ` +
      `${currentStatus ?? 'unknown'} -> ${newStatus}`,
    );

    this.deviceStatuses.set(
      deviceId,
      newStatus,
    );

    await this.devicesService
      .updateConnectionStatus(
        deviceId,
        newStatus,
      );
  }

  // UI state'ini her çağrıda senkronize ediyoruz.
  this.telemetryGateway
    .publishDeviceStatus(
      deviceId,
      newStatus,
    );
}
}