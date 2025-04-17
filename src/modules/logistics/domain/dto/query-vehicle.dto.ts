import { ApiProperty }                          from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString }         from 'class-validator';
import { FuelType, VehicleStatus, VehicleType } from '../entities/vehicle.entity';

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
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  departmentId?: string;
}
