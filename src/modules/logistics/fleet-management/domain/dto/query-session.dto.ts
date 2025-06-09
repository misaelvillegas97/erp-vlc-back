import { ApiProperty }                                                  from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { VehicleSessionStatus }                                         from '../entities/vehicle-session.entity';
import { Transform }                                                    from 'class-transformer';

export class QuerySessionDto {
  @ApiProperty({required: false})
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsUUID()
  driverId?: string;

  @ApiProperty({required: false, enum: VehicleSessionStatus})
  @IsOptional()
  @IsEnum(VehicleSessionStatus)
  status?: VehicleSessionStatus;

  @ApiProperty({required: false})
  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsDateString()
  startDateTo?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  search?: string;

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

  @ApiProperty({required: false, default: false})
  @IsOptional()
  includeDetails?: boolean = false;
}
