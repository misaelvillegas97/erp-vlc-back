import { ApiPropertyOptional }                                         from '@nestjs/swagger';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type }                                                        from 'class-transformer';
import { GasStationBrand }                                             from '../entities/fuel-record.entity';

/**
 * DTO for querying fuel records with filters
 */
export class QueryFuelRecordDto {
  @ApiPropertyOptional({description: 'Page number for pagination', default: 1})
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({description: 'Limit of records per page', default: 10})
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({description: 'Filter by vehicle ID', example: '123e4567-e89b-12d3-a456-426614174000'})
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({description: 'Filter by start date', example: '2023-01-01'})
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({description: 'Filter by end date', example: '2023-12-31'})
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter by gas station brand',
    enum: GasStationBrand,
    example: GasStationBrand.SHELL
  })
  @IsOptional()
  @IsEnum(GasStationBrand)
  gasStation?: GasStationBrand;

  @ApiPropertyOptional({description: 'Search term for notes field', example: 'maintenance'})
  @IsOptional()
  @IsString()
  search?: string;
}
