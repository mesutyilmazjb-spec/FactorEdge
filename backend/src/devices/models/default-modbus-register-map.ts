import {
  ModbusRegisterMap,
} from './modbus-register-map.model.js';

export const DEFAULT_MODBUS_REGISTER_MAP:
  ModbusRegisterMap = {
    productionCount: {
      address: 30001,
      functionCode: 4,
      dataType: 'uint32',
      wordOrder: 'ABCD',
      scale: 1,
    },

    motorTemperature: {
      address: 30003,
      functionCode: 4,
      dataType: 'float32',
      wordOrder: 'CDAB',
      scale: 1,
    },

    motorCurrent: {
      address: 30010,
      functionCode: 4,
      dataType: 'int16',
      scale: 0.01,
    },

    scrapCount: {
      address: 30020,
      functionCode: 4,
      dataType: 'uint16',
      scale: 1,
    },

    status: {
      address: 40001,
      functionCode: 3,
      dataType: 'uint16',
      scale: 1,
    },
  };