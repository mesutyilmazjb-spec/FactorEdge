import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  Type,
} from 'class-transformer';

import {
  DeviceProtocol,
} from '../enums/device-protocol.enum.js';

import {
  ModbusRegisterMapDto,
} from './modbus-register-map.dto.js';

export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(DeviceProtocol)
  protocol?: DeviceProtocol;

  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsInt()
  unitId?: number;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ModbusRegisterMapDto)
  registerMap?: ModbusRegisterMapDto;
}