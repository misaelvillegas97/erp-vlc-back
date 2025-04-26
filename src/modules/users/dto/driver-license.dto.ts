import { ApiProperty }                                         from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DriverLicenseType }                                   from '../domain/entities/driver-license.entity';

export class DriverLicenseDto {
  @ApiProperty({enum: DriverLicenseType})
  @IsEnum(DriverLicenseType)
  @IsNotEmpty()
  licenseType: DriverLicenseType;

  @ApiProperty()
  @IsNotEmpty()
  @IsISO8601()
  licenseValidFrom: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsISO8601()
  licenseValidTo: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  restrictions?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  issuingAuthority?: string;
}
