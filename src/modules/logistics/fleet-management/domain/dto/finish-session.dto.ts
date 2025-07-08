import { ApiProperty }                                              from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class FinishSessionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  finalOdometer: number;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  incidents?: string;

  @ApiProperty({required: false, type: [ String ]})
  @IsOptional()
  @IsArray()
  imageIds?: string[];

  @ApiProperty({required: false})
  @IsOptional()
  @IsNumber()
  finalLatitude?: number;

  @ApiProperty({required: false})
  @IsOptional()
  @IsNumber()
  finalLongitude?: number;

  driverId?: string; // Optional driver ID for filtering sessions by user
}
