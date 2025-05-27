import { ApiProperty }                                   from '@nestjs/swagger';
import { IsBooleanString, IsEnum, IsOptional, IsString } from 'class-validator';
import { VehicleStatus, VehicleType }                    from '../entities/vehicle.entity';
import { FuelTypeEnum }                                  from '@modules/logistics/fuel-management/domain/enums/fuel-type.enum';

export class QueryVehicleDto {
  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiProperty({required: false})
  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({required: false, default: 1})
  @IsOptional()
  page?: number = 1;

  @ApiProperty({required: false, default: 10})
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({required: false})
  @IsOptional()
  @IsEnum(FuelTypeEnum)
  fuelType?: FuelTypeEnum;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsBooleanString()
  available?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({required: false, enum: [ 'ASC', 'DESC' ], default: 'DESC'})
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
