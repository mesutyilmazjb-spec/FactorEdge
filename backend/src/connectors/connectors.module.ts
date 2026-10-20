import { Module } from '@nestjs/common';
import { ModbusConnector } from './modbus/modbus.connector.js';
import { MqttConnector } from './mqtt/mqtt.connector.js';

@Module({
  providers: [ModbusConnector,MqttConnector],
  exports: [ModbusConnector,MqttConnector],
})
export class ConnectorsModule {}