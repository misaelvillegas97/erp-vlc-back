import { ApiProperty }                                             from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { VehicleStatus, VehicleType }                              from '../entities/vehicle.entity';

export class CreateVehicleDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  brand: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  model: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(1900)
  year: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  licensePlate: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  vin?: string;

  @ApiProperty({enum: VehicleStatus, default: VehicleStatus.AVAILABLE})
  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;

  @ApiProperty({enum: VehicleType, default: VehicleType.SEDAN})
  @IsEnum(VehicleType)
  @IsOptional()
  type?: VehicleType;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  currentOdometer: number;

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
