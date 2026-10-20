export interface ModbusRegisterConfig {
  address: number;
  functionCode: 3 | 4;
  dataType:
    | 'uint16'
    | 'int16'
    | 'uint32'
    | 'float32';
  wordOrder?: 'ABCD' | 'CDAB';
  scale: number;
}

export interface ModbusRegisterMap {
  productionCount: ModbusRegisterConfig;
  motorTemperature: ModbusRegisterConfig;
  motorCurrent: ModbusRegisterConfig;
  scrapCount: ModbusRegisterConfig;
  status: ModbusRegisterConfig;
}