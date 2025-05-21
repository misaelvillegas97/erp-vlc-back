import { ApiProperty, ApiPropertyOptional }                                                    from '@nestjs/swagger';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min } from 'class-validator';
import { Type }                                                                                from 'class-transformer';
import { GasStationBrand }                                                                     from '../entities/fuel-record.entity';
import { FuelTypeEnum }                                                                        from '@modules/logistics/fuel-management/domain/enums/fuel-type.enum';

/**
 * DTO for creating a new fuel record
 */
export class CreateFuelRecordDto {
  @ApiProperty({description: 'Vehicle ID', example: '123e4567-e89b-12d3-a456-426614174000'})
  @IsNotEmpty()
  @IsUUID()
  vehicleId: string;

  @ApiProperty({description: 'Date of fuel filling', example: '2023-10-15'})
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiProperty({description: 'Initial odometer reading (km)', example: 12500})
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  initialOdometer: number;

  @ApiProperty({description: 'Final odometer reading (km)', example: 13000})
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  finalOdometer: number;

  @ApiProperty({description: 'Amount of fuel in liters', example: 45.5})
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  liters: number;

  @ApiProperty({description: 'Total cost in local currency', example: 35000})
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  cost: number;

  @ApiPropertyOptional({
    description: 'Gas station brand',
    enum: GasStationBrand,
    example: GasStationBrand.SHELL
  })
  @IsOptional()
  @IsEnum(GasStationBrand)
  gasStation?: GasStationBrand;

  @ApiPropertyOptional({description: 'Type of fuel', enum: FuelTypeEnum})
  @IsEnum(FuelTypeEnum)
  fuelType?: FuelTypeEnum;

  @ApiPropertyOptional({description: 'Additional notes', example: 'Regular maintenance fill-up'})
  @IsOptional()
  @IsString()
  notes?: string;
}
