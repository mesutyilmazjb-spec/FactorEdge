import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class ModbusRegisterConfigDto {
  @IsInt()
  address: number;

  @IsIn([3, 4])
  functionCode: 3 | 4;

  @IsIn([
    'uint16',
    'int16',
    'uint32',
    'float32',
  ])
  dataType:
    | 'uint16'
    | 'int16'
    | 'uint32'
    | 'float32';

  @IsOptional()
  @IsIn(['ABCD', 'CDAB'])
  wordOrder?: 'ABCD' | 'CDAB';

  @IsNumber()
  scale: number;
}