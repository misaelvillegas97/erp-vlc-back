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

  // Initial location with latitude, longitude, accuracy, and timestamp
  @ApiProperty({
    type: 'object',
    properties: {
      latitude: {type: 'number'},
      longitude: {type: 'number'},
      accuracy: {type: 'number'},
      timestamp: {type: 'number'}
    }
  })
  @IsOptional()
  @IsNotEmpty()
  initialLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  };
}
