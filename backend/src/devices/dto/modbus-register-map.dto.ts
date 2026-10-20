import {
  Type,
} from 'class-transformer';

import {
  ValidateNested,
} from 'class-validator';

import {
  ModbusRegisterConfigDto,
} from './modbus-register-config.dto.js';

export class ModbusRegisterMapDto {
  @ValidateNested()
  @Type(
    () => ModbusRegisterConfigDto,
  )
  productionCount:
    ModbusRegisterConfigDto;

  @ValidateNested()
  @Type(
    () => ModbusRegisterConfigDto,
  )
  motorTemperature:
    ModbusRegisterConfigDto;

  @ValidateNested()
  @Type(
    () => ModbusRegisterConfigDto,
  )
  motorCurrent:
    ModbusRegisterConfigDto;

  @ValidateNested()
  @Type(
    () => ModbusRegisterConfigDto,
  )
  scrapCount:
    ModbusRegisterConfigDto;

  @ValidateNested()
  @Type(
    () => ModbusRegisterConfigDto,
  )
  status:
    ModbusRegisterConfigDto;
}