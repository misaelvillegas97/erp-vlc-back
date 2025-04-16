import { ApiProperty }                  from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DriverLicenseType }            from '../entities/driver.entity';

export class QueryDriverDto {
  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiProperty({required: false, enum: DriverLicenseType})
  @IsOptional()
  @IsEnum(DriverLicenseType)
  licenseType?: DriverLicenseType;

  @ApiProperty({required: false, default: 1})
  @IsOptional()
  page?: number = 1;

  @ApiProperty({required: false, default: 10})
  @IsOptional()
  limit?: number = 10;
}
