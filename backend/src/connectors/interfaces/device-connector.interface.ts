import { TelemetryData } from '../../telemetry/models/telemetry-data.model.js';

export interface DeviceConnector {
  connect(): Promise<void>;

  disconnect(): Promise<void>;

 onTelemetry(
    callback: (data: TelemetryData) => void,
  ): void;}

  //“Protocol-specific logic'i business logic'ten ayırmak istedim. Modbus polling tabanlı çalışırken MQTT event-driven çalışıyor. Connector katmanında bu farklılıkları izole edip ikisini ortak TelemetryData modeline normalize ettim. Böylece application ve UI hangi protokolden veri geldiğini bilmek zorunda kalmıyor. Yeni bir protokol eklediğimde mevcut telemetry business logic'ini değiştirmem gerekmiyor.”