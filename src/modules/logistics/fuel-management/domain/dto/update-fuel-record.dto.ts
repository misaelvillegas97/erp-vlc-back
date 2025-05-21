import { ApiPropertyOptional }                                                     from '@nestjs/swagger';
import { IsDate, IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min } from 'class-validator';
import { Type }                                                                    from 'class-transformer';
import { GasStationBrand }                                                         from '../entities/fuel-record.entity';
import { FuelTypeEnum }                                                            from '@modules/logistics/fuel-management/domain/enums/fuel-type.enum';

/**
 * DTO for updating an existing fuel record
 */
export class UpdateFuelRecordDto {
  @ApiPropertyOptional({description: 'Vehicle ID', example: '123e4567-e89b-12d3-a456-426614174000'})
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({description: 'Date of fuel filling', example: '2023-10-15'})
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  date?: Date;

  @ApiPropertyOptional({description: 'Initial odometer reading (km)', example: 12500})
  @IsOptional()
  @IsNumber()
  @Min(0)
  initialOdometer?: number;

  @ApiPropertyOptional({description: 'Final odometer reading (km)', example: 13000})
  @IsOptional()
  @IsNumber()
  @Min(0)
  finalOdometer?: number;

  @ApiPropertyOptional({description: 'Amount of fuel in liters', example: 45.5})
  @IsOptional()
  @IsNumber()
  @IsPositive()
  liters?: number;

  @ApiPropertyOptional({description: 'Total cost in local currency', example: 35000})
  @IsOptional()
  @IsNumber()
  @IsPositive()
  cost?: number;

  @ApiPropertyOptional({
    description: 'Gas station brand',
    enum: GasStationBrand,
    example: GasStationBrand.SHELL
  })
  @IsOptional()
  @IsEnum(GasStationBrand)
  gasStation?: GasStationBrand;

  @ApiPropertyOptional({description: 'Fuel type', enum: FuelTypeEnum, example: FuelTypeEnum.DIESEL})
  @IsEnum(FuelTypeEnum)
  fuelType?: FuelTypeEnum;

  @ApiPropertyOptional({description: 'Additional notes', example: 'Regular maintenance fill-up'})
  @IsOptional()
  @IsString()
  notes?: string;
}
