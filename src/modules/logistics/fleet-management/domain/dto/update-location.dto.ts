import { ApiProperty }                                from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  longitude: number;

  @ApiProperty({required: false})
  @IsOptional()
  @IsNumber()
  altitude?: number;

  @ApiProperty({required: false})
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiProperty({required: false})
  @IsOptional()
  @IsNumber()
  heading?: number;

  @ApiProperty({required: false})
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  address?: string;
}
