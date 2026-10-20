export interface TelemetryData {
  deviceId: string;
  productionCount: number | string;
  motorTemperature: number;
  motorCurrent: number;
  scrapCount: number;
  status: number;
  timestamp: string;
}

export interface DeviceStatusEvent {
  deviceId: string;
  status:
    | 'connected'
    | 'disconnected'
    | 'connecting';
  timestamp: string;
}