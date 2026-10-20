import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';

import {
  connect,
  MqttClient,
} from 'mqtt';

import {
  MqttDecoder,
  MqttTelemetryMessage,
} from './mqtt-decoder.js';

import { TelemetryData } from '../../telemetry/models/telemetry-data.model.js';

export interface MqttDeviceConfig {
  deviceId: string;
  host: string;
  port: number;
  topic: string;
}

@Injectable()
export class MqttConnector
  implements OnModuleDestroy
{
  private readonly logger =
    new Logger(MqttConnector.name);

  private client?: MqttClient;

  private currentHost?: string;
  private currentPort?: number;

  private readonly deviceByTopic =
    new Map<string, string>();

  private readonly configByDevice =
    new Map<string, MqttDeviceConfig>();

  private telemetryCallback?: (
    telemetry: TelemetryData,
  ) => void;

  private connectedCallback?: (
    deviceId: string,
  ) => void;

  private disconnectedCallback?: (
    deviceId: string,
  ) => void;

  connectDevice(
    config: MqttDeviceConfig,
  ): void {
    const previousConfig =
      this.configByDevice.get(
        config.deviceId,
      );

    const brokerChanged =
      this.currentHost !== undefined &&
      (
        this.currentHost !== config.host ||
        this.currentPort !== config.port
      );

    const topicChanged =
      previousConfig !== undefined &&
      previousConfig.topic !== config.topic;

    /*
     * Topic değişmişse eski mapping'i
     * ve subscription'ı temizle.
     */
    if (topicChanged && previousConfig) {
      this.deviceByTopic.delete(
        previousConfig.topic,
      );

      if (this.client?.connected) {
        this.client.unsubscribe(
          previousConfig.topic,
          error => {
            if (error) {
              this.logger.warn(
                `MQTT unsubscribe failed: ${previousConfig.topic}`,
              );
              return;
            }

            this.logger.log(
              `Unsubscribed: ${previousConfig.topic}`,
            );
          },
        );
      }
    }

    this.configByDevice.set(
      config.deviceId,
      config,
    );

    this.deviceByTopic.set(
      config.topic,
      config.deviceId,
    );

    /*
     * Broker host/port değişmişse
     * mevcut client artık kullanılamaz.
     */
    if (brokerChanged) {
      this.logger.log(
        `MQTT broker config changed: ` +
        `${this.currentHost}:${this.currentPort} -> ` +
        `${config.host}:${config.port}`,
      );

      this.reconnectBroker(
        config.host,
        config.port,
      );

      return;
    }

    /*
     * Henüz client yoksa broker'a bağlan.
     */
    if (!this.client) {
      this.createClient(
        config.host,
        config.port,
      );

      return;
    }

    /*
     * Aynı broker, sadece yeni/değişmiş topic.
     */
    if (topicChanged) {
      this.subscribe(
        config.topic,
      );
    }
  }

  onTelemetry(
    callback: (
      telemetry: TelemetryData,
    ) => void,
  ): void {
    this.telemetryCallback = callback;
  }

  onConnected(
    callback: (
      deviceId: string,
    ) => void,
  ): void {
    this.connectedCallback = callback;
  }

  onDisconnected(
    callback: (
      deviceId: string,
    ) => void,
  ): void {
    this.disconnectedCallback =
      callback;
  }

  private createClient(
    host: string,
    port: number,
  ): void {
    const brokerUrl =
      `mqtt://${host}:${port}`;

    this.currentHost = host;
    this.currentPort = port;

    this.logger.log(
      `Connecting to MQTT broker: ${brokerUrl}`,
    );

    const client = connect(
      brokerUrl,
      {
        reconnectPeriod: 3000,
        connectTimeout: 5000,
      },
    );

    this.client = client;

    client.on('connect', () => {
      /*
       * Eski client'tan geç gelen event'in
       * yeni client state'ini bozmasını önle.
       */
      if (this.client !== client) {
        return;
      }

      this.logger.log(
        `Connected to MQTT broker: ${brokerUrl}`,
      );

      for (
        const [
          topic,
          deviceId,
        ] of this.deviceByTopic
      ) {
        this.subscribe(topic);

        this.connectedCallback?.(
          deviceId,
        );
      }
    });

    client.on(
      'message',
      (
        topic: string,
        payload: Buffer,
      ) => {
        if (this.client !== client) {
          return;
        }

        this.handleMessage(
          topic,
          payload,
        );
      },
    );

    client.on('error', error => {
      if (this.client !== client) {
        return;
      }

      this.logger.error(
        `MQTT error: ${error.message}`,
      );
    });

    client.on('offline', () => {
      if (this.client !== client) {
        return;
      }

      this.logger.warn(
        'MQTT broker offline',
      );

      this.notifyDisconnected();
    });

    client.on('close', () => {
      if (this.client !== client) {
        return;
      }

      this.logger.warn(
        'MQTT connection closed',
      );

      this.notifyDisconnected();
    });
  }

  private reconnectBroker(
  host: string,
  port: number,
): void {
  const oldClient =
    this.client;

  /*
   * Config değiştiği için mevcut
   * MQTT cihazlarını geçici olarak
   * disconnected kabul ediyoruz.
   */
  this.notifyDisconnected();

  this.client = undefined;

  this.currentHost = undefined;
  this.currentPort = undefined;

  if (oldClient) {
    oldClient.end(true);
  }

  this.createClient(
    host,
    port,
  );
}
  private subscribe(
    topic: string,
  ): void {
    if (!this.client?.connected) {
      return;
    }

    this.client.subscribe(
      topic,
      error => {
        if (error) {
          this.logger.error(
            `Subscribe failed: ${topic}`,
          );

          return;
        }

        this.logger.log(
          `Subscribed: ${topic}`,
        );
      },
    );
  }

  private handleMessage(
    topic: string,
    payload: Buffer,
  ): void {
    try {
      const deviceId =
        this.deviceByTopic.get(
          topic,
        );

      if (!deviceId) {
        return;
      }

      const message =
        JSON.parse(
          payload.toString(),
        ) as MqttTelemetryMessage;

      const telemetry =
        MqttDecoder.decode(
          deviceId,
          message,
        );

      this.telemetryCallback?.(
        telemetry,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown MQTT message error';

      this.logger.error(
        `Invalid MQTT message: ${message}`,
      );
    }
  }

  private notifyDisconnected(): void {
    for (
      const deviceId
      of this.deviceByTopic.values()
    ) {
      this.disconnectedCallback?.(
        deviceId,
      );
    }
  }

  onModuleDestroy(): void {
    this.client?.end(true);
  }
}