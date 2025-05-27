import { ApiProperty }                                          from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { MaintenanceStatus, MaintenanceType }                   from '../entities/maintenance-record.entity';
import { Transform }                                            from 'class-transformer';

export class QueryMaintenanceDto {
  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsEnum(MaintenanceType)
  type?: MaintenanceType;

  @ApiProperty({required: false})
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({required: false, default: 1})
  @Transform(({value}) => (value ? Number(value) : 1))
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiProperty({required: false, default: 10})
  @Transform(({value}) => (value ? Number(value) : 10))
  @IsNumber()
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({required: false, enum: [ 'ASC', 'DESC' ], default: 'DESC'})
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
