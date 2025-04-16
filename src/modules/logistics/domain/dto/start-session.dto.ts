import { ApiProperty }                                             from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class StartSessionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  vehicleId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  driverId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  initialOdometer: number;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsNumber()
  initialLatitude?: number;

  @ApiProperty({required: false})
  @IsOptional()
  @IsNumber()
  initialLongitude?: number;
}
