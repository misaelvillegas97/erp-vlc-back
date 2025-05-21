import { ApiProperty }                                                                            from '@nestjs/swagger';
import { IsDate, IsDecimal, IsEnum, IsNumber, IsOptional, IsString, IsUrl, IsUUID, MaxDate, Min } from 'class-validator';
import { Type }                                                                                   from 'class-transformer';
import { VehicleStatus, VehicleType }                                                             from '../entities/vehicle.entity';
import { FuelTypeEnum }                                                                           from '@modules/logistics/fuel-management/domain/enums/fuel-type.enum';

export class UpdateVehicleDto {
  @ApiProperty({required: false, description: 'Marca del vehículo'})
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({required: false, description: 'Modelo del vehículo'})
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({required: false, description: 'Año de fabricación'})
  @IsOptional()
  @IsNumber()
  @Min(1900)
  year?: number;

  @ApiProperty({required: false, description: 'Placa/Matrícula del vehículo'})
  @IsOptional()
  @IsString()
  licensePlate?: string;

  @ApiProperty({required: false, description: 'Número de identificación vehicular (VIN)'})
  @IsOptional()
  @IsString()
  vin?: string;

  @ApiProperty({
    required: false,
    enum: VehicleType,
    description: 'Tipo de vehículo'
  })
  @IsEnum(VehicleType)
  @IsOptional()
  type?: VehicleType;

  @ApiProperty({required: false, description: 'Color del vehículo'})
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({
    required: false,
    enum: FuelTypeEnum,
    description: 'Tipo de combustible'
  })
  @IsEnum(FuelTypeEnum)
  @IsOptional()
  fuelType?: FuelTypeEnum;

  @ApiProperty({
    required: false,
    description: 'Capacidad del tanque en litros',
    type: Number
  })
  @IsOptional()
  @IsDecimal({decimal_digits: '0,2'})
  tankCapacity?: number;

  @ApiProperty({required: false, description: 'Lectura actual del odómetro'})
  @IsOptional()
  @IsNumber()
  @Min(0)
  lastKnownOdometer?: number;

  @ApiProperty({
    required: false,
    enum: VehicleStatus,
    description: 'Estado actual del vehículo'
  })
  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;

  @ApiProperty({required: false, description: 'ID del departamento asignado'})
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty({required: false, description: 'Fecha del último mantenimiento'})
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  lastMaintenanceDate?: Date;

  @ApiProperty({required: false, description: 'Fecha programada para el próximo mantenimiento'})
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  nextMaintenanceDate?: Date;

  @ApiProperty({required: false, description: 'Kilometraje para el próximo mantenimiento'})
  @IsOptional()
  @IsNumber()
  @Min(0)
  nextMaintenanceKm?: number;

  @ApiProperty({required: false, description: 'Fecha de compra del vehículo'})
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @MaxDate(new Date())
  purchaseDate?: Date;

  @ApiProperty({required: false, description: 'Número de póliza de seguro'})
  @IsOptional()
  @IsString()
  insuranceNumber?: string;

  @ApiProperty({required: false, description: 'Fecha de vencimiento del seguro'})
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  insuranceExpiry?: Date;

  @ApiProperty({required: false, description: 'Fecha de vencimiento de la revisión técnica'})
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  technicalInspectionExpiry?: Date;

  @ApiProperty({required: false, description: 'Notas adicionales'})
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({required: false, description: 'URL de la foto principal'})
  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @ApiProperty({required: false, type: [ String ], description: 'URLs de fotos adicionales'})
  @IsOptional()
  additionalPhotoUrls?: string[];

  @ApiProperty({required: false, type: [ String ], description: 'IDs de imágenes a adjuntar'})
  @IsOptional()
  imageIds?: string[];
}
