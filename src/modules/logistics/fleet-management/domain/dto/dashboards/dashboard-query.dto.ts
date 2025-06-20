import { ApiProperty }                                from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { VehicleType }                                from '../../entities/vehicle.entity';

export class DashboardQueryDto {
  @ApiProperty({
    description: 'Start date for filtering (format: YYYY-MM-DD)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiProperty({
    description: 'End date for filtering (format: YYYY-MM-DD)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiProperty({
    description: 'Vehicle type filter',
    enum: VehicleType,
    required: false,
  })
  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;

  @ApiProperty({
    description: 'Driver license type filter',
    required: false,
  })
  @IsString()
  @IsOptional()
  licenseType?: string;

  @ApiProperty({
    description: 'Vehicle ID filter',
    required: false,
  })
  @IsString()
  @IsOptional()
  vehicleId?: string;

  @ApiProperty({
    description: 'Driver ID filter',
    required: false,
  })
  @IsString()
  @IsOptional()
  driverId?: string;
}
