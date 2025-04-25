import { ApiProperty }                                      from '@nestjs/swagger';
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type }                                             from 'class-transformer';
import { DriverLicenseType }                                from '../domain/entities/driver-license.entity';

export class DriverLicenseDto {
  @ApiProperty({enum: DriverLicenseType})
  @IsEnum(DriverLicenseType)
  @IsNotEmpty()
  licenseType: DriverLicenseType;

  @ApiProperty()
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  licenseValidFrom: Date;

  @ApiProperty()
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  licenseValidTo: Date;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  restrictions?: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsString()
  issuingAuthority?: string;
}
