import { ApiProperty }                                 from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { VehicleStatus, VehicleType }                  from '../entities/vehicle.entity';

export class UpdateVehicleDto {
  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsNumber()
  @Min(1900)
  year?: number;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  licensePlate?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  vin?: string;

  @ApiProperty({enum: VehicleStatus, required: false})
  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;

  @ApiProperty({enum: VehicleType, required: false})
  @IsEnum(VehicleType)
  @IsOptional()
  type?: VehicleType;

  @ApiProperty({required: false})
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentOdometer?: number;

  @ApiProperty({required: false})
  @IsOptional()
  lastMaintenanceDate?: Date;

  @ApiProperty({required: false})
  @IsOptional()
  nextMaintenanceDate?: Date;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  maintenanceNotes?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  fuelType?: string;

  @ApiProperty({required: false, type: [ String ]})
  @IsOptional()
  imageIds?: string[];
}
