import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { DeviceProtocol } from '../enums/device-protocol.enum.js';

import {
  Type,
} from 'class-transformer';

import {
  ValidateNested,
} from 'class-validator';

import {
  ModbusRegisterMapDto,
} from './modbus-register-map.dto.js';

export class CreateDeviceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(DeviceProtocol)
  protocol: DeviceProtocol;

  @IsString()
  @IsNotEmpty()
  host: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @IsOptional()
  @IsInt()
  unitId?: number;

  @IsOptional()
@ValidateNested()
@Type(
  () => ModbusRegisterMapDto,
)
registerMap?: ModbusRegisterMapDto;

  @IsOptional()
  @IsString()
  topic?: string;
}

//Burada bilinçli olarak kullanıcıdan şunları almıyoruz:
// connectionStatus
// lastDataAt

// Çünkü bunları client belirlememeli.
// Backend belirlemeli.
// Bu önemli bir tasarım kararı.